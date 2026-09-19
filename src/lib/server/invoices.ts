import {
  addr,
  bytes32,
  i128,
  invoke,
  read,
  sym,
  u32,
  u64,
  bool,
} from "@/lib/soroban/client";
import { keypair, type Actor } from "./actors";

const CONTRACT = () => {
  const id = process.env.PUBLIC_INVOICE_CONTRACT_ID;
  if (!id) throw new Error("PUBLIC_INVOICE_CONTRACT_ID tanımlı değil — ./scripts/deploy.sh çalıştır");
  return id;
};

export type InvoiceStatus = "registered" | "acknowledged" | "funded" | "repaid" | "defaulted";

const STATUS: Record<number, InvoiceStatus> = {
  0: "registered",
  1: "acknowledged",
  2: "funded",
  3: "repaid",
  4: "defaulted",
};

export type Provenance = "live" | "fallback" | "param";
const PROVENANCE: Record<number, Provenance> = { 0: "live", 1: "fallback", 2: "param" };

export interface InvoiceView {
  id: number;
  seller: string;
  buyer: string;
  ettnHash: string;
  docHash: string;
  sellerTaxId: string;
  buyerTaxId: string;
  amountFiat: string;
  faceUsdc: string;
  dueDate: number;
  status: InvoiceStatus;
  fundedAmount: string;
  lockedDiscountBps: number;
  lockedPayoutUsdc: string;
  createdAt: number;
}

/** A quote with its bigints flattened, because JSON cannot carry them. */
export interface QuoteView {
  invoiceId: number;
  days: number;
  yieldBps: number;
  yieldSource: Provenance;
  fxRiskBps: number;
  fxSource: Provenance;
  creditPremiumBps: number;
  platformFeeBps: number;
  totalDiscountBps: number;
  payoutFiat: string;
  payoutUsdc: string;
  apyBps: number;
  fxDriftBps: number;
  fxRangeBps: number;
  fxWindowDays: number;
}

export interface FunderView {
  funder: string;
  amount: string;
  at: number;
}

const decodeInvoice = (raw: Record<string, unknown>): InvoiceView => ({
  id: Number(raw.id),
  seller: String(raw.seller),
  buyer: String(raw.buyer),
  ettnHash: Buffer.from(raw.ettn_hash as Uint8Array).toString("hex"),
  docHash: Buffer.from(raw.doc_hash as Uint8Array).toString("hex"),
  sellerTaxId: String(raw.seller_tax_id),
  buyerTaxId: String(raw.buyer_tax_id),
  amountFiat: String(raw.amount_fiat),
  faceUsdc: String(raw.face_usdc),
  dueDate: Number(raw.due_date),
  status: STATUS[Number(raw.status)] ?? "registered",
  fundedAmount: String(raw.funded_amount),
  lockedDiscountBps: Number(raw.locked_discount_bps),
  lockedPayoutUsdc: String(raw.locked_payout_usdc),
  createdAt: Number(raw.created_at),
});

const decodeQuote = (raw: Record<string, unknown>): QuoteView => ({
  invoiceId: Number(raw.invoice_id),
  days: Number(raw.days),
  yieldBps: Number(raw.yield_bps),
  yieldSource: PROVENANCE[Number(raw.yield_source)] ?? "param",
  fxRiskBps: Number(raw.fx_risk_bps),
  fxSource: PROVENANCE[Number(raw.fx_source)] ?? "param",
  creditPremiumBps: Number(raw.credit_premium_bps),
  platformFeeBps: Number(raw.platform_fee_bps),
  totalDiscountBps: Number(raw.total_discount_bps),
  payoutFiat: String(raw.payout_fiat),
  payoutUsdc: String(raw.payout_usdc),
  apyBps: Number(raw.apy_bps),
  fxDriftBps: Number(raw.fx_drift_bps),
  fxRangeBps: Number(raw.fx_range_bps),
  fxWindowDays: Number(raw.fx_window_days),
});

// ── reads ───────────────────────────────────────────────────────────────────

export const invoiceCount = () => read<number>(CONTRACT(), "invoice_count", []);

export async function getInvoice(id: number): Promise<InvoiceView> {
  return decodeInvoice(await read<Record<string, unknown>>(CONTRACT(), "get_invoice", [u32(id)]));
}

/**
 * The whole book, newest first.
 *
 * A sequential scan: ids are dense, so this reads each one. Fine for a demo
 * ledger and the wrong shape for a real one, where an indexer would serve it.
 */
export async function listInvoices(): Promise<InvoiceView[]> {
  const count = await invoiceCount();
  const ids = Array.from({ length: count }, (_, i) => count - i);
  const rows = await Promise.all(ids.map((id) => getInvoice(id).catch(() => null)));
  return rows.filter((r): r is InvoiceView => r !== null);
}

