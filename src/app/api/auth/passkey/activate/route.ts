import { Asset, Horizon } from "@stellar/stellar-sdk";

import { keypairForCredential } from "@/lib/auth/passkey";
import { readSession } from "@/lib/auth/session";
import { ensureTrustline } from "@/lib/anchor/settle";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Bring a passkey account into existence on the network.
 *
 * A derived address is only an address. A Stellar account exists once someone
 * has funded it, so until then the explorer has nothing to show and the holder
 * can do nothing — which is a confusing place to leave someone who has just
 * signed in. On testnet friendbot does the funding; in production the first
 * deposit would, and this endpoint would not exist.
 *
 * The USDC trustline is opened in the same breath, because an account that
 * cannot hold the only asset the product moves is not much better than none.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "passkey-activate"), 5, 60_000);
    const session = await readSession();
    if (!session) return fail(new Error("Sign in to perform this action"), 401);
    if (session.method !== "passkey" || !session.credentialId) {
      return fail(new Error("This only applies to a passkey account"), 409);
    }

    const keypair = keypairForCredential(session.credentialId);
    if (keypair.publicKey() !== session.address) {
      return fail(new Error("The credential no longer derives this address"), 409);
    }

    const horizon = new Horizon.Server(
      process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    );

    let created = false;
    try {
      await horizon.loadAccount(keypair.publicKey());
    } catch {
      const res = await fetch(
        `https://friendbot.stellar.org/?addr=${encodeURIComponent(keypair.publicKey())}`,
      );
      if (!res.ok) {
        return fail(new Error(`Friendbot refused: HTTP ${res.status}`), 502);
      }
      created = true;
    }

    const usdc = new Asset(
      process.env.PUBLIC_ANCHOR_ASSET_CODE ?? "USDC",
      process.env.PUBLIC_USDC_ISSUER ?? "",
    );
    const trustline = usdc.getIssuer() ? await ensureTrustline(horizon, keypair, usdc) : false;

    const account = await horizon.loadAccount(keypair.publicKey());
    return ok({
      address: keypair.publicKey(),
      created,
      trustline,
      balances: account.balances.map((b) => ({
        asset: "asset_code" in b ? b.asset_code : "XLM",
        balance: b.balance,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
