/**
 * The wallet signing path, exercised end to end against a running instance.
 *
 * Stands in for Freighter: the same envelope the extension would be handed is
 * signed here with a key the test holds, so what is verified is the route pair
 * and the contract's acceptance of a signature the server never produced.
 */
import { config as loadEnv } from "dotenv";
import { Keypair, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

loadEnv({ path: ".env.local", quiet: true });

const BASE = process.env.TEST_BASE ?? "http://localhost:3100";
const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", O = "\x1b[0m";
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const bad = (s: string) => { console.log(`   ${R}✕${O} ${s}`); process.exitCode = 1; };
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const { keypair } = await import("../src/lib/server/actors");
const { signSep53 } = await import("../src/lib/auth/sep53");
const inv = await import("../src/lib/server/invoices");

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

console.log(`${B}Wallet signing path${O}`);
dim(BASE);

// ── a wallet session, signed the way a wallet signs ─────────────────────────
const kp: Keypair = keypair("funder");
const ch = await call("/api/auth/challenge", { address: kp.publicKey() });
if (!ch.ok) bad(`challenge: ${ch.error}`);
const sig = signSep53(kp.secret(), ch.message).toString("base64");
const login = await call("/api/auth/wallet", {
  address: kp.publicKey(),
  nonce: ch.nonce,
  signature: sig,
  payload: ch.message,
  role: "funder",
  walletId: "test",
  walletName: "Test wallet",
});
if (!login.ok) bad(`wallet login: ${login.error}`);
else ok(`signed in as a wallet · ${kp.publicKey().slice(0, 8)}…`);

// ── pick something fundable ────────────────────────────────────────────────
const list = await inv.listInvoices();
const target = list.find(
  (i) => i.status === "acknowledged" && i.lockedDiscountBps > 0 &&
    BigInt(i.lockedPayoutUsdc) - BigInt(i.fundedAmount) > 20_000_000n,
);
if (!target) { bad("no invoice with room to fund"); process.exit(1); }
const before = BigInt(target.fundedAmount);
dim(`invoice #${target.id} · ${(Number(before) / 1e7).toFixed(4)} USDC funded so far`);

// ── prepare · the server builds and simulates, holding no key ──────────────
const prep = await call("/api/tx/prepare", { action: "fund", invoiceId: target.id, amountUsdc: 2 });
if (!prep.ok) { bad(`prepare: ${prep.error}`); process.exit(1); }
ok(`prepared · ${prep.summary}`);
dim(`${prep.xdr.length} chars of unsigned XDR`);

// ── sign · this is the step Freighter performs ──────────────────────────────
const tx = TransactionBuilder.fromXDR(prep.xdr, Networks.TESTNET);
if (tx.signatures.length !== 0) bad("the server handed over an already-signed envelope");
else ok("the envelope arrived unsigned — the server signed nothing");
tx.sign(kp);
ok("signed with the wallet's own key");

// ── submit ──────────────────────────────────────────────────────────────────
const sent = await call("/api/tx/submit", { signedXdr: tx.toXDR(), method: "fund" });
if (!sent.ok) { bad(`submit: ${sent.error}`); process.exit(1); }
ok(`accepted by the ledger · ${sent.hash.slice(0, 16)}…`);

// ── the contract's own view is the only proof that counts ──────────────────
const after = BigInt((await inv.getInvoice(target.id)).fundedAmount);
if (after - before !== 20_000_000n) bad(`funded amount moved by ${after - before}, expected 20000000`);
else ok(`the contract recorded 2.0000000 USDC from that signature`);

console.log(process.exitCode ? `\n${R}${B}✕ wallet signing path is broken${O}` : `\n${G}${B}✅ a wallet signed its own transaction${O}`);
