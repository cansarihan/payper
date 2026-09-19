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
