/**
 * The login path, from the attacker's side.
 *
 * A signature check that only ever sees valid input proves nothing, so every
 * case here is something that must be refused.
 */
import { Keypair } from "@stellar/stellar-sdk";

import { consumeChallenge, issueChallenge } from "@/lib/auth/challenge";
import { parseSession, serializeSession } from "@/lib/auth/session";
import { signSep53 } from "@/lib/auth/sep53";
import { verifyLoginSignature } from "@/lib/auth/verify";

const G = "\x1b[32m", R = "\x1b[31m", B = "\x1b[1m", D = "\x1b[2m", O = "\x1b[0m";
let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`   ${G}✓${O} ${name}`);
  else { failed++; console.log(`   ${R}✕${O} ${name}${detail ? ` — ${detail}` : ""}`); }
};
const head = (s: string) => console.log(`\n${B}━━ ${s}${O}`);

console.log(`${B}Kimlik doğrulama${O}`);
const kp = Keypair.random();
const other = Keypair.random();

head("Cüzdanların farklı çerçeveleme biçimleri");
{
  const c = issueChallenge(kp.publicKey());
  // Freighter's behaviour: SEP-53 framing over the message.
  const sep53 = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: c.message,
    signature: signSep53(kp.secret(), c.message),
  });
  check("SEP-53 imzası kabul ediliyor", sep53.ok, sep53.tried.join(" · "));
  console.log(`     ${D}eşleşen biçim: ${sep53.reading}${O}`);
}
{
  const c = issueChallenge(kp.publicKey());
  // A wallet that signs the bytes as given.
  const raw = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: c.message,
    signature: Buffer.from(kp.sign(Buffer.from(c.message, "utf8"))),
  });
  check("ham imza da kabul ediliyor", raw.ok);
  console.log(`     ${D}eşleşen biçim: ${raw.reading}${O}`);
}
{
  const c = issueChallenge(kp.publicKey());
  // A wallet that hands the payload back base64-encoded.
  const b64 = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: Buffer.from(c.message, "utf8").toString("base64"),
    signature: signSep53(kp.secret(), c.message),
  });
  check("base64 payload çözülüyor", b64.ok);
}
{
  const c = issueChallenge(kp.publicKey());
  // No payload reported at all: fall back to the challenge we issued.
  const none = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    signature: signSep53(kp.secret(), c.message),
  });
  check("payload bildirilmese de doğrulanıyor", none.ok);
}

head("Reddedilmesi gerekenler");
{
  const c = issueChallenge(kp.publicKey());
  const wrongKey = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: c.message,
    signature: signSep53(other.secret(), c.message),
  });
  check("başka anahtarın imzası reddediliyor", !wrongKey.ok);
}
{
  const c = issueChallenge(kp.publicKey());
  // The attack the payload check exists for: sign something else, claim it was
  // the challenge.
  const forged = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: "Payper: tüm bakiyeyi transfer et",
    signature: signSep53(kp.secret(), "Payper: tüm bakiyeyi transfer et"),
  });
  check("sahte metin reddediliyor", !forged.ok, forged.tried.join(" · "));
}
{
  const c = issueChallenge(kp.publicKey());
  const garbage = verifyLoginSignature({
    address: kp.publicKey(),
    expected: c.message,
    payload: c.message,
    signature: Buffer.alloc(64),
  });
  check("boş imza reddediliyor", !garbage.ok);
}

head("Challenge tek kullanımlık");
{
  const c = issueChallenge(kp.publicKey());
  check("ilk tüketim çalışıyor", consumeChallenge(c.nonce)?.nonce === c.nonce);
  check("ikinci tüketim boş dönüyor (replay)", consumeChallenge(c.nonce) === null);
  check("bilinmeyen nonce boş dönüyor", consumeChallenge("deadbeef") === null);
}

head("Oturum çerezi kurcalanamıyor");
{
  const session = {
    address: kp.publicKey(),
    name: "Anadolu Metal",
    role: "seller" as const,
    method: "wallet" as const,
    issuedAt: Date.now(),
  };
  const token = serializeSession(session);
  check("kendi çerezimiz okunuyor", parseSession(token)?.address === kp.publicKey());
  check("ad korunuyor", parseSession(token)?.name === "Anadolu Metal");

  const [payload] = token.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify({ ...session, role: "funder" }),
    "utf8",
  ).toString("base64url");
  check("yük değiştirilirse reddediliyor", parseSession(`${forgedPayload}.${token.split(".")[1]}`) === null);
  check("imza değiştirilirse reddediliyor", parseSession(`${payload}.deadbeef`) === null);
  check("biçimsiz çerez reddediliyor", parseSession("bozuk") === null);
  check("boş çerez reddediliyor", parseSession(undefined) === null);

  const stale = serializeSession({ ...session, issuedAt: Date.now() - 13 * 60 * 60 * 1000 });
  check("süresi geçmiş oturum reddediliyor", parseSession(stale) === null);
}

console.log(failed === 0 ? `\n${G}${B}✅ Kimlik doğrulama akışları çalışıyor${O}`
                         : `\n${R}${B}❌ ${failed} kontrol düştü${O}`);
if (failed) process.exit(1);
