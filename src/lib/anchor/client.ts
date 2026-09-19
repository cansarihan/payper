import { Keypair, Networks, Transaction, TransactionBuilder, WebAuth } from "@stellar/stellar-sdk";

import { discover, type AnchorConfig } from "./config";

export interface SepLog {
  tag: string;
  msg: string;
  at?: number;
}
type Logger = (e: SepLog) => void;

const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

/**
 * SEP client: discovery, auth, firm quotes, transfers.
 *
 * SEP-6 rather than SEP-24 — the anchor implements SEP-6, and programmatic
 * transfer keeps the discount breakdown in our own interface.
 */
export class AnchorClient {
  private constructor(
    readonly config: AnchorConfig,
    private readonly log: Logger,
  ) {}

  static async create(opts?: { homeDomain?: string; log?: Logger }): Promise<AnchorClient> {
    const log: Logger = (e) => opts?.log?.({ ...e, at: Date.now() });
    const domain = opts?.homeDomain ?? process.env.PUBLIC_ANCHOR_HOME_DOMAIN ?? "tr-mock-anchor.fly.dev";
    log({ tag: "GET", msg: `https://${domain}/.well-known/stellar.toml` });
    const config = await discover({ homeDomain: opts?.homeDomain });
    log({
      tag: "SEP1",
      msg: `auth=${config.webAuthEndpoint} transfer=${config.transferServer}`,
    });
    return new AnchorClient(config, log);
  }

  /** SEP-10. The challenge is validated before it is signed. */
  async authenticate(signer: Keypair): Promise<string> {
    this.log({ tag: "GET", msg: `/auth?account=${short(signer.publicKey())}` });
    const res = await fetch(
      `${this.config.webAuthEndpoint}?account=${signer.publicKey()}&home_domain=${this.config.homeDomain}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`the SEP-10 challenge could not be fetched: HTTP ${res.status}`);
    const { transaction, network_passphrase } = (await res.json()) as {
      transaction: string;
      network_passphrase?: string;
    };

    const passphrase = network_passphrase ?? Networks.TESTNET;
    // Validates sequence, time bounds, home domain and operation shape, not
    // just the server signature.
    const { tx } = WebAuth.readChallengeTx(
      transaction,
      this.config.signingKey,
      passphrase,
      this.config.homeDomain,
      new URL(this.config.webAuthEndpoint).host,
    );
    this.log({ tag: "SEP10", msg: `challenge verified · signing key ${short(this.config.signingKey)}` });

    tx.sign(signer);
    this.log({ tag: "SIGN", msg: `challenge signed · ${short(signer.publicKey())}` });

    const post = await fetch(this.config.webAuthEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transaction: tx.toXDR() }),
    });
    if (!post.ok) throw new Error(`the SEP-10 token could not be fetched: HTTP ${post.status}`);
    const { token } = (await post.json()) as { token: string };
    this.log({ tag: "POST", msg: `/auth → { token: ${token.slice(0, 12)}… }` });
    return token;
  }

  /** SEP-38 asset identifier. */
  private stellarAsset(): string {
    return `stellar:${this.config.assetCode}:${this.config.assetIssuer}`;
  }

  async info(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.config.transferServer}/info`, { cache: "no-store" });
    if (!res.ok) throw new Error(`SEP-6 /info could not be fetched: HTTP ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  }

  /** Live rates and per-transaction limits. */
  async health(): Promise<{
    rates?: { pair: string; mid_rate: string; buy_rate: string; sell_rate: string; spread_bps: number; source: string };
    limits?: { min_onramp_try: string; max_onramp_try: string; min_offramp_usdc: string };
    treasury?: { address: string; usdc_balance: string };
  } | null> {
    const res = await fetch(`https://${this.config.homeDomain}/health`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as never) : null;
  }

  /** SEP-38 firm quote, so the payout shown is the payout paid. */
  async quote(opts: {
    jwt: string;
    direction: "sell_asset" | "sell_fiat";
    sellAmount: string;
  }): Promise<{ id: string; price: string; expires_at: string; sell_amount: string; buy_amount: string }> {
    const onChain = this.stellarAsset();
    const sell = opts.direction === "sell_asset" ? onChain : this.config.fiatAsset;
    const buy = opts.direction === "sell_asset" ? this.config.fiatAsset : onChain;

    this.log({
      tag: "POST",
      msg: `/sep38/quote sell=${opts.direction === "sell_asset" ? this.config.assetCode : this.config.fiatAssetCode} sell_amount=${opts.sellAmount}`,
    });
    const res = await fetch(`${this.config.quoteServer ?? `https://${this.config.homeDomain}/sep38`}/quote`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${opts.jwt}` },
      body: JSON.stringify({ sell_asset: sell, buy_asset: buy, sell_amount: opts.sellAmount }),
    });
    if (!res.ok) throw new Error(`the SEP-38 quote could not be fetched: HTTP ${res.status} ${await res.text()}`);
    const q = (await res.json()) as never as {
      id: string; price: string; expires_at: string; sell_amount: string; buy_amount: string;
    };
    this.log({ tag: "201", msg: `quote_id=${q.id} price=${q.price} expires_at=${q.expires_at}` });
    return q;
  }