export async function quote(id: number): Promise<QuoteView> {
  return decodeQuote(await read<Record<string, unknown>>(CONTRACT(), "quote", [u32(id)]));
}

export const quoteLocked = (id: number) =>
  read<boolean>(CONTRACT(), "quote_locked", [u32(id)]);

export const isEttnAvailable = (hashHex: string) =>
  read<boolean>(CONTRACT(), "is_ettn_available", [bytes32(Buffer.from(hashHex, "hex"))]);

export const invoiceByEttn = (hashHex: string) =>
  read<number | null>(CONTRACT(), "invoice_by_ettn", [bytes32(Buffer.from(hashHex, "hex"))]);

export async function funders(id: number): Promise<FunderView[]> {
  const rows = await read<{ funder: string; amount: bigint; at: bigint }[]>(
    CONTRACT(),
    "funders_of",
    [u32(id)],
  );
  return rows.map((f) => ({ funder: String(f.funder), amount: String(f.amount), at: Number(f.at) }));
}

export async function treasurySnapshot() {
  const [apy, assets, firstLoss] = await Promise.all([
    read<[number, unknown]>(CONTRACT(), "treasury_apy_bps", []),
    read<bigint>(CONTRACT(), "treasury_assets", []),
    read<bigint>(CONTRACT(), "first_loss_buffer", []),
  ]);
  return {
    apyBps: Number(apy[0]),
    apySource: PROVENANCE[Number(apy[1])] ?? "param",
    assets: String(assets),
    firstLoss: String(firstLoss),
    mode: process.env.PUBLIC_TREASURY_MODE ?? "local",
  };
}

export const config = () => read<Record<string, unknown>>(CONTRACT(), "config", []);

export const isWhitelisted = (publicKey: string) =>
  read<boolean>(CONTRACT(), "is_whitelisted", [addr(publicKey)]);

// ── writes ──────────────────────────────────────────────────────────────────

export async function registerInvoice(input: {
  ettnHashHex: string;
  docHashHex: string;
  sellerTaxId: string;
  buyerTaxId: string;
  amountFiatMinor: bigint;
  faceUsdc: bigint;
  dueDate: number;
}): Promise<{ id: number; hash: string }> {
  const seller = keypair("seller");
  const { value, hash } = await invoke<number>(
    CONTRACT(),
    "register",
    [
      addr(seller.publicKey()),
      addr(keypair("buyer").publicKey()),
      bytes32(Buffer.from(input.ettnHashHex, "hex")),
      bytes32(Buffer.from(input.docHashHex, "hex")),
      sym(input.sellerTaxId),
      sym(input.buyerTaxId),
      i128(input.amountFiatMinor),
      i128(input.faceUsdc),
      u64(input.dueDate),
    ],
    seller,
  );
  return { id: Number(value), hash };
}

export async function acknowledge(id: number): Promise<string> {
  const buyer = keypair("buyer");
  return (await invoke(CONTRACT(), "acknowledge", [u32(id)], buyer)).hash;
}

export async function acceptQuote(id: number): Promise<{ quote: QuoteView; hash: string }> {
  const seller = keypair("seller");
  const { value, hash } = await invoke<Record<string, unknown>>(
    CONTRACT(),
    "accept_quote",
    [u32(id)],
    seller,
  );
  return { quote: decodeQuote(value), hash };
}

export async function fund(id: number, actor: Actor, amount: bigint): Promise<string> {
  const kp = keypair(actor);
  return (
    await invoke(CONTRACT(), "fund", [u32(id), addr(kp.publicKey()), i128(amount)], kp)
  ).hash;
}

export async function repay(id: number): Promise<string> {
  const buyer = keypair("buyer");
  return (await invoke(CONTRACT(), "repay", [u32(id), addr(buyer.publicKey())], buyer)).hash;
}

export async function setWhitelist(publicKey: string, allowed: boolean): Promise<string> {
  const admin = keypair("admin");
  return (
    await invoke(CONTRACT(), "set_whitelist", [addr(publicKey), bool(allowed)], admin)
  ).hash;
}

export async function markDefault(id: number) {
  const admin = keypair("admin");
  const { value, hash } = await invoke<Record<string, unknown>>(
    CONTRACT(),
    "mark_default",
    [u32(id)],
    admin,
  );
  return {
    hash,
    outcome: {
      invoiceId: Number(value?.invoice_id ?? id),
      fromFirstLoss: String(value?.from_first_loss ?? 0),
      sellerRecourse: String(value?.seller_recourse ?? 0),
    },
  };
}

export async function depositFirstLoss(amount: bigint): Promise<string> {
  const admin = keypair("admin");
  return (
    await invoke(
      CONTRACT(),
      "deposit_first_loss",
      [addr(admin.publicKey()), i128(amount)],
      admin,
    )
  ).hash;
}
