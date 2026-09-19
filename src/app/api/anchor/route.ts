import { NextRequest } from "next/server";
import { Asset, Horizon } from "@stellar/stellar-sdk";

import { AnchorClient, type SepLog } from "@/lib/anchor/client";
import {
  balanceOf,
  depositFromBank,
  ensureTrustline,
  fetchLimits,
  totalOut,
  withdrawToBank,
} from "@/lib/anchor/settle";
import { getBankAccount } from "@/lib/bank";
import { signerAddress } from "@/lib/auth/roles";
import { keypair } from "@/lib/server/actors";
import { clientKey, rateLimit, requireSession } from "@/lib/server/guard";
import { getInvoice } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The fiat rail, both directions.
 *
 *   off — supplier sells USDC, lira lands in the bank
 *   on  — buyer pays lira, USDC reaches the contract
 *
 * Returns the SEP trace so the interface can show the requests that ran.
 */
export async function POST(req: NextRequest) {
  const log: SepLog[] = [];
  try {
    rateLimit(clientKey(req, "anchor"), 20, 60_000);
    const session = await requireSession();
    const { flow, invoiceId } = (await req.json()) as {
      flow: "off" | "on" | "topup";
      invoiceId: number;
    };

    const anchor = await AnchorClient.create({ log: (e) => log.push(e) });
    const usdc = new Asset(anchor.config.assetCode, anchor.config.assetIssuer);
    const horizon = new Horizon.Server(
      process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    );
    const limits = await fetchLimits(anchor);

    // Buying USDC for the supplier through the same on-ramp the buyer uses.
    // A withdrawal drains the account by design, so without this the screen
    // works once and then refuses — and what it refuses to do is the thing the
    // reader came to see.
    if (flow === "topup") {
      const seller = keypair("seller");
      await ensureTrustline(horizon, seller, usdc);
      const jwt = await anchor.authenticate(seller);
      await anchor.ensureCustomer(jwt, seller.publicKey());
      const legs = await depositFromBank({
        anchor,
        signer: seller,
        jwt,
        account: seller.publicKey(),
        amountFiat: Math.min(limits.maxFiat, 2000),
        limits,
      });
      return ok({
        flow,
        log,
        legs,
        fiatIn: Math.min(limits.maxFiat, 2000).toFixed(2),
        usdcOut: totalOut(legs).toFixed(7),
      });
    }

    const invoice = await getInvoice(invoiceId);

    if (flow === "off") {
      const seller = keypair("seller");
      await ensureTrustline(horizon, seller, usdc);
      const available = await balanceOf(horizon, seller.publicKey(), usdc);
      if (available <= 0) {
        return fail(
          new Error(
            "The supplier's USDC balance is zero — a withdrawal moves the whole payout to the bank, so a previous run will have emptied it. Top up through the anchor, or fund an invoice to create a new payout.",
          ),
          409,
        );
      }
      const payout = Number(invoice.lockedPayoutUsdc) / 1e7;
      const amount = payout > 0 ? Math.min(available, payout) : available;

      const jwt = await anchor.authenticate(seller);
      await anchor.ensureCustomer(jwt, seller.publicKey());
      // The supplier's own account when they have registered one. Without it
      // the anchor pays its default, which is fine for a demo and wrong for
      // anyone who actually wants the money.
      const account = getBankAccount(signerAddress(session));
      const legs = await withdrawToBank({
        anchor,
        signer: seller,
        jwt,
        amountAsset: amount,
        horizon,
        limits,
        bank: account ? { iban: account.iban, holder: account.holder } : undefined,
      });
      return ok({
        flow,
        log,
        legs,
        usdcIn: amount.toFixed(7),
        fiatOut: totalOut(legs).toFixed(2),
        available: available.toFixed(7),
        iban: account?.iban,
      });
    }

    const buyer = keypair("buyer");
    await ensureTrustline(horizon, buyer, usdc);
    const face = Number(invoice.faceUsdc) / 1e7;
    const health = await anchor.health();
    const rate = Number(health?.rates?.buy_rate ?? 0) || 49;
    const fiat = Math.max(limits.minFiat, Math.ceil(face * rate * 1.03));

    const jwt = await anchor.authenticate(buyer);
    await anchor.ensureCustomer(jwt, buyer.publicKey());
    const legs = await depositFromBank({
      anchor, signer: buyer, jwt, account: buyer.publicKey(), amountFiat: fiat, limits,
    });
    return ok({
      flow,
      log,
      legs,
      fiatIn: fiat.toFixed(2),
      usdcOut: totalOut(legs).toFixed(7),
    });
  } catch (e) {
    return fail(e);
  }
}
