import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

/**
 * UBL-TR e-invoice verification.
 *
 * Turkish e-invoices are UBL-TR, a localised profile of OASIS UBL 2.1 — the
 * same standard the EU's EN 16931 and PEPPOL build on. Everything read here is
 * a standard UBL element, so the parser is not Turkey-specific: what is local
 * is the XAdES signature profile and treating `cbc:UUID` as the ETTN.
 */
export interface ParsedInvoice {
  ettn: string;
  ettnHash: string;
  docHash: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  amountMinor: string;
  seller: { taxId: string; name: string };
  buyer: { taxId: string; name: string };
  profileId: string | null;
  customizationId: string | null;
  signature: SignatureCheck;
}

export interface SignatureCheck {
  present: boolean;
  method: string | null;
  digestMethod: string | null;
  hasSignedInfo: boolean;
  hasSignatureValue: boolean;
  hasCertificate: boolean;
  hasQualifyingProperties: boolean;
  /** Structurally sound. Not a cryptographic verdict — see below. */
  structurallyValid: boolean;
  notes: string[];
}

export class UblParseError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "UblParseError";
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

export const sha256Hex = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

export const hexToBytes32 = (hex: string) => Buffer.from(hex, "hex");

/** Fiat amounts are stored as integer minor units; floats do not belong in money. */
export function toMinorUnits(amount: string, decimals = 2): string {
  const cleaned = amount.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new UblParseError(`Tutar okunamadı: "${amount}"`, "amount");
  }
  const [whole, frac = ""] = cleaned.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return `${whole}${padded}`.replace(/^(-?)0+(\d)/, "$1$2");
}

type Node = Record<string, unknown>;

/** UBL repeats elements freely, so anything can arrive as a list of one. */
const first = (v: unknown): Node | undefined => {
  const picked = Array.isArray(v) ? v[0] : v;
  return picked && typeof picked === "object" ? (picked as Node) : undefined;
};

const text = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"]).trim() || undefined;
  }
  return undefined;
};

export function parseUblInvoice(xml: string | Buffer): ParsedInvoice {
  const bytes = typeof xml === "string" ? Buffer.from(xml, "utf8") : xml;
  const raw = bytes.toString("utf8");

  let doc: Node;
  try {
    doc = parser.parse(raw) as Node;
  } catch (e) {
    throw new UblParseError(`XML ayrıştırılamadı: ${(e as Error).message}`);
  }

  const invoice = first(doc.Invoice ?? doc.invoice);
  if (!invoice) throw new UblParseError("Kök <Invoice> elemanı bulunamadı");

  const ettn = text(invoice.UUID);
  if (!ettn) throw new UblParseError("ETTN (cbc:UUID) bulunamadı", "ettn");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ettn)) {
    throw new UblParseError(`ETTN bir UUID olmalı: "${ettn}"`, "ettn");
  }

  const invoiceNumber = text(invoice.ID);
  if (!invoiceNumber) throw new UblParseError("Fatura numarası (cbc:ID) bulunamadı", "invoiceNumber");

  const issueDate = text(invoice.IssueDate);
  if (!issueDate) throw new UblParseError("Düzenleme tarihi (cbc:IssueDate) bulunamadı", "issueDate");

  // Integrators disagree about where the due date goes: some fill cbc:DueDate,
  // others only PaymentMeans/PaymentDueDate. Both are standard, so read both.
  const means = first(invoice.PaymentMeans);
  const dueDate = text(invoice.DueDate) ?? text(means?.PaymentDueDate);
  if (!dueDate) {
    throw new UblParseError("Vade tarihi bulunamadı (cbc:DueDate ya da PaymentMeans)", "dueDate");
  }
  if (Date.parse(dueDate) <= Date.parse(issueDate)) {
    throw new UblParseError("Vade tarihi düzenleme tarihinden sonra olmalı", "dueDate");
  }

  const currency = text(invoice.DocumentCurrencyCode) ?? "TRY";

  const totals = first(invoice.LegalMonetaryTotal);
  const payable = text(totals?.PayableAmount);
  if (!payable) {
    throw new UblParseError("Ödenecek tutar (cbc:PayableAmount) okunamadı", "amount");
  }

  const party = (node: unknown, role: string) => {
    const wrapper = first(node);
    const p = first(wrapper?.Party);
    const nameNode = first(p?.PartyName);
    const idNodes = p?.PartyIdentification;
    const ids = Array.isArray(idNodes) ? idNodes : idNodes ? [idNodes] : [];
    let taxId: string | undefined;
    for (const entry of ids as Node[]) {
      const value = text(entry.ID);
      const scheme = first(entry.ID)?.["@_schemeID"];
      if (value && (scheme === "VKN" || scheme === "TCKN" || !taxId)) taxId = value;
    }
    if (!taxId) throw new UblParseError(`${role} vergi kimlik numarası bulunamadı`, "taxId");
    return { taxId, name: text(nameNode?.Name) ?? role };
  };

  return {
    ettn,
    ettnHash: sha256Hex(ettn),
    // The whole document, so what was financed is pinned to exact bytes.
    docHash: sha256Hex(bytes),
    invoiceNumber,
    issueDate,
    dueDate,
    currency,
    amountMinor: toMinorUnits(payable),
    seller: party(invoice.AccountingSupplierParty, "Satıcı"),
    buyer: party(invoice.AccountingCustomerParty, "Alıcı"),
    profileId: text(invoice.ProfileID) ?? null,
    customizationId: text(invoice.CustomizationID) ?? null,
    signature: checkSignature(raw),
  };
}

