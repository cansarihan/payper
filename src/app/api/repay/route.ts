import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireRole } from "@/lib/server/guard";
import { getInvoice, repay } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Settle at maturity. The buyer must already hold the face value in USDC. */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "repay"), 20, 60_000);
    await requireRole("buyer");
    const { invoiceId } = (await req.json()) as { invoiceId: number };
    const hash = await repay(invoiceId);
    return ok({ hash, invoice: await getInvoice(invoiceId) });
  } catch (e) {
    return fail(e);
  }
}
