import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * SEP-53 signed messages: sign SHA-256 of a prefixed message, so a signature
 * can never be replayed as a transaction. Implemented by Freighter.
 */
export const SEP53_PREFIX = "Stellar Signed Message:\n";

export function sep53Digest(message: string | Buffer): Buffer {
  const bytes = typeof message === "string" ? Buffer.from(message, "utf8") : message;
  return createHash("sha256")
    .update(Buffer.concat([Buffer.from(SEP53_PREFIX, "utf8"), bytes]))
    .digest();
}

export function signSep53(secret: string, message: string | Buffer): Buffer {
  // `Keypair.sign` returns a byte array, not a Buffer.
  return Buffer.from(Keypair.fromSecret(secret).sign(sep53Digest(message)));
}

export function verifySep53(publicKey: string, message: string | Buffer, signature: Buffer): boolean {
  try {
    return Keypair.fromPublicKey(publicKey).verify(sep53Digest(message), signature);
  } catch {
    return false;
  }
}
