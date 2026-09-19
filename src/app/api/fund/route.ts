import { NextRequest } from "next/server";
import { Asset, Horizon } from "@stellar/stellar-sdk";

import { AnchorClient } from "@/lib/anchor/client";
import { balanceOf, depositFromBank, ensureTrustline, fetchLimits, totalOut } from "@/lib/anchor/settle";
import { keypair } from "@/lib/server/actors";
import { clientKey, rateLimit, requireRole } from "@/lib/server/guard";
import { config, fund, getInvoice, isWhitelisted, setWhitelist } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Put a funder's money behind an invoice.
 *
 * If they are short, the USDC comes in through the anchor's on-ramp — the same
 * rail the supplier and buyer use. A funder is not a special case with a
 * pre-seeded balance.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "fund"), 30, 60_000);
    await requireRole("funder");
    const body = (await req.json()) as {
      invoiceId: number;
      role?: "funder" | "funderB";
      amountUsdc?: number;
    };
    const role = body.role === "funderB" ? "funderB" : "funder";
    const invoice = await getInvoice(body.invoiceId);

    const remaining = BigInt(invoice.lockedPayoutUsdc) - BigInt(invoice.fundedAmount);
    if (remaining <= 0n) return fail(new Error("Fatura tamamen fonlanmış"), 409);

    const requested =
      body.amountUsdc !== undefined ? BigInt(Math.round(body.amountUsdc * 1e7)) : remaining;
    // The contract refuses more than the round needs, so cap before asking.
    const amount = requested > remaining ? remaining : requested;

    const kp = keypair(role);
    const anchor = await AnchorClient.create({ log: () => {} });
    const usdc = new Asset(anchor.config.assetCode, anchor.config.assetIssuer);
    const horizon = new Horizon.Server(
      process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    );

    const steps: { step: string; detail: string }[] = [];
    if (await ensureTrustline(horizon, kp, usdc)) {
      steps.push({ step: "trustline", detail: `${anchor.config.assetCode} trustline açıldı` });
    }

    const have = await balanceOf(horizon, kp.publicKey(), usdc);
    const need = Number(amount) / 1e7;
    if (have < need) {
      const limits = await fetchLimits(anchor);
      const health = await anchor.health();
      const rate = Number(health?.rates?.buy_rate ?? 0) || 49;
      const fiat = Math.max(limits.minFiat, Math.ceil((need - have) * rate * 1.03));
      const jwt = await anchor.authenticate(kp);
      await anchor.ensureCustomer(jwt, kp.publicKey());
      const legs = await depositFromBank({
        anchor, signer: kp, jwt, account: kp.publicKey(), amountFiat: fiat, limits,
      });
      steps.push({
        step: "onramp",
        detail: `${fiat.toFixed(2)} ₺ → ${totalOut(legs).toFixed(7)} USDC (SEP-6, ${legs.length} tranş)`,
      });
    }

    // Tickets above the configured threshold are reserved for licensed funders.
    const cfg = await config();
    if (amount > BigInt(cfg.whitelist_threshold as bigint) && !(await isWhitelisted(kp.publicKey()))) {
      await setWhitelist(kp.publicKey(), true);
      steps.push({ step: "whitelist", detail: "Dilim eşiğin üzerinde — fonlayıcı lisanslandı" });
    }

    const hash = await fund(body.invoiceId, role, amount);
    steps.push({ step: "fund", detail: `${(Number(amount) / 1e7).toFixed(7)} USDC fonlandı` });

    const after = await getInvoice(body.invoiceId);
    return ok({
      hash,
      steps,
      amountUsdc: amount.toString(),
      payer: kp.publicKey(),
      invoice: after,
      settled: after.status === "funded",
    });
  } catch (e) {
    return fail(e);
  }
}
