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
    await requireSession();
    const { flow, invoiceId } = (await req.json()) as { flow: "off" | "on"; invoiceId: number };

    const anchor = await AnchorClient.create({ log: (e) => log.push(e) });
    const usdc = new Asset(anchor.config.assetCode, anchor.config.assetIssuer);
    const horizon = new Horizon.Server(
      process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    );
    const limits = await fetchLimits(anchor);
    const invoice = await getInvoice(invoiceId);

    if (flow === "off") {
      const seller = keypair("seller");
      await ensureTrustline(horizon, seller, usdc);
      const available = await balanceOf(horizon, seller.publicKey(), usdc);
      if (available <= 0) {
        return fail(
          new Error(
            `The supplier holds no withdrawable USDC (${available.toFixed(7)}). Fund an invoice first.`,
          ),
          409,
        );
      }
      const payout = Number(invoice.lockedPayoutUsdc) / 1e7;
      const amount = payout > 0 ? Math.min(available, payout) : available;

      const jwt = await anchor.authenticate(seller);
      await anchor.ensureCustomer(jwt, seller.publicKey());
      const legs = await withdrawToBank({
        anchor, signer: seller, jwt, amountAsset: amount, horizon, limits,
      });
      return ok({
        flow,
        log,
        legs,
        usdcIn: amount.toFixed(7),
        fiatOut: totalOut(legs).toFixed(2),
        available: available.toFixed(7),
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