/**
 * The XAdES block, checked for structure rather than cryptography.
 *
 * Read off the raw text on purpose: the parser strips namespace prefixes, so
 * `ds:SignatureValue` and `xades:QualifyingProperties` are indistinguishable
 * from any other element by the time it is done.
 *
 * What this does **not** do is verify the signature against GİB's certificate
 * chain. Getting access to those takes weeks and was out of scope. That is not
 * a shortcut so much as a deferred step: the full document hash goes on chain,
 * so a complete verification can be done later against a document proven not to
 * have changed.
 */
export function checkSignature(raw: string): SignatureCheck {
  const notes: string[] = [];
  const has = (re: RegExp) => re.test(raw);

  const present = has(/<(\w+:)?Signature[\s>]/);
  if (!present) {
    return {
      present: false,
      method: null,
      digestMethod: null,
      hasSignedInfo: false,
      hasSignatureValue: false,
      hasCertificate: false,
      hasQualifyingProperties: false,
      structurallyValid: false,
      notes: ["İmza bloğu yok"],
    };
  }

  const method = /SignatureMethod[^>]*Algorithm="([^"]+)"/.exec(raw)?.[1] ?? null;
  const digestMethod = /DigestMethod[^>]*Algorithm="([^"]+)"/.exec(raw)?.[1] ?? null;
  const hasSignedInfo = has(/<(\w+:)?SignedInfo[\s>]/);
  const hasQualifyingProperties = has(/<(\w+:)?QualifyingProperties[\s>]/);
  const hasCertificate = has(/<(\w+:)?X509Certificate[\s>]/);

  const sigValue = /<(\w+:)?SignatureValue[^>]*>([\s\S]*?)<\/(\w+:)?SignatureValue>/.exec(raw)?.[2];
  const cleaned = sigValue?.replace(/\s+/g, "") ?? "";
  const hasSignatureValue =
    cleaned.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(cleaned) && cleaned.length % 4 === 0;

  if (!hasSignedInfo) notes.push("ds:SignedInfo yok");
  if (!hasSignatureValue) notes.push("ds:SignatureValue geçerli base64 değil");
  if (!hasCertificate) notes.push("ds:X509Certificate yok");
  if (!hasQualifyingProperties) notes.push("xades:QualifyingProperties yok");
  if (!method) notes.push("SignatureMethod algoritması belirtilmemiş");

  const structurallyValid =
    hasSignedInfo && hasSignatureValue && hasCertificate && hasQualifyingProperties && !!method;

  if (structurallyValid) {
    notes.push("Yapısal kontrol geçti · GİB sertifika zinciri doğrulanmadı");
  }

  return {
    present,
    method,
    digestMethod,
    hasSignedInfo,
    hasSignatureValue,
    hasCertificate,
    hasQualifyingProperties,
    structurallyValid,
    notes,
  };
}
