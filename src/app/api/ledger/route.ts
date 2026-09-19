import { rpc } from "@stellar/stellar-sdk";

import { sorobanEnv } from "@/lib/soroban/client";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** Latest ledger sequence, for the counter in the panel header. */
export async function GET() {
  try {
    const { rpcUrl } = sorobanEnv();
    const { sequence } = await new rpc.Server(rpcUrl, { allowHttp: true }).getLatestLedger();
    return ok({ sequence });
  } catch (e) {
    return fail(e, 502);
  }
}
