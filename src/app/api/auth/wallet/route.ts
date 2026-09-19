import { NextRequest } from "next/server";

import { consumeChallenge } from "@/lib/auth/challenge";
import type { SessionRole } from "@/lib/auth/roles";
import { writeSession } from "@/lib/auth/session";
import { verifyLoginSignature } from "@/lib/auth/verify";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** Sign in by proving control of a wallet, without moving anything. */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "wallet-login"), 20, 60_000);
    const body = (await req.json()) as {
      address?: string;
      nonce?: string;
      signature?: string;
      payload?: string;
      name?: string;
      role?: SessionRole;
      walletId?: string;
      walletName?: string;
    };

    if (!body.address || !body.nonce || !body.signature) {
      return fail(new Error("address, nonce ve signature gerekli"), 422);
    }
    const challenge = consumeChallenge(body.nonce);
    if (!challenge) return fail(new Error("Challenge geçersiz ya da süresi dolmuş"), 401);
    if (challenge.address !== body.address) {
      return fail(new Error("Challenge başka bir adres için verilmiş"), 401);
    }

    const result = verifyLoginSignature({
      address: body.address,
      expected: challenge.message,
      payload: body.payload,
      signature: Buffer.from(body.signature, "base64"),
    });
    if (!result.ok) {
      return fail(
        new Error(`İmza doğrulanamadı. Denenen biçimler: ${result.tried.join(", ")}`),
        422,
      );
    }

    const role = asRole(body.role);
    const session = {
      address: body.address,
      name: displayName(body.name),
      role,
      method: "wallet" as const,
      wallet: {
        address: body.address,
        walletId: body.walletId ?? "wallet",
        walletName: body.walletName ?? body.walletId ?? "Cüzdan",
        linkedAt: Date.now(),
      },
      issuedAt: Date.now(),
    };
    await writeSession(session);
    return ok({ session, reading: result.reading });
  } catch (e) {
    return fail(e);
  }
}

const asRole = (r: unknown): SessionRole =>
  r === "buyer" || r === "funder" ? r : "seller";

/** A display name, trimmed and bounded. Empty means "fall back to the role". */
function displayName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 48);
  return name.length >= 2 ? name : undefined;
}
