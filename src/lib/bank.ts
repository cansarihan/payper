/**
 * The supplier's bank account — where an off-ramp actually lands.
 *
 * IBANs are validated properly rather than by length: a mistyped digit in an
 * account number that only looked right is how money goes to a stranger. The
 * ISO 7064 mod-97 checksum catches single-character typos and most
 * transpositions, which is exactly what it was designed for.
 */

export interface BankAccount {
  /** IBAN, stored without spaces and upper-cased. */
  iban: string;
  /** Name on the account. A bank will reject a transfer whose name disagrees. */
  holder: string;
  /** Optional: which bank, for display. */
  bankName?: string;
  updatedAt: number;
}

export interface IbanCheck {
  valid: boolean
  /** Normalised form, when parseable. */
  iban?: string;
  /** Grouped in fours, for display. */
  pretty?: string;
  country?: string;
  /** Turkish IBANs carry a five-digit bank code. */
  bankCode?: string;
  error?: string;
}

/** IBAN lengths per country, for the ones this product is likely to see. */
const LENGTHS: Record<string, number> = {
  TR: 26,
  DE: 22,
  NL: 18,
  GB: 22,
  FR: 27,
  IT: 27,
  ES: 24,
  AT: 20,
  BE: 16,
  CH: 21,
};

export function checkIban(input: string): IbanCheck {
  const iban = input.replace(/[\s-]/g, "").toUpperCase();
  if (!iban) return { valid: false, error: "The IBAN is empty" };
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(iban)) {
    return { valid: false, error: "An IBAN starts with a two-letter country code" };
  }

  const country = iban.slice(0, 2);
  const expected = LENGTHS[country];
  if (expected && iban.length !== expected) {
    return {
      valid: false,
      error: `A ${country} IBAN is ${expected} characters; ${iban.length} were given`,
    };
  }
  if (!expected && (iban.length < 15 || iban.length > 34)) {
    return { valid: false, error: "That IBAN length is not valid" };
  }
  if (country === "TR" && !/^TR\d{24}$/.test(iban)) {
    return { valid: false, error: "A TR IBAN carries 24 digits after TR" };
  }

  if (mod97(iban) !== 1) {
    return {
      valid: false,
      error: "The IBAN check digits do not verify — a character is probably mistyped",
    };
  }

  return {
    valid: true,
    iban,
    pretty: iban.replace(/(.{4})/g, "$1 ").trim(),
    country,
    bankCode: country === "TR" ? iban.slice(4, 9) : undefined,
  };
}

/**
 * ISO 7064 mod-97-10, computed in chunks.
 *
 * An IBAN is far too long for Number, so the remainder is carried forward nine
 * digits at a time rather than reaching for BigInt.
 */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  let chunk = "";
  for (const ch of rearranged) {
    // Letters count as their position in the alphabet plus 9: A=10 … Z=35.
    chunk += /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    while (chunk.length >= 7) {
      remainder = Number(String(remainder) + chunk.slice(0, 7)) % 97;
      chunk = chunk.slice(7);
    }
  }
  return Number(String(remainder) + chunk) % 97;
}

/** Mask an IBAN for display: enough to recognise, not enough to copy. */
export const maskIban = (iban: string) =>
  iban.length > 10 ? `${iban.slice(0, 8)} •••• ${iban.slice(-4)}` : iban;

/**
 * Accounts, keyed by the Stellar address that owns them.
 *
 * On globalThis because Next bundles route handlers separately, so a
 * module-level map would give each route its own copy.
 */
const store: Map<string, BankAccount> = (globalThis.__payperBankAccounts ??= new Map());

declare global {
  // eslint-disable-next-line no-var
  var __payperBankAccounts: Map<string, BankAccount> | undefined;
}

export const getBankAccount = (address: string): BankAccount | null =>
  store.get(address) ?? null;

export function saveBankAccount(
  address: string,
  input: { iban: string; holder: string; bankName?: string },
): BankAccount {
  const check = checkIban(input.iban);
  if (!check.valid || !check.iban) throw new Error(check.error ?? "The IBAN is not valid");
  const holder = input.holder.trim();
  if (holder.length < 3) throw new Error("The account holder's name is required");

  const account: BankAccount = {
    iban: check.iban,
    holder,
    bankName: input.bankName?.trim() || TR_BANKS[check.bankCode ?? ""],
    updatedAt: Date.now(),
  };
  store.set(address, account);
  return account;
}

export const clearBankAccount = (address: string) => store.delete(address);

/** A few Turkish bank codes, so a valid IBAN can be shown with its bank. */
const TR_BANKS: Record<string, string> = {
  "00001": "T.C. Merkez Bankası",
  "00010": "Ziraat Bankası",
  "00012": "Halkbank",
  "00015": "VakıfBank",
  "00032": "TEB",
  "00046": "Akbank",
  "00062": "Garanti BBVA",
  "00064": "İş Bankası",
  "00067": "Yapı Kredi",
  "00099": "ING",
  "00111": "QNB Finansbank",
  "00123": "HSBC",
  "00134": "Denizbank",
  "00203": "Albaraka Türk",
  "00205": "Kuveyt Türk",
  "00206": "Türkiye Finans",
  "00209": "Enpara",
};
