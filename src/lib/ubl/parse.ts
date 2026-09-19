import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

/**
 * UBL-TR e-invoice verification.
 *
 * UBL-TR is a localised profile of OASIS UBL 2.1. Every element read here is
 * standard UBL; what is local is the XAdES profile and reading `cbc:UUID` as
 * the ETTN.
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

/** Fiat as integer minor units. */
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
  if (!invoice) throw new UblParseError("No root <Invoice> element");

  const ettn = text(invoice.UUID);
  if (!ettn) throw new UblParseError("ETTN (cbc:UUID) not found", "ettn");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ettn)) {
    throw new UblParseError(`ETTN bir UUID olmalı: "${ettn}"`, "ettn");
  }

  const invoiceNumber = text(invoice.ID);
  if (!invoiceNumber) throw new UblParseError("Invoice number (cbc:ID) not found", "invoiceNumber");

  const issueDate = text(invoice.IssueDate);
  if (!issueDate) throw new UblParseError("Issue date (cbc:IssueDate) not found", "issueDate");

  // Integrators fill either cbc:DueDate or PaymentMeans/PaymentDueDate.
  const means = first(invoice.PaymentMeans);
  const dueDate = text(invoice.DueDate) ?? text(means?.PaymentDueDate);
  if (!dueDate) {
    throw new UblParseError("No due date (cbc:DueDate or PaymentMeans)", "dueDate");
  }
  if (Date.parse(dueDate) <= Date.parse(issueDate)) {
    throw new UblParseError("The due date must fall after the issue date", "dueDate");
  }

  const currency = text(invoice.DocumentCurrencyCode) ?? "TRY";

  const totals = first(invoice.LegalMonetaryTotal);
  const payable = text(totals?.PayableAmount);
  if (!payable) {
    throw new UblParseError("Payable amount (cbc:PayableAmount) could not be read", "amount");
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
    if (!taxId) throw new UblParseError(`${role} tax identifier not found`, "taxId");
    return { taxId, name: text(nameNode?.Name) ?? role };
  };

  return {
    ettn,
    ettnHash: sha256Hex(ettn),
    // Pins the financed bytes.
    docHash: sha256Hex(bytes),
    invoiceNumber,
    issueDate,
    dueDate,
    currency,
    amountMinor: toMinorUnits(payable),
    seller: party(invoice.AccountingSupplierParty, "Supplier"),
    buyer: party(invoice.AccountingCustomerParty, "Buyer"),
    profileId: text(invoice.ProfileID) ?? null,
    customizationId: text(invoice.CustomizationID) ?? null,
    signature: checkSignature(raw),
  };
}

/**
 * Structural check of the XAdES block. Does **not** verify against GİB's
 * certificate chain.
 *
 * Read from the raw text because the parser strips namespace prefixes. The full
 * document hash goes on chain, so signature verification can be completed later
 * against a document proven unchanged.
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
      notes: ["No signature block"],
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

  if (!hasSignedInfo) notes.push("ds:SignedInfo missing");
  if (!hasSignatureValue) notes.push("ds:SignatureValue is not valid base64");
  if (!hasCertificate) notes.push("ds:X509Certificate missing");
  if (!hasQualifyingProperties) notes.push("xades:QualifyingProperties missing");
  if (!method) notes.push("No SignatureMethod algorithm is declared");

  const structurallyValid =
    hasSignedInfo && hasSignatureValue && hasCertificate && hasQualifyingProperties && !!method;

  if (structurallyValid) {
    notes.push("Structural check passed · the tax authority certificate chain was not verified");
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
