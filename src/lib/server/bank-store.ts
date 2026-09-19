import { persistentMap, type PersistentMap } from "@/lib/server/store";
import { checkIban, type BankAccount } from "@/lib/bank";

/**
 * The stored payout accounts.
 *
 * Split from the IBAN checks next door because those run in the browser as the
 * person types, and this reaches for the filesystem — one import of the wrong
 * half and the client bundle tries to include `node:fs`.
 */
/**
 * Accounts, keyed by the Stellar address that owns them.
 *
 * On globalThis because Next bundles route handlers separately, so a
 * module-level map would give each route its own copy — and on disk because a
 * payout destination that quietly reverts to the anchor's default after a
 * deploy is a failure nobody would notice until the money had gone.
 */
const store: PersistentMap<BankAccount> = (globalThis.__payperBankAccounts ??=
  persistentMap<BankAccount>("bank-accounts"));

declare global {
  // eslint-disable-next-line no-var
  var __payperBankAccounts: PersistentMap<BankAccount> | undefined;
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
