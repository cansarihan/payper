/**
 * A buyer who brought their own wallet, acknowledging for themselves.
 *
 * The contract lets only the address written on the invoice acknowledge it, so
 * this registers one that names a fresh wallet as the buyer and then has that
 * wallet sign the acknowledgement. Without the naming step the same call is
 * refused — which is the lock working, and is asserted here too.
 */
import { config as loadEnv } from "dotenv";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { createHash, randomUUID } from "node:crypto";

loadEnv({ path: ".env.local", quiet: true });

const BASE = process.env.TEST_BASE ?? "http://localhost:3100";
const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", O = "\x1b[0m";
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const bad = (s: string) => { console.log(`   ${R}✕${O} ${s}`); process.exitCode = 1; };
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const { signSep53 } = await import("../src/lib/auth/sep53");
const inv = await import("../src/lib/server/invoices");
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

console.log(`${B}A buyer acknowledging with their own wallet${O}`);
dim(BASE);

const wallet = Keypair.random();
if (!(await fetch(`https://friendbot.stellar.org/?addr=${wallet.publicKey()}`)).ok) {
  bad("friendbot would not fund the account"); process.exit(1);
}
ok(`fresh wallet · ${wallet.publicKey().slice(0, 8)}…`);

// ── an invoice naming somebody else, to show the refusal is real ───────────
const other = randomUUID();
const otherId = (await inv.registerInvoice({
  ettnHashHex: sha(other), docHashHex: sha(`${other}:doc`),
  sellerTaxId: "s1234567890", buyerTaxId: "b0987654321",
  amountFiatMinor: 90_000n, faceUsdc: 18_0000000n,
  dueDate: Math.floor(Date.now() / 1000) + 40 * 86_400,
})).id;

// ── one that names this wallet ─────────────────────────────────────────────
const mine = randomUUID();
const mineId = (await inv.registerInvoice({
  ettnHashHex: sha(mine), docHashHex: sha(`${mine}:doc`),
  sellerTaxId: "s1234567890", buyerTaxId: "b0987654321",
  amountFiatMinor: 90_000n, faceUsdc: 18_0000000n,
  dueDate: Math.floor(Date.now() / 1000) + 40 * 86_400,
  buyerAddress: wallet.publicKey(),
})).id;
ok(`two invoices registered · #${otherId} names the demo buyer, #${mineId} names this wallet`);

// ── sign in as that wallet, acting as the buyer ─────────────────────────────
const ch = await call("/api/auth/challenge", { address: wallet.publicKey() });
const login = await call("/api/auth/wallet", {
  address: wallet.publicKey(), nonce: ch.nonce,
  signature: signSep53(wallet.secret(), ch.message).toString("base64"),
  payload: ch.message, role: "buyer", walletId: "test", walletName: "Fresh wallet",
});
if (!login.ok) { bad(`wallet login: ${login.error}`); process.exit(1); }
ok("signed in as a wallet, role buyer");

// ── the one naming somebody else must be refused ───────────────────────────
const refused = await call("/api/tx/prepare", { action: "acknowledge", invoiceId: otherId });
if (refused.ok) bad("a wallet was allowed to acknowledge an invoice naming another address");
else ok("the invoice naming the demo buyer is refused — the lock holds");
dim(refused.error);

// ── the one naming this wallet must go through, signed by it ───────────────
const prep = await call("/api/tx/prepare", { action: "acknowledge", invoiceId: mineId });
if (!prep.ok) { bad(`prepare: ${prep.error}`); process.exit(1); }
const tx = TransactionBuilder.fromXDR(prep.xdr, passphrase);
if (tx.signatures.length !== 0) bad("the server handed over a signed envelope");
else ok("the envelope arrived unsigned");
tx.sign(wallet);
const sent = await call("/api/tx/submit", { signedXdr: tx.toXDR(), method: "acknowledge" });
if (!sent.ok) { bad(`submit: ${sent.error}`); process.exit(1); }
ok(`acknowledged by the wallet's own signature · ${sent.hash.slice(0, 16)}…`);

const status = (await inv.getInvoice(mineId)).status;
if (status !== "acknowledged") bad(`the contract says ${status}`);
else ok("the contract records it as acknowledged");

console.log(
  process.exitCode
    ? `\n${R}${B}✕ a wallet buyer cannot acknowledge${O}`
    : `\n${G}${B}✅ only the named wallet could acknowledge, and it signed it itself${O}`,
);
