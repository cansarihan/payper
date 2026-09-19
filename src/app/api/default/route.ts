import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireOperator } from "@/lib/server/guard";
import { getInvoice, markDefault, treasurySnapshot } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Declare a default — the path that runs instead of repayment.
 *
 * The contract refuses until the due date plus the grace period has passed, and
 * only the admin may call it. What comes back is the split: what the first-loss
 * buffer absorbed on the funders' behalf, and what is still claimed from the
 * supplier under recourse.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "default"), 10, 60_000);
    requireOperator(req);
    const { invoiceId } = (await req.json()) as { invoiceId: number };
    const { hash, outcome } = await markDefault(invoiceId);
    return ok({
      hash,
      outcome,
      invoice: await getInvoice(invoiceId),
      treasury: await treasurySnapshot(),
    });
  } catch (e) {
    return fail(e);
  }
}
