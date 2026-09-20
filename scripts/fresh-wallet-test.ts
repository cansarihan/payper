/**
 * The wallet path from a genuinely empty account.
 *
 * The earlier test used a key that already held a trustline and a balance, so
 * it passed while the real thing — somebody opening Freighter for the first
 * time — failed on the first step. This starts from nothing: a new keypair,
 * funded with XLM and nothing else.
 */
import { config as loadEnv } from "dotenv";
import {
  Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder,
} from "@stellar/stellar-sdk";

loadEnv({ path: ".env.local", quiet: true });

const BASE = process.env.TEST_BASE ?? "http://localhost:3100";
const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", O = "\x1b[0m";
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const bad = (s: string) => { console.log(`   ${R}✕${O} ${s}`); process.exitCode = 1; };
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const { keypair } = await import("../src/lib/server/actors");
const { signSep53 } = await import("../src/lib/auth/sep53");
const inv = await import("../src/lib/server/invoices");

const horizon = new Horizon.Server(process.env.PUBLIC_HORIZON_URL!);
const usdc = new Asset("USDC", process.env.PUBLIC_USDC_ISSUER!);
const passphrase = process.env.PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

let cookie = "";
async function call(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return (await res.json()) as any;
}

/** Sign with the fresh key and hand it back, exactly as Freighter would. */
async function signAndSubmit(action: string, kp: Keypair, extra: Record<string, unknown> = {}) {
  const prep = await call("/api/tx/prepare", { action, ...extra });
  if (!prep.ok) return { ok: false, error: prep.error as string };
  const tx = TransactionBuilder.fromXDR(prep.xdr, passphrase);
  if (tx.signatures.length !== 0) bad("the server handed over a signed envelope");
  tx.sign(kp);
  const sent = await call("/api/tx/submit", { signedXdr: tx.toXDR(), method: prep.method });
  return { ok: Boolean(sent.ok), error: sent.error as string, hash: sent.hash as string, summary: prep.summary as string };
}

console.log(`${B}A wallet opening for the first time${O}`);
dim(BASE);

// ── 1 · a brand new account, XLM and nothing else ──────────────────────────
const fresh = Keypair.random();
const fb = await fetch(`https://friendbot.stellar.org/?addr=${fresh.publicKey()}`);
if (!fb.ok) { bad("friendbot would not fund the account"); process.exit(1); }
ok(`new account created · ${fresh.publicKey().slice(0, 8)}…`);
const opening = await horizon.loadAccount(fresh.publicKey());
if (opening.balances.some((b) => "asset_code" in b)) bad("the fresh account already holds an asset");
else ok("holds XLM only — no trustline, no USDC");

// ── 2 · sign in as a wallet ────────────────────────────────────────────────
const ch = await call("/api/auth/challenge", { address: fresh.publicKey() });
const login = await call("/api/auth/wallet", {
  address: fresh.publicKey(),
  nonce: ch.nonce,
  signature: signSep53(fresh.secret(), ch.message).toString("base64"),
  payload: ch.message,
  role: "funder",
  walletId: "test",
  walletName: "Fresh wallet",
});
if (!login.ok) { bad(`wallet login: ${login.error}`); process.exit(1); }
ok("signed in as a wallet, role funder");

// ── 3 · funding without a trustline must be refused, and say why ───────────
const list = await inv.listInvoices();
const target = list.find(
  (i) => i.status === "acknowledged" && i.lockedDiscountBps > 0 &&
    BigInt(i.lockedPayoutUsdc) - BigInt(i.fundedAmount) > 30_000_000n,
);
if (!target) { bad("no invoice with room to fund"); process.exit(1); }

const early = await call("/api/tx/prepare", { action: "fund", invoiceId: target.id, amountUsdc: 2 });
if (early.ok) bad("funding was allowed with no trustline");
else if (!/trustline/i.test(early.error)) bad(`refused, but unhelpfully: ${early.error}`);
else ok("funding refused before any prompt, naming the trustline");
dim(early.error);

// ── 4 · open the trustline, signed by the wallet ───────────────────────────
const trust = await signAndSubmit("trustline", fresh);
if (!trust.ok) { bad(`trustline: ${trust.error}`); process.exit(1); }
ok(`trustline opened by the wallet's own signature · ${trust.summary}`);

// ── 5 · still no balance, so still refused — and it says so ────────────────
const broke = await call("/api/tx/prepare", { action: "fund", invoiceId: target.id, amountUsdc: 2 });
if (broke.ok) bad("funding was allowed with a zero balance");
else if (!/holds 0/i.test(broke.error)) bad(`refused, but unhelpfully: ${broke.error}`);
else ok("funding refused again, naming the empty balance");
dim(broke.error);

// ── 6 · give it USDC, the way a funder would arrive with some ──────────────
const from = keypair("funder");
const acc = await horizon.loadAccount(from.publicKey());
const pay = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: passphrase })
  .addOperation(Operation.payment({ destination: fresh.publicKey(), asset: usdc, amount: "5" }))
  .setTimeout(60).build();
pay.sign(from);
await horizon.submitTransaction(pay);
ok("wallet now holds 5 USDC");

// ── 7 · now it funds, and the wallet is what signs ─────────────────────────
const before = BigInt((await inv.getInvoice(target.id)).fundedAmount);
const funded = await signAndSubmit("fund", fresh, { invoiceId: target.id, amountUsdc: 2 });
if (!funded.ok) { bad(`fund: ${funded.error}`); process.exit(1); }
ok(`funded · ${funded.summary}`);
const after = BigInt((await inv.getInvoice(target.id)).fundedAmount);
if (after - before !== 20_000_000n) bad(`the contract recorded ${after - before}, expected 20000000`);
else ok("the contract recorded 2.0000000 USDC from that signature");

console.log(
  process.exitCode
    ? `\n${R}${B}✕ a first-time wallet cannot complete the flow${O}`
    : `\n${G}${B}✅ a first-time wallet went from empty to funded, signing every step${O}`,
);
