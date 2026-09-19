import { activatePasskeyAccount } from "@/lib/auth/activate";
import { readSession } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Retry creating a passkey account.
 *
 * Signing in already starts this in the background; the endpoint exists for the
 * case where that attempt failed, so the wallet screen has something to offer
 * rather than a dead end.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "passkey-activate"), 5, 60_000);
    const session = await readSession();
    if (!session) return fail(new Error("Sign in to perform this action"), 401);
    if (session.method !== "passkey" || !session.credentialId) {
      return fail(new Error("This only applies to a passkey account"), 409);
    }

    const result = await activatePasskeyAccount(session.credentialId);
    if (result.address !== session.address) {
      return fail(new Error("The credential no longer derives this address"), 409);
    }
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
