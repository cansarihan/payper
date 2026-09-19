import { Asset, Horizon } from "@stellar/stellar-sdk";

import { ensureTrustline } from "@/lib/anchor/settle";
import { keypairForCredential } from "@/lib/auth/passkey";

/**
 * Bring a passkey account into existence on the network.
 *
 * A derived address is only an address: a Stellar account exists once someone
 * has funded it. Leaving that to the person who just signed in with Face ID
 * would undo the whole point, so this runs for them — on registration, and on
 * any login that finds the account still missing.
 *
 * On testnet friendbot does the funding. In production the first deposit would,
 * and this would not exist.
 */
export async function activatePasskeyAccount(credentialId: string): Promise<{
  address: string;
  created: boolean;
  trustline: boolean;
}> {
  const keypair = keypairForCredential(credentialId);
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
    if (!res.ok) throw new Error(`Friendbot refused: HTTP ${res.status}`);
    created = true;
  }

  // An account that cannot hold the only asset the product moves is not much
  // better than no account, so the trustline goes up in the same breath.
  const issuer = process.env.PUBLIC_USDC_ISSUER;
  const trustline = issuer
    ? await ensureTrustline(
        horizon,
        keypair,
        new Asset(process.env.PUBLIC_ANCHOR_ASSET_CODE ?? "USDC", issuer),
      )
    : false;

  return { address: keypair.publicKey(), created, trustline };
}
