import { NextRequest } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";

import { consumeChallenge } from "@/lib/auth/challenge";
import { readSession, writeSession } from "@/lib/auth/session";
import { verifyLoginSignature } from "@/lib/auth/verify";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Attach a browser wallet to an existing session.
 *
 * Someone who signed in with a passkey has an identity but no wallet; this lets
 * them prove one afterwards without starting over. The proof is the same
 * challenge and signature as signing in, so a wallet cannot be attached by
 * claiming an address.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "link-wallet"), 20, 60_000);
    const session = await readSession();
    if (!session) return fail(new Error("Sign in to perform this action"), 401);

    const body = (await req.json()) as {
      address?: string;
      nonce?: string;
      signature?: string;
      payload?: string;
      walletId?: string;
      walletName?: string;
    };
    if (!body.address || !body.nonce || !body.signature) {
      return fail(new Error("address, nonce and signature are required"), 422);
    }
    if (!StrKey.isValidEd25519PublicKey(body.address)) {
      return fail(new Error("A valid Stellar address is required"), 422);
    }

    const challenge = consumeChallenge(body.nonce);
    if (!challenge) return fail(new Error("The challenge is invalid or has expired"), 401);
    if (challenge.address !== body.address) {
      return fail(new Error("The challenge was issued for a different address"), 401);
    }

    const verified = verifyLoginSignature({
      address: body.address,
      expected: challenge.message,
      payload: body.payload,
      signature: Buffer.from(body.signature, "base64"),
    });
    if (!verified.ok) {
      return fail(
        new Error(`The signature did not verify. Formats tried: ${verified.tried.join(", ")}`),
        401,
      );
    }

    const next = {
      ...session,
      wallet: {
        address: body.address,
        walletId: body.walletId ?? "wallet",
        walletName: body.walletName ?? body.walletId ?? "wallet",
        linkedAt: Date.now(),
      },
    };
    await writeSession(next);
    return ok({ session: next });
  } catch (e) {
    return fail(e);
  }
}

/** Detach the linked wallet, leaving the session's own identity in place. */
export async function DELETE() {
  try {
    const session = await readSession();
    if (!session) return fail(new Error("Sign in to perform this action"), 401);
    const { wallet: _dropped, ...rest } = session;
    await writeSession(rest);
    return ok({ session: rest });
  } catch (e) {
    return fail(e);
  }
}
