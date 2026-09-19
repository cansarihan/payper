import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import type { AnchorClient } from "./client";

export interface Limits {
  minFiat: number;
  maxFiat: number;
  minAsset: number;
  /**
   * The largest asset amount one withdrawal may carry.
   *
   * The anchor caps the *fiat* side, so the asset-side ceiling has to be
   * derived from the rate. Without it a withdrawal above the cap is built,
   * sent, and refused by the anchor after the money has already left.
   */
  maxAsset: number;
}

export interface Leg {
  id: string;
  amountIn: string;
  amountOut: string;
  status: string;
  stellarTx?: string;
}

export async function fetchLimits(anchor: AnchorClient): Promise<Limits> {
  const health = await anchor.health();
  const minFiat = Number(health?.limits?.min_onramp_try ?? 50);
  const maxFiat = Number(health?.limits?.max_onramp_try ?? 3000);
  const minAsset = Number(health?.limits?.min_offramp_usdc ?? 1);
  // Selling the asset yields fiat at the sell rate, so that is the one that
  // decides how much asset fits under the fiat cap.
  const sell = Number(health?.rates?.sell_rate ?? 0);
  const maxAsset = sell > 0 ? Math.max(minAsset, Math.floor((maxFiat / sell) * 1e7) / 1e7) : 1e9;
  return { minFiat, maxFiat, minAsset, maxAsset };
}

/**
 * Split an amount into transfers the anchor will accept.
 *
 * Every part must sit within [min, max] and the parts must sum to the input.
 */
export function tranche(total: number, min: number, max: number, decimals: number): number[] {
  const scale = 10 ** decimals;
  const floor = (n: number) => Math.floor(n * scale) / scale;
  const round = (n: number) => Math.round(n * scale) / scale;

  const amount = floor(total);
  if (amount <= 0) return [];
  if (amount <= max) return [amount];

  // Even split, not greedy: filling to the cap leaves a remainder that can fall
  // below the floor, and folding it back pushes that part over the cap.
  // Epsilon absorbs float error; rounding here would collapse 6.0047 to 6.
  const count = Math.ceil(amount / max - 1e-9);
  // Round up so the leftover lands on the last part as a shortfall, not a
  // surplus that would exceed the cap.
  const base = Math.ceil((amount / count) * scale - 1e-6) / scale;
  const parts = Array.from({ length: count - 1 }, () => base);
  parts.push(round(amount - base * (count - 1)));

  return parts;
}

export const totalOut = (legs: Leg[]) => legs.reduce((s, l) => s + Number(l.amountOut), 0);

export async function ensureTrustline(
  horizon: Horizon.Server,
  signer: Keypair,
  asset: Asset,
  networkPassphrase = Networks.TESTNET,
): Promise<boolean> {
  const account = await horizon.loadAccount(signer.publicKey());
  const has = account.balances.some(
    (b) => "asset_code" in b && b.asset_code === asset.code && b.asset_issuer === asset.issuer,
  );
  if (has) return false;

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(60)
    .build();
  tx.sign(signer);
  await horizon.submitTransaction(tx);
  return true;
}

export async function balanceOf(
  horizon: Horizon.Server,
  publicKey: string,
  asset: Asset,
): Promise<number> {
  const account = await horizon.loadAccount(publicKey);
  const b = account.balances.find(
    (x) => "asset_code" in x && x.asset_code === asset.code && x.asset_issuer === asset.issuer,
  );
  return b ? Number(b.balance) : 0;
}

/** On-ramp: fiat in, asset out. */
export async function depositFromBank(opts: {
  anchor: AnchorClient;
  signer: Keypair;
  jwt: string;
  account: string;
  amountFiat: number;
  limits?: Limits;
}): Promise<Leg[]> {
  const { anchor, jwt } = opts;
  const limits = opts.limits ?? (await fetchLimits(anchor));
  const legs: Leg[] = [];

  for (const part of tranche(opts.amountFiat, limits.minFiat, limits.maxFiat, 2)) {
    const amount = part.toFixed(2);
    const quote = await anchor.quote({ jwt, direction: "sell_fiat", sellAmount: amount });
    const dep = await anchor.startDeposit({
      jwt,
      account: opts.account,
      amountFiat: amount,
      quoteId: quote.id,
    });
    await anchor.simulateBankTransfer(jwt, dep.id, amount);
    const tx = await anchor.waitForStatus(jwt, dep.id, ["completed"]);
    legs.push({
      id: dep.id,
      amountIn: amount,
      amountOut: String(tx.amount_out ?? quote.buy_amount),
      status: String(tx.status),
      stellarTx: tx.stellar_transaction_id ? String(tx.stellar_transaction_id) : undefined,
    });
  }
  return legs;
}

/**
 * Off-ramp: asset in, fiat to a bank account.
 *
 * Paid to the anchor's treasury with the memo it returns.
 */
/** A memo of the type the anchor said it would look for. */
function anchorMemo(value: string, type: string | undefined): Memo {
  switch ((type ?? "text").toLowerCase()) {
    case "id":
      return Memo.id(value);
    case "hash":
      return Memo.hash(Buffer.from(value, "hex").toString("hex"));
    case "return":
      return Memo.return(Buffer.from(value, "hex").toString("hex"));
    default:
      return Memo.text(value);
  }
}

export async function withdrawToBank(opts: {
  anchor: AnchorClient;
  signer: Keypair;
  jwt: string;
  amountAsset: number;
  horizon: Horizon.Server;
  limits?: Limits;
  bank?: { iban: string; holder: string };
}): Promise<Leg[]> {
  const { anchor, jwt, signer, horizon } = opts;
  const limits = opts.limits ?? (await fetchLimits(anchor));
  const asset = new Asset(anchor.config.assetCode, anchor.config.assetIssuer);
  const legs: Leg[] = [];

  for (const part of tranche(opts.amountAsset, limits.minAsset, limits.maxAsset, 7)) {
    const amount = part.toFixed(7);
    const quote = await anchor.quote({ jwt, direction: "sell_asset", sellAmount: amount });
    const wd = await anchor.startWithdraw({
      jwt,
      amountAsset: amount,
      quoteId: quote.id,
      dest: opts.bank?.iban,
      destExtra: opts.bank?.holder,
    });
    if (!wd.account_id) throw new Error("the anchor returned no treasury address");

    const account = await horizon.loadAccount(signer.publicKey());
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({ destination: wd.account_id, asset, amount }),
      )
      .setTimeout(60);
    // The anchor names the memo type it will match on, and matching is the
    // whole mechanism: the watcher looks for a payment carrying exactly this
    // memo. Sending MEMO_TEXT where it asked for MEMO_ID leaves the money in
    // the treasury and the transfer stuck at pending_user_transfer_start.
    if (wd.memo) builder.addMemo(anchorMemo(wd.memo, wd.memo_type));
    const tx = builder.build();
    tx.sign(signer);
    const sent = await horizon.submitTransaction(tx);

    const settled = await anchor.waitForStatus(jwt, wd.id, ["completed"]);
    legs.push({
      id: wd.id,
      amountIn: amount,
      amountOut: String(settled.amount_out ?? quote.buy_amount),
      status: String(settled.status),
      stellarTx: sent.hash,
    });
  }
  return legs;
}
