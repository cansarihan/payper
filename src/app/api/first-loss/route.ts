import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireOperator } from "@/lib/server/guard";
import { depositFirstLoss, treasurySnapshot } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Top up the first-loss buffer with platform capital.
 *
 * `amountUsdc` is in whole USDC; the contract stores minor units. The buffer is
 * what makes the recourse waterfall mean anything — an empty buffer passes the
 * entire shortfall to the supplier.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "first-loss"), 10, 60_000);
    requireOperator(req);
    const { amountUsdc } = (await req.json()) as { amountUsdc: number };
    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      throw new Error("A positive USDC amount is required");
    }
    const hash = await depositFirstLoss(BigInt(Math.round(amountUsdc * 1e7)));
    return ok({ hash, treasury: await treasurySnapshot() });
  } catch (e) {
    return fail(e);
  }
}
