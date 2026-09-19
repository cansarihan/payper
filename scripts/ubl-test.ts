/**
 * The document validator, including what it must refuse.
 */
import { randomUUID } from "node:crypto";

import { buildInvoice, SPECS } from "@/lib/ubl/generate";
import { parseUblInvoice, sha256Hex, toMinorUnits, UblParseError } from "@/lib/ubl/parse";

const G = "\x1b[32m", R = "\x1b[31m", B = "\x1b[1m", D = "\x1b[2m", O = "\x1b[0m";
let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`   ${G}✓${O} ${name}`);
  else { failed++; console.log(`   ${R}✕${O} ${name}${detail ? ` — ${detail}` : ""}`); }
};
const head = (s: string) => console.log(`\n${B}━━ ${s}${O}`);

console.log(`${B}UBL-TR doğrulayıcı${O}`);

head("Geçerli bir fatura okunuyor");
const spec = SPECS[0]!;
const { xml, ettn } = buildInvoice(spec);
const parsed = parseUblInvoice(xml);
check("ETTN çıkarıldı", parsed.ettn === ettn, parsed.ettn);
check("ETTN hash'i SHA-256", parsed.ettnHash === sha256Hex(ettn));
check("belge hash'i tam dosyanın", parsed.docHash === sha256Hex(Buffer.from(xml, "utf8")));
check("fatura numarası", parsed.invoiceNumber === spec.number);
check("tutar minor birimde", parsed.amountMinor === "294000", parsed.amountMinor);
check("para birimi TRY", parsed.currency === "TRY");
check("satıcı VKN", parsed.seller.taxId === "1234567890");
check("alıcı VKN", parsed.buyer.taxId === spec.buyerTaxId);
check("profil okundu", parsed.profileId === "TICARIFATURA");
console.log(`     ${D}vade ${parsed.dueDate} · düzenleme ${parsed.issueDate}${O}`);

head("Vade PaymentMeans'ten okunuyor");
check("cbc:DueDate olmadan da bulunur", !!parsed.dueDate && parsed.dueDate > parsed.issueDate);

head("XAdES yapısal kontrolü");
const sig = parsed.signature;
check("imza bloğu var", sig.present);
check("ds:SignedInfo", sig.hasSignedInfo);
check("ds:SignatureValue geçerli base64", sig.hasSignatureValue);
check("ds:X509Certificate", sig.hasCertificate);
check("xades:QualifyingProperties", sig.hasQualifyingProperties);
check("algoritma belirtilmiş", !!sig.method, sig.method ?? "");
check("yapısal olarak geçerli", sig.structurallyValid);
console.log(`     ${D}${sig.notes.join(" · ")}${O}`);

head("Bozuk belgeler reddediliyor");
const refuses = (name: string, mutate: (s: string) => string, field?: string) => {
  try {
    parseUblInvoice(mutate(xml));
    check(name, false, "kabul edildi");
  } catch (e) {
    const err = e as UblParseError;
    check(name, err instanceof UblParseError && (!field || err.field === field), err.message.slice(0, 50));
  }
};
refuses("ETTN yoksa", (s) => s.replace(/<cbc:UUID>.*?<\/cbc:UUID>/, ""), "ettn");
refuses("ETTN UUID değilse", (s) => s.replace(/<cbc:UUID>.*?<\/cbc:UUID>/, "<cbc:UUID>12345</cbc:UUID>"), "ettn");
refuses("fatura numarası yoksa", (s) => s.replace(/<cbc:ID>GIB\d+<\/cbc:ID>/, ""), "invoiceNumber");
refuses("tutar yoksa", (s) => s.replace(/<cbc:PayableAmount[^>]*>.*?<\/cbc:PayableAmount>/, ""), "amount");
refuses("vade düzenlemeden önceyse", (s) =>
  s.replace(/<cbc:PaymentDueDate>.*?<\/cbc:PaymentDueDate>/, "<cbc:PaymentDueDate>2000-01-01</cbc:PaymentDueDate>"), "dueDate");
refuses("kök Invoice yoksa", (s) => s.replace(/<Invoice[\s\S]*?>/, "<NotAnInvoice>").replace("</Invoice>", "</NotAnInvoice>"));
refuses("XML bozuksa", (s) => s.slice(0, s.length / 2));

head("İmzasız belge işaretleniyor");
const unsigned = parseUblInvoice(xml.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/, ""));
check("imza yokluğu yakalanıyor", !unsigned.signature.present && !unsigned.signature.structurallyValid);
check("belge yine de ayrıştırılıyor", unsigned.ettn === ettn);

head("Aynı ETTN iki dosyada");
const primary = buildInvoice(SPECS[0]!, { ettn: "3f2a9c1e-0000-4000-8000-000000000001" });
const copy = buildInvoice(SPECS[2]!, { ettn: "3f2a9c1e-0000-4000-8000-000000000001" });
check(
  "kopya aynı ETTN hash'ini üretiyor",
  parseUblInvoice(primary.xml).ettnHash === parseUblInvoice(copy.xml).ettnHash,
);
check(
  "ama farklı belge — yakalanan ETTN, hash değil",
  parseUblInvoice(primary.xml).docHash !== parseUblInvoice(copy.xml).docHash,
);

head("Minor birim dönüşümü");
check("2940.00 → 294000", toMinorUnits("2940.00") === "294000");
check("0.05 → 5", toMinorUnits("0.05") === "5", toMinorUnits("0.05"));
check("1234 → 123400", toMinorUnits("1234") === "123400");
check("virgüllü okunur", toMinorUnits("12,34") === "1234");
try { toMinorUnits("abc"); check("harf reddedilir", false); }
catch { check("harf reddedilir", true); }

console.log(failed === 0 ? `\n${G}${B}✅ UBL-TR doğrulayıcı: tüm kontroller geçti${O}`
                         : `\n${R}${B}❌ ${failed} kontrol düştü${O}`);
if (failed) process.exit(1);
