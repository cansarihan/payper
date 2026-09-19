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
  return {
    minFiat: Number(health?.limits?.min_onramp_try ?? 50),
    maxFiat: Number(health?.limits?.max_onramp_try ?? 3000),
    minAsset: Number(health?.limits?.min_offramp_usdc ?? 1),
  };
}

/**
 * Split an amount into transfers the anchor will accept.
 *
 * The anchor caps each transaction, so a hundred thousand lira is thirty-four
 * transfers, not one. Each part is floored to the asset's decimals rather than
 * rounded: rounding up produced a final part larger than the balance left, and
 * the anchor answered with a 400.
 */
export function tranche(total: number, min: number, max: number, decimals: number): number[] {
  const scale = 10 ** decimals;
  const floor = (n: number) => Math.floor(n * scale) / scale;
  const round = (n: number) => Math.round(n * scale) / scale;

  const amount = floor(total);
  if (amount <= 0) return [];
  if (amount <= max) return [amount];

  // Split into the fewest parts that all fit under the cap, sized evenly rather
  // than greedily. Filling parts to the cap and letting a small remainder fall
  // out the end means that remainder can be below the anchor's floor — and
  // folding it back into the previous part pushes *that* over the cap, which is
  // how a 3.016 TRY transfer got refused for exceeding 3.000.
  // Rounding the division before the ceiling collapses 6.0047 to 6 and hands
  // back parts above the cap; an epsilon absorbs float error without doing that.
  const count = Math.ceil(amount / max - 1e-9);
  // Round the even parts *up*, so the leftover lands on the final one as a
  // shortfall rather than a surplus. Flooring them pushes the accumulated
  // remainder onto the last part, which is how it ended up above the cap.
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

/**
 * Fiat in, asset out — the on-ramp.
 *
 * A funder who is short of USDC buys it the same way a buyer settles at
 * maturity: through the anchor, with lira. No pre-seeded balances.
 */
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
 * Asset in, fiat out — the off-ramp the supplier actually cares about.
 *
 * The USDC is sent to the anchor's treasury with the memo it asked for; the
 * lira lands in the bank account named by `bank`, or the anchor's default when
 * none is on file.
 */
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

  for (const part of tranche(opts.amountAsset, limits.minAsset, 1e9, 7)) {
    const amount = part.toFixed(7);
    const quote = await anchor.quote({ jwt, direction: "sell_asset", sellAmount: amount });
    const wd = await anchor.startWithdraw({
      jwt,
      amountAsset: amount,
      quoteId: quote.id,
      dest: opts.bank?.iban,
      destExtra: opts.bank?.holder,
    });
    if (!wd.account_id) throw new Error("anchor bir hazine adresi döndürmedi");

    const account = await horizon.loadAccount(signer.publicKey());
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({ destination: wd.account_id, asset, amount }),
      )
      .setTimeout(60);
    if (wd.memo) builder.addMemo(Memo.text(wd.memo));
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
