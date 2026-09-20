import { NextRequest } from "next/server";

import { clientKey, rateLimit, requireSession } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";
import { prepareInvoiceCall, type WalletAction } from "@/lib/server/wallet-tx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Build a call for the signed-in wallet to sign itself.
 *
 * The address that has to authorise the call is also the transaction source, so
 * the wallet's signature on the envelope is what satisfies `require_auth`. This
 * route never touches a key.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "tx-prepare"), 30, 60_000);
    const session = await requireSession();
    if (session.method !== "wallet" || !session.wallet) {
      throw new Error(
        "This route is for wallet sessions. Connect a wallet to sign your own transactions.",
      );
    }

    const body = (await req.json()) as {
      action?: WalletAction;
      invoiceId?: number;
      amountUsdc?: number;
    };
    if (!body.action || !body.invoiceId) throw new Error("action and invoiceId are required");

    return ok(
      await prepareInvoiceCall({
        action: body.action,
        invoiceId: body.invoiceId,
        signer: session.wallet.address,
        amountUsdc: body.amountUsdc,
      }),
    );
  } catch (e) {
    return fail(e);
  }
}
