import { Keypair } from "@stellar/stellar-sdk";

import { sep53Digest } from "./sep53";

export type SignatureReading =
  | "sep53-payload"
  | "sep53-expected"
  | "raw-payload"
  | "raw-expected";

/**
 * Accept a wallet's signature without trusting the wallet's framing.
 *
 * Wallets disagree about what they sign. Freighter implements SEP-53 and hashes
 * a prefixed message; others sign the bytes as given. Rather than guess, try the
 * readings in order of likelihood and report which one matched.
 *
 * The payload the client claims to have signed is still checked against the
 * challenge we issued, so a wallet cannot be talked into signing different text
 * and have it accepted here.
 */
export function verifyLoginSignature(opts: {
  address: string;
  expected: string;
  payload?: string;
  signature: Buffer;
}): { ok: boolean; reading?: SignatureReading; tried: string[] } {
  const { address, expected, signature } = opts;

  let decoded: Buffer | null = null;
  if (opts.payload) {
    const asUtf8 = Buffer.from(opts.payload, "utf8");
    const asBase64 = Buffer.from(opts.payload, "base64");
    // A payload that decodes to the challenge was base64; otherwise take it as text.
    decoded = asBase64.toString("utf8") === expected ? asBase64 : asUtf8;
    if (decoded.toString("utf8") !== expected) {
      return {
        ok: false,
        tried: [`payload challenge'a çözülmedi (${decoded.length} bayt)`],
      };
    }
  }

  const candidates: [SignatureReading, Buffer][] = [
    ["sep53-payload", sep53Digest(decoded ?? expected)],
    ["sep53-expected", sep53Digest(expected)],
    ["raw-payload", decoded ?? Buffer.from(expected, "utf8")],
    ["raw-expected", Buffer.from(expected, "utf8")],
  ];

  const key = Keypair.fromPublicKey(address);
  const tried: string[] = [];
  for (const [reading, bytes] of candidates) {
    tried.push(`${reading} (${bytes.length} bayt)`);
    if (key.verify(bytes, signature)) return { ok: true, reading, tried };
  }
  return { ok: false, tried };
}
