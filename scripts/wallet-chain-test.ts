/**
 * One wallet, every signature: register, acknowledge, lock the price, fund.
 *
 * The contract asks a different party to authorise each of these — the seller
 * named on the invoice, the buyer named on it, the seller again, then whoever
 * is paying. This walks all four with a single fresh key, which is only
 * possible because the registration named that key on both sides.
 */
import { config as loadEnv } from "dotenv";
import {
  Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder,
} from "@stellar/stellar-sdk";
import { createHash, randomUUID } from "node:crypto";

loadEnv({ path: ".env.local", quiet: true });

const BASE = process.env.TEST_BASE ?? "http://localhost:3100";
const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", O = "\x1b[0m";
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const bad = (s: string) => { console.log(`   ${R}✕${O} ${s}`); process.exitCode = 1; };
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const { keypair } = await import("../src/lib/server/actors");
const { signSep53 } = await import("../src/lib/auth/sep53");
const { prepareRegister } = await import("../src/lib/server/wallet-tx");
const inv = await import("../src/lib/server/invoices");

const horizon = new Horizon.Server(process.env.PUBLIC_HORIZON_URL!);
const usdc = new Asset("USDC", process.env.PUBLIC_USDC_ISSUER!);
const passphrase = process.env.PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

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

/** Sign an envelope the way the extension would, and submit it. */
async function put(prepared: { xdr: string; method: string }, kp: Keypair, label: string) {
  const tx = TransactionBuilder.fromXDR(prepared.xdr, passphrase);
  if (tx.signatures.length !== 0) bad(`${label}: the server handed over a signed envelope`);
  tx.sign(kp);
  const sent = await call("/api/tx/submit", { signedXdr: tx.toXDR(), method: prepared.method });
  if (!sent.ok) { bad(`${label}: ${sent.error}`); return null; }
  return sent.hash as string;
}

console.log(`${B}One wallet, four signatures${O}`);
dim(BASE);

const kp = Keypair.random();
if (!(await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`)).ok) {
  bad("friendbot would not fund the account"); process.exit(1);
}
ok(`fresh wallet · ${kp.publicKey().slice(0, 8)}…`);

// sign in
const ch = await call("/api/auth/challenge", { address: kp.publicKey() });
const login = await call("/api/auth/wallet", {
  address: kp.publicKey(), nonce: ch.nonce,
  signature: signSep53(kp.secret(), ch.message).toString("base64"),
  payload: ch.message, role: "seller", walletId: "test", walletName: "Fresh wallet",
});
if (!login.ok) { bad(`login: ${login.error}`); process.exit(1); }
ok("signed in as a wallet");

// ── 1 · register, signed by the wallet, naming it on both sides ────────────
const ettn = randomUUID();
const prepared = await prepareRegister({
  signer: kp.publicKey(),
  buyerAddress: kp.publicKey(),
  ettnHashHex: sha(ettn), docHashHex: sha(`${ettn}:doc`),
  sellerTaxId: "s1234567890", buyerTaxId: "b0987654321",
  amountFiatMinor: 120_000n, faceUsdc: 24_0000000n,
  dueDate: Math.floor(Date.now() / 1000) + 45 * 86_400,
  demoBuyer: keypair("buyer").publicKey(),
});
const regHash = await put(prepared, kp, "register");
if (!regHash) process.exit(1);
const id = (await inv.listInvoices()).find((i) => i.ettnHash === sha(ettn))?.id;
if (!id) { bad("the invoice did not appear on chain"); process.exit(1); }
ok(`registered by the wallet · invoice #${id}`);

// ── 2 · acknowledge ────────────────────────────────────────────────────────
await call("/api/auth/role", { role: "buyer" });
const ackPrep = await call("/api/tx/prepare", { action: "acknowledge", invoiceId: id });
if (!ackPrep.ok) { bad(`acknowledge prepare: ${ackPrep.error}`); process.exit(1); }
if (!(await put(ackPrep, kp, "acknowledge"))) process.exit(1);
ok("acknowledged by the wallet");

// ── 3 · lock the price — the one that needed the seller to be this wallet ──
await call("/api/auth/role", { role: "seller" });
const lockPrep = await call("/api/tx/prepare", { action: "accept_quote", invoiceId: id });
if (!lockPrep.ok) { bad(`accept_quote prepare: ${lockPrep.error}`); process.exit(1); }
if (!(await put(lockPrep, kp, "accept_quote"))) process.exit(1);
const locked = (await inv.getInvoice(id)).lockedDiscountBps;
if (!locked) bad("the contract recorded no locked discount");
else ok(`price locked by the wallet · %${(locked / 100).toFixed(2)}`);

// ── 4 · fund ───────────────────────────────────────────────────────────────
await call("/api/auth/role", { role: "funder" });
const trust = await call("/api/tx/prepare", { action: "trustline" });
if (trust.ok) await put(trust, kp, "trustline");
const from = keypair("funder");
const acc = await horizon.loadAccount(from.publicKey());
const pay = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: passphrase })
  .addOperation(Operation.payment({ destination: kp.publicKey(), asset: usdc, amount: "6" }))
  .setTimeout(60).build();
pay.sign(from);
await horizon.submitTransaction(pay);

const fundPrep = await call("/api/tx/prepare", { action: "fund", invoiceId: id, amountUsdc: 3 });
if (!fundPrep.ok) { bad(`fund prepare: ${fundPrep.error}`); process.exit(1); }
if (!(await put(fundPrep, kp, "fund"))) process.exit(1);
const funded = Number((await inv.getInvoice(id)).fundedAmount) / 1e7;
if (funded < 3) bad(`the contract recorded ${funded} USDC`);
else ok(`funded by the wallet · ${funded.toFixed(4)} USDC on the invoice`);

console.log(
  process.exitCode
    ? `\n${R}${B}✕ the chain of signatures is broken${O}`
    : `\n${G}${B}✅ register, acknowledge, lock and fund — every one signed by the wallet${O}`,
);
