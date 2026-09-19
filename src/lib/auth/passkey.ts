import { createHash, randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

import { persistentMap, type PersistentMap } from "@/lib/server/store";

/**
 * Passkey-backed wallets.
 *
 * A passkey proves *who* is asking. It cannot sign a Stellar transaction on its
 * own — WebAuthn signs over its own authenticator data with its own key type,
 * not over Soroban XDR. Bridging the two properly means a Soroban smart account
 * that verifies secp256r1 signatures on chain, which is on the roadmap.
 *
 * Until then: the passkey authenticates the person, and each credential is
 * bound to one Stellar keypair derived deterministically from the credential id
 * and a server secret. The same passkey always reaches the same address, no
 * seed phrase is ever shown, and nothing is stored that a user has to keep —
 * but the signing key lives on the server, and both the interface and the
 * README say so.
 */

export interface PasskeyRecord {
  credentialId: string;
  publicKey: string;
  counter: number;
  /** The Stellar address this credential controls. */
  address: string;
  label: string;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __payperPasskeys: PersistentMap<PasskeyRecord> | undefined;
  // eslint-disable-next-line no-var
  var __payperPasskeySecret: Buffer | undefined;
}

/**
 * On `globalThis` for the same reason the challenge store is: route handlers
 * are bundled separately and would otherwise each hold their own registry. On
 * disk as well, because a credential that disappears on deploy tells the person
 * who registered it yesterday that their passkey is unknown.
 */
const store: PersistentMap<PasskeyRecord> = (globalThis.__payperPasskeys ??=
  persistentMap<PasskeyRecord>("passkeys"));

/**
 * The relying party, as the browser sees it.
 *
 * WebAuthn binds a credential to a domain, and the RP ID has to match what is
 * in the address bar exactly. Behind a tunnel the application is reached on
 * 127.0.0.1, so the request's own host is `localhost` and a credential created
 * against it is rejected on the real domain. `PUBLIC_SITE_URL` is the truth
 * when it is set; the forwarded host is the next best thing.
 */
export function publicHost(headers: Headers, fallback: string): string {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).host;
    } catch {
      /* a malformed value should not take passkeys down with it */
    }
  }
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("host") ?? fallback;
}

export const relyingParty = (host: string) => {
  const local = host.startsWith("localhost") || host.startsWith("127.");
  return {
    rpID: host.split(":")[0],
    rpName: "payper",
    origin: `${local ? "http" : "https"}://${host}`,
  };
};

function walletSecret(): Buffer {
  const fromEnv = process.env.PASSKEY_WALLET_SECRET;
  if (fromEnv) return Buffer.from(fromEnv, "utf8");
  // Without a configured secret the derivation is stable for the life of the
  // process only, which is the right behaviour for a demo and the wrong one for
  // a deployment that expects the same passkey to reach the same address after
  // a restart.
  globalThis.__payperPasskeySecret ??= randomBytes(32);
  return globalThis.__payperPasskeySecret;
}

/** One credential, one address, derived rather than stored. */
export function keypairForCredential(credentialId: string): Keypair {
  const seed = createHash("sha256")
    .update(walletSecret())
    .update("payper:passkey:v1")
    .update(credentialId)
    .digest();
  return Keypair.fromRawEd25519Seed(seed);
}

export const rememberPasskey = (record: PasskeyRecord) => store.set(record.credentialId, record);
export const findPasskey = (credentialId: string) => store.get(credentialId) ?? null;
export const allPasskeys = () => store.values();
