import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireRole } from "@/lib/server/guard";
import { acknowledge, getInvoice } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** The buyer confirms the receivable. Funding opens only after this. */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "ack"), 30, 60_000);
    await requireRole("buyer");
    const { invoiceId } = (await req.json()) as { invoiceId: number };
    const hash = await acknowledge(invoiceId);
    return ok({ hash, invoice: await getInvoice(invoiceId) });
  } catch (e) {
    return fail(e);
  }
}
