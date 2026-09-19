/**
 * Pinned to the specification's own vectors.
 *
 * Without these the implementation would only be self-consistent: it would
 * verify what it signed and still disagree with every wallet.
 */
import { Keypair } from "@stellar/stellar-sdk";

import { sep53Digest, signSep53, verifySep53 } from "@/lib/auth/sep53";

const G = "\x1b[32m", R = "\x1b[31m", B = "\x1b[1m", O = "\x1b[0m";
let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`   ${G}✓${O} ${name}`);
  else { failed++; console.log(`   ${R}✕${O} ${name}${detail ? ` — ${detail}` : ""}`); }
};

console.log(`${B}SEP-53 · imzalı mesaj${O}\n`);

// The three vectors published with the specification, verbatim. Without these
// the implementation would only be self-consistent: it would verify what it
// signed and still disagree with every wallet.
const SECRET = "SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW";
const ADDRESS = "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L";

const VECTORS: { label: string; message: string | Buffer; signature: string }[] = [
  {
    label: "ASCII",
    message: "Hello, World!",
    signature:
      "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==",
  },
  {
    label: "UTF-8",
    message: "こんにちは、世界！",
    signature:
      "CDU265Xs8y3OWbB/56H9jPgUss5G9A0qFuTqH2zs2YDgTm+++dIfmAEceFqB7bhfN3am59lCtDXrCtwH2k1GBA==",
  },
  {
    // Raw bytes, not text — the spec requires both to be accepted.
    label: "ikili",
    message: Buffer.from("2zZDP1sa1BVBfLP7TeeMk3sUbaxAkUhBhDiNdrksaFo=", "base64"),
    signature:
      "VA1+7hefNwv2NKScH6n+Sljj15kLAge+M2wE7fzFOf+L0MMbssA1mwfJZRyyrhBORQRle10X1Dxpx+UOI4EbDQ==",
  },
];

const kp = Keypair.fromSecret(SECRET);
check("tohumdan üretilen adres vektörle aynı", kp.publicKey() === ADDRESS, kp.publicKey());
console.log();

for (const { label, message, signature } of VECTORS) {
  const produced = signSep53(SECRET, message).toString("base64");
  check(`üretilen imza vektörle aynı · ${label}`, produced === signature, `${produced.slice(0, 24)}…`);
  check(
    `vektör doğrulanıyor · ${label}`,
    verifySep53(ADDRESS, message, Buffer.from(signature, "base64")),
  );
}
console.log();

// Framing is what makes this different from signing raw bytes.
const msg = "Payper girişi";
check(
  "önek olmadan imzalanan kabul edilmiyor",
  !verifySep53(kp.publicKey(), msg, Buffer.from(kp.sign(Buffer.from(msg, "utf8")))),
);
check(
  "başka mesajın imzası kabul edilmiyor",
  !verifySep53(kp.publicKey(), msg, signSep53(SECRET, "başka mesaj")),
);
check(
  "başka anahtarın imzası kabul edilmiyor",
  !verifySep53(Keypair.random().publicKey(), msg, signSep53(SECRET, msg)),
);
check("özet 32 bayt", sep53Digest(msg).length === 32);
check("aynı mesaj aynı özeti verir", sep53Digest(msg).equals(sep53Digest(msg)));
check("metin ve eşdeğer bayt dizisi aynı özeti verir",
  sep53Digest(msg).equals(sep53Digest(Buffer.from(msg, "utf8"))));

console.log(failed === 0 ? `\n${G}${B}✅ SEP-53 spesifikasyona uygun${O}`
                         : `\n${R}${B}❌ ${failed} kontrol düştü${O}`);
if (failed) process.exit(1);
