import { createHash, randomUUID } from "node:crypto";

/**
 * Sample UBL-TR invoices: real structure, fake seal.
 *
 * The certificate and signature value would not verify against GİB. A genuinely
 * sealed invoice passes the same structural checks.
 */
export interface InvoiceSpec {
  key: "primary" | "secondary" | "duplicate";
  fileName: string;
  number: string;
  /** Shared with `primary` on purpose: this is the rejection demo. */
  ettn?: string;
  buyerName: string;
  buyerTaxId: string;
  amount: string;
  tenorDays: number;
  note: string;
}

export const SPECS: InvoiceSpec[] = [
  {
    key: "primary",
    fileName: "GIB2026000000481.xml",
    number: "GIB2026000000481",
    buyerName: "Marmara Otomotiv San. ve Tic. A.Ş.",
    buyerTaxId: "3250456789",
    amount: "2940.00",
    tenorDays: 90,
    note: "90-day term · the happy path",
  },
  {
    key: "secondary",
    fileName: "GIB2026000000512.xml",
    number: "GIB2026000000512",
    buyerName: "Trakya Enerji Dağıtım A.Ş.",
    buyerTaxId: "4410987654",
    amount: "1850.00",
    tenorDays: 60,
    note: "60-day term · a second buyer",
  },
  {
    key: "duplicate",
    fileName: "GIB2026000000481-KOPYA.xml",
    number: "GIB2026000000481",
    buyerName: "Marmara Otomotiv San. ve Tic. A.Ş.",
    buyerTaxId: "3250456789",
    amount: "2940.00",
    tenorDays: 90,
    // A different document with the same ETTN; an identical copy would leave it
    // ambiguous whether the ETTN or the document hash was caught.
    note: "Yeniden düzenlenmiştir — aynı ETTN · red testi",
  },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const b64 = (s: string) => Buffer.from(s).toString("base64");

/** Shared by the script and the API so the two cannot drift apart. */
export function buildInvoice(spec: InvoiceSpec, opts?: { ettn?: string; issuedAt?: Date }): {
  xml: string;
  ettn: string;
} {
  const ettn = opts?.ettn ?? spec.ettn ?? randomUUID();
  const issued = opts?.issuedAt ?? new Date();
  const due = new Date(issued.getTime() + spec.tenorDays * 86_400_000);

  const net = (Number(spec.amount) / 1.2).toFixed(2);
  const vat = (Number(spec.amount) - Number(net)).toFixed(2);
  const seal = b64(createHash("sha256").update(`${spec.number}:${ettn}`).digest("hex"));
  const digest = createHash("sha256").update(`${spec.number}:${issued.toISOString()}`).digest("base64");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="Signature_${spec.number}">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>${digest}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>${seal}</ds:SignatureValue>
          <ds:KeyInfo>
            <ds:X509Data>
              <ds:X509Certificate>${b64(`DEMO-MALI-MUHUR-${spec.number}`)}</ds:X509Certificate>
            </ds:X509Data>
          </ds:KeyInfo>
          <ds:Object>
            <xades:QualifyingProperties Target="#Signature_${spec.number}">
              <xades:SignedProperties Id="SignedProperties_${spec.number}">
                <xades:SignedSignatureProperties>
                  <xades:SigningTime>${issued.toISOString()}</xades:SigningTime>
                </xades:SignedSignatureProperties>
              </xades:SignedProperties>
            </xades:QualifyingProperties>
          </ds:Object>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
  <cbc:ID>${spec.number}</cbc:ID>
  <cbc:UUID>${ettn}</cbc:UUID>
  <cbc:IssueDate>${iso(issued)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:Note>${spec.note}</cbc:Note>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">1234567890</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>Anadolu Metal San. Tic. Ltd. Şti.</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:CitySubdivisionName>Nilüfer</cbc:CitySubdivisionName>
        <cbc:CityName>Bursa</cbc:CityName>
        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${spec.buyerTaxId}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${spec.buyerName}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>İstanbul</cbc:CityName>
        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>42</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${iso(due)}</cbc:PaymentDueDate>
    <cac:PayeeFinancialAccount><cbc:ID>TR330006100519786457841326</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${vat}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${net}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="TRY">${vat}</cbc:TaxAmount>
      <cbc:Percent>20</cbc:Percent>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${net}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${net}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${spec.amount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${spec.amount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${net}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>Metal işleme hizmeti</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="TRY">${net}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;
  return { xml, ettn };
}
