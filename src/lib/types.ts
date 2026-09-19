export type { AuthMethod, LinkedWallet, Session, SessionRole } from "./auth/roles";
export type { FunderView, InvoiceStatus, InvoiceView, Provenance, QuoteView } from "./server/invoices";

export interface AnchorView {
  homeDomain: string;
  assetCode: string;
  assetIssuer: string;
  fiatAsset: string;
  endpoints: {
    webAuth: string;
    transferServer: string;
    kycServer: string | null;
    quoteServer: string | null;
    signingKey: string;
  };
  rates: {
    pair: string;
    mid_rate: string;
    buy_rate: string;
    sell_rate: string;
    spread_bps: number;
    source: string;
  } | null;
  limits: { min_onramp_try: string; max_onramp_try: string; min_offramp_usdc: string } | null;
  treasury: { address: string; usdc_balance: string } | null;
}

export interface TreasuryView {
  apyBps: number;
  apySource: string;
  assets: string;
  firstLoss: string;
  mode: string;
}

export interface SepLogView {
  tag: string;
  msg: string;
  at?: number;
}

export interface AnchorRunResult {
  ok: boolean;
  flow?: "off" | "on";
  log?: SepLogView[];
  legs?: { id: string; amountIn: string; amountOut: string; status: string; stellarTx?: string }[];
  fiatOut?: string;
  fiatIn?: string;
  usdcIn?: string;
  usdcOut?: string;
  available?: string;
  error?: string;
  needsRole?: string;
}

export interface AppState {
  ok: true;
  network: string;
  contracts: { invoice: string; treasury: string; fxOracle: string };
  actors: { seller: string; buyer: string; funder: string; funderB: string };
  invoices: import("./server/invoices").InvoiceView[];
  treasury: TreasuryView;
  active: import("./server/invoices").InvoiceView | null;
  activeQuote: import("./server/invoices").QuoteView | null;
  activeFunders: import("./server/invoices").FunderView[];
  anchor: AnchorView | null;
  limits: { gracePeriodDays: number; quoteTtlHours: number; whitelistThresholdUsdc: string };
}
