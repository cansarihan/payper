import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireSession } from "@/lib/server/guard";
import { submitSigned } from "@/lib/soroban/client";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Submit an envelope the caller's wallet signed. */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "tx-submit"), 30, 60_000);
    await requireSession();
    const body = (await req.json()) as { signedXdr?: string; method?: string };
    if (!body.signedXdr) throw new Error("signedXdr is required");

    const { hash } = await submitSigned(body.signedXdr, body.method ?? "call");
    return ok({ hash });
  } catch (e) {
    return fail(e);
  }
}
