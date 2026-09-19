import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * SEP-53 signed messages.
 *
 * Wallets do not sign arbitrary bytes: a signature over raw text could be
 * replayed as a transaction. SEP-53 prefixes the message and hashes it, so what
 * gets signed can only ever be a message.
 *
 * Found the hard way — Freighter returned signatures that matched none of the
 * three framings tried first, and the byte counts in the error showed it had
 * signed none of them. It implements this.
 */
export const SEP53_PREFIX = "Stellar Signed Message:\n";

export function sep53Digest(message: string | Buffer): Buffer {
  const bytes = typeof message === "string" ? Buffer.from(message, "utf8") : message;
  return createHash("sha256")
    .update(Buffer.concat([Buffer.from(SEP53_PREFIX, "utf8"), bytes]))
    .digest();
}

export function signSep53(secret: string, message: string | Buffer): Buffer {
  // `Keypair.sign` returns a byte array, not a Buffer; without this the base64
  // came out as the string "124,238,93,…".
  return Buffer.from(Keypair.fromSecret(secret).sign(sep53Digest(message)));
}

export function verifySep53(publicKey: string, message: string | Buffer, signature: Buffer): boolean {
  try {
    return Keypair.fromPublicKey(publicKey).verify(sep53Digest(message), signature);
  } catch {
    return false;
  }
}
