import { NextRequest } from "next/server";

import { funders } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const id = Number(new URL(req.url).searchParams.get("invoiceId"));
    if (!id) return fail(new Error("invoiceId is required"), 422);
    return ok({ funders: await funders(id) });
  } catch (e) {
    return fail(e);
  }
}
