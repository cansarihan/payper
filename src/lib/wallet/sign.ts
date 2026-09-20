/**
 * The wallet signing path, end to end.
 *
 * Three calls: the server prepares and simulates, the wallet signs, the server
 * submits. The server never sees a key and the wallet never sees anything it did
 * not display.
 */
import { signPreparedTransaction } from "./kit";

export type WalletAction = "trustline" | "acknowledge" | "accept_quote" | "fund";

/**
 * Network passphrases, by the name `/api/state` reports.
 *
 * Kept as literals rather than imported from the SDK: this module runs in the
 * browser and two constant strings are not worth the bundle.
 */
const PASSPHRASE: Record<string, string> = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!json.ok) throw new Error(json.error ?? "The call failed");
  return json;
}

/** Sign an envelope the server already prepared, for flows that build it elsewhere. */
export async function signPrepared(
  xdr: string,
  address: string,
  network: string,
): Promise<string> {
  const networkPassphrase = PASSPHRASE[network];
  if (!networkPassphrase) throw new Error(`Unknown network: ${network}`);
  return signPreparedTransaction(xdr, address, networkPassphrase);
}

export async function signAndSubmit(
  action: WalletAction,
  invoiceId: number,
  address: string,
  network: string,
  amountUsdc?: number,
): Promise<{ hash: string; summary: string }> {
  const networkPassphrase = PASSPHRASE[network];
  if (!networkPassphrase) throw new Error(`Unknown network: ${network}`);
  const prepared = await post<{ xdr: string; method: string; summary: string }>(
    "/api/tx/prepare",
    // A trustline belongs to the account, so no invoice is named.
    action === "trustline" ? { action } : { action, invoiceId, amountUsdc },
  );
  const signed = await signPreparedTransaction(prepared.xdr, address, networkPassphrase);
  const sent = await post<{ hash: string }>("/api/tx/submit", {
    signedXdr: signed,
    method: prepared.method,
  });
  return { hash: sent.hash, summary: prepared.summary };
}