  /** SEP-12. Auto-approved in the sandbox. */
  async ensureCustomer(jwt: string, account: string): Promise<string | undefined> {
    if (!this.config.kycServer) return undefined;
    const res = await fetch(`${this.config.kycServer}/customer`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ account, type: "sep6", first_name: "Payper", last_name: "Demo" }),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { id?: string };
    this.log({ tag: "SEP12", msg: `customer approved${body.id ? ` id=${body.id}` : ""}` });
    return body.id;
  }

  /** SEP-6 withdraw: asset out, fiat to a bank account. */
  async startWithdraw(opts: {
    jwt: string;
    amountAsset: string;
    quoteId?: string;
    dest?: string;
    destExtra?: string;
  }) {
    const params = new URLSearchParams({
      asset_code: this.config.assetCode,
      amount: opts.amountAsset,
      type: "bank_account",
    });
    if (opts.quoteId) params.set("quote_id", opts.quoteId);
    if (opts.dest) params.set("dest", opts.dest);
    if (opts.destExtra) params.set("dest_extra", opts.destExtra);
    const path = opts.quoteId ? "withdraw-exchange" : "withdraw";
    if (opts.quoteId) {
      params.set("source_asset", this.config.assetCode);
      params.set("destination_asset", this.config.fiatAsset);
    }

    this.log({ tag: "GET", msg: `/sep6/${path}?amount=${opts.amountAsset}` });
    const res = await fetch(`${this.config.transferServer}/${path}?${params}`, {
      headers: { authorization: `Bearer ${opts.jwt}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`the SEP-6 withdrawal could not be started: HTTP ${res.status} ${await res.text()}`);
    const body = (await res.json()) as {
      id: string;
      account_id?: string;
      memo?: string;
      memo_type?: string;
    };
    this.log({ tag: "200", msg: `id=${body.id} treasury=${body.account_id ? short(body.account_id) : "—"} memo=${body.memo ?? "—"}` });
    return body;
  }

  /** SEP-6 deposit: fiat in, asset on chain. */
  async startDeposit(opts: { jwt: string; account: string; amountFiat: string; quoteId?: string }) {
    const params = new URLSearchParams({
      asset_code: this.config.assetCode,
      account: opts.account,
      amount: opts.amountFiat,
    });
    if (opts.quoteId) {
      params.set("quote_id", opts.quoteId);
      params.set("source_asset", this.config.fiatAsset);
      params.set("destination_asset", this.config.assetCode);
    }
    const path = opts.quoteId ? "deposit-exchange" : "deposit";

    this.log({ tag: "GET", msg: `/sep6/${path}?amount=${opts.amountFiat}&account=${short(opts.account)}` });
    const res = await fetch(`${this.config.transferServer}/${path}?${params}`, {
      headers: { authorization: `Bearer ${opts.jwt}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`the SEP-6 deposit could not be started: HTTP ${res.status} ${await res.text()}`);
    const body = (await res.json()) as {
      id: string;
      how?: string;
      instructions?: Record<string, { value?: string; description?: string }>;
    };
    this.log({
      tag: "200",
      msg: `id=${body.id} instructions=${Object.keys(body.instructions ?? {}).join(",") || "—"}`,
    });
    return body;
  }

  /** Sandbox stand-in for an arriving bank transfer. */
  async simulateBankTransfer(jwt: string, id: string, amount: string) {
    this.log({ tag: "POST", msg: `/sep6/tx/${id}/simulate-bank-transfer { "amount": "${amount}" }` });
    const res = await fetch(`${this.config.transferServer}/tx/${id}/simulate-bank-transfer`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error(`the bank transfer could not be simulated: HTTP ${res.status}`);
    this.log({ tag: "BANK", msg: `fiat received · ${id} credited` });
  }

  async getTransaction(jwt: string, id: string) {
    const res = await fetch(`${this.config.transferServer}/transaction?id=${id}`, {
      headers: { authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`the SEP-6 transaction status could not be fetched: HTTP ${res.status}`);
    const body = (await res.json()) as { transaction: Record<string, unknown> };
    return body.transaction;
  }

  /** Poll to a terminal state. */
  async waitForStatus(jwt: string, id: string, want: string[], timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const tx = await this.getTransaction(jwt, id);
      const status = String(tx.status);
      this.log({ tag: "GET", msg: `/sep6/transaction?id=${id} → status=${status}` });
      if (want.includes(status)) return tx;
      if (status === "error" || status === "refunded") {
        throw new Error(`the anchor transaction is in status ${status}: ${id}`);
      }
      if (Date.now() > deadline) {
        throw new Error(
          `The anchor accepted the request and left it at "${status}" — it never settled. ` +
            `This is the anchor's side, not the contract's: nothing was signed and no funds moved. ` +
            `Reference ${id}.`,
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
