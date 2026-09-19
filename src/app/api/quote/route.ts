import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireRole } from "@/lib/server/guard";
import { acceptQuote, getInvoice, quote, quoteLocked } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** The live price, recomputed from chain on every request. */
export async function GET(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "quote-read"), 60, 60_000);
    const id = Number(new URL(req.url).searchParams.get("invoiceId"));
    if (!id) return fail(new Error("invoiceId is required"), 422);
    // The lock decides whether funding will be accepted, so it travels with the
    // price rather than being discovered by a failed transaction.
    const [breakdown, locked] = await Promise.all([quote(id), quoteLocked(id).catch(() => null)]);
    return ok({ quote: breakdown, locked });
  } catch (e) {
    return fail(e);
  }
}

/** The seller accepts, fixing the discount so later oracle moves cannot change it. */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "quote-accept"), 30, 60_000);
    await requireRole("seller");
    const { invoiceId } = (await req.json()) as { invoiceId: number };
    const { quote: locked, hash } = await acceptQuote(invoiceId);
    return ok({ hash, quote: locked, invoice: await getInvoice(invoiceId) });
  } catch (e) {
    return fail(e);
  }
}
