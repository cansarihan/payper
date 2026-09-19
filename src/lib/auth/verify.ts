import { Keypair } from "@stellar/stellar-sdk";

import { sep53Digest } from "./sep53";

export type SignatureReading =
  | "sep53-payload"
  | "sep53-expected"
  | "raw-payload"
  | "raw-expected";

/**
 * Verify a login signature across the framings wallets use.
 *
 * The claimed payload must still decode to the issued challenge, so text signed
 * under a different prompt is refused.
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
    // base64 if it decodes to the challenge, else plain text.
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
