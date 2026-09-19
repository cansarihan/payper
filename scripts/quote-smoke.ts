/**
 * The whole flow against testnet, in one pass.
 *
 * Proves the deployed contracts do what the unit tests say they do — including
 * the refusal at the end, which is the part worth watching: the same ETTN
 * cannot be financed twice.
 */
import { config as loadEnv } from "dotenv";
import { Asset, Horizon, Keypair, Operation, TransactionBuilder, Networks, BASE_FEE } from "@stellar/stellar-sdk";
import { createHash, randomUUID } from "node:crypto";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const { address, keypair } = await import("../src/lib/server/actors");
const inv = await import("../src/lib/server/invoices");

const B = "\x1b[1m", G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", O = "\x1b[0m";
let step = 0;
const head = (s: string) => console.log(`\n${B}━━ ${++step}. ${s}${O}`);
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const bad = (s: string) => console.log(`   ${R}✕${O} ${s}`);
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const USDC = 10_000_000n;
const FIAT = 100n;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Every party needs a USDC trustline before any of this works. */
async function ensureTrustlines() {
  const horizon = new Horizon.Server(
    process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  );
  const usdc = new Asset(
    process.env.PUBLIC_ANCHOR_ASSET_CODE ?? "USDC",
    process.env.PUBLIC_USDC_ISSUER!,
  );
  for (const actor of ["admin", "seller", "buyer", "funder", "funderB"] as const) {
    const kp = keypair(actor);
    const account = await horizon.loadAccount(kp.publicKey());
    const has = account.balances.some(
      (b) => "asset_code" in b && b.asset_code === usdc.code && b.asset_issuer === usdc.issuer,
    );
    if (has) continue;
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(60)
      .build();
    tx.sign(kp);
    await horizon.submitTransaction(tx);
    dim(`${actor} trustline açıldı`);
  }
}

/**
 * Buy USDC through the anchor when an account is short.
 *
 * Nobody here starts with a balance: a funder buys the asset with lira over
 * SEP-6 exactly as a buyer settles at maturity, so the fiat rail is exercised
 * by the flow rather than assumed around it.
 */
async function topUp(actor: "seller" | "buyer" | "funder" | "funderB" | "admin", need: number) {
  const { AnchorClient } = await import("../src/lib/anchor/client");
  const { balanceOf, depositFromBank, fetchLimits } = await import("../src/lib/anchor/settle");
  const { Asset: A, Horizon: H } = await import("@stellar/stellar-sdk");

  const kp = keypair(actor);
  const anchor = await AnchorClient.create({ log: () => {} });
  const horizon = new H.Server(
    process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  );
  const usdc = new A(anchor.config.assetCode, anchor.config.assetIssuer);
  const have = await balanceOf(horizon, kp.publicKey(), usdc);
  if (have >= need) return;

  const health = await anchor.health();
  const rate = Number(health?.rates?.buy_rate ?? 0) || 49;
  const limits = await fetchLimits(anchor);
  const fiat = Math.max(limits.minFiat, Math.ceil((need - have) * rate * 1.03));

  const jwt = await anchor.authenticate(kp);
  await anchor.ensureCustomer(jwt, kp.publicKey());
  const legs = await depositFromBank({
    anchor, signer: kp, jwt, account: kp.publicKey(), amountFiat: fiat, limits,
  });
  dim(
    `${actor}: ${fiat.toFixed(2)} ₺ → ${legs.reduce((s, l) => s + Number(l.amountOut), 0).toFixed(7)} USDC ` +
      `(SEP-6, ${legs.length} tranş)`,
  );
}

async function main() {
  console.log(`${B}Payper · zincir akışı${O}`);
  dim(`fatura kontratı ${process.env.PUBLIC_INVOICE_CONTRACT_ID}`);

  await ensureTrustlines();

  const ettn = randomUUID();
  const ettnHash = sha(ettn);
  const docHash = sha(`belge:${ettn}`);
  const due = Math.floor(Date.now() / 1000) + 90 * 86_400;

  head("Fatura kaydediliyor");
  dim(`ETTN ${ettn}`);
  const before = await inv.isEttnAvailable(ettnHash);
  const { id, hash } = await inv.registerInvoice({
    ettnHashHex: ettnHash,
    docHashHex: docHash,
    sellerTaxId: "s1234567890",
    buyerTaxId: "b0987654321",
    amountFiatMinor: 2_940n * FIAT,
    faceUsdc: 60n * USDC,
    dueDate: due,
  });
  ok(`register() → fatura #${id} · tx ${hash.slice(0, 10)}…`);
  dim(`ETTN kayıttan önce boştaydı: ${before}`);

  head("Alıcı onaylıyor");
  await inv.acknowledge(id);
  ok(`acknowledge() · durum ${(await inv.getInvoice(id)).status}`);

  head("Canlı iskonto okunuyor");
  const q = await inv.quote(id);
  const annual = ((q.totalDiscountBps * 365) / q.days / 100).toFixed(1);
  ok(`toplam %${(q.totalDiscountBps / 100).toFixed(2)} · yıllık ~%${annual}`);
  dim(
    `APY ${q.yieldBps} bps (${q.yieldSource}) · FX ${q.fxRiskBps} bps (${q.fxSource}, ` +
      `${q.fxWindowDays} gün pencere, drift ${q.fxDriftBps}, aralık ${q.fxRangeBps}) · ` +
      `kredi ${q.creditPremiumBps} · ücret ${q.platformFeeBps}`,
  );
  if (q.yieldSource !== "live" || q.fxSource !== "live") {
    bad("iki bileşen de zincirden okunmalıydı");
    process.exit(1);
  }
  const accepted = await inv.acceptQuote(id);
  ok(`accept_quote() · %${(accepted.quote.totalDiscountBps / 100).toFixed(2)} kilitlendi`);
  dim(`KOBİ alır ${(Number(accepted.quote.payoutFiat) / 100).toFixed(2)} ₺`);

  head("Fonlanıyor");
  const payout = BigInt(accepted.quote.payoutUsdc);
  const half = payout / 2n;
  for (const [actor, amount] of [["funder", half], ["funderB", payout - half]] as const) {
    await topUp(actor, Number(amount) / 1e7);
    await inv.setWhitelist(address(actor), true);
    await inv.fund(id, actor, amount);
    ok(`${actor} → ${(Number(amount) / 1e7).toFixed(7)} USDC · durum ${(await inv.getInvoice(id)).status}`);
  }

  head("Vadede alıcı ödüyor");
  await topUp("buyer", 60);
  await inv.repay(id);
  ok(`repay() · durum ${(await inv.getInvoice(id)).status}`);
  const paid = await inv.funders(id);
  dim(`${paid.length} fonlayıcıya oransal dağıtıldı`);

  head("Aynı ETTN tekrar deneniyor");
  try {
    await inv.registerInvoice({
      ettnHashHex: ettnHash,
      docHashHex: sha("başka bir belge"),
      sellerTaxId: "s1234567890",
      buyerTaxId: "b0987654321",
      amountFiatMinor: 5_000n * FIAT,
      faceUsdc: 99n * USDC,
      dueDate: due,
    });
    bad("REDDEDİLMEDİ — değişmez kırıldı");
    process.exit(1);
  } catch (e) {
    const { contractErrorName, ERROR_MESSAGES } = await import("../src/lib/soroban/client");
    const name = contractErrorName((e as Error).message);
    if (name !== "EttnAlreadyUsed") {
      bad(`beklenmeyen hata: ${(e as Error).message.slice(0, 80)}`);
      process.exit(1);
    }
    console.log(`   ${R}✕${O} REDDEDİLDİ · ${name}`);
    dim(ERROR_MESSAGES[name]!);
    dim(`bu ETTN fatura #${await inv.invoiceByEttn(ettnHash)} tarafından tutuluyor`);
  }

  console.log(`\n${G}${B}✅ Zincir akışı baştan sona çalıştı${O}`);
}

void main().catch((e) => {
  console.error(`\n${R}✕${O} ${(e as Error).message}`);
  process.exit(1);
});
