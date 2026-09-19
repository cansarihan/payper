/**
 * Puts a spread of invoices on the deployed contract, one per state.
 *
 * A freshly deployed contract has nothing in it, and an empty dashboard says
 * nothing about whether the product works. This writes real transactions —
 * the same calls the panel makes — so every row on screen is backed by the
 * chain rather than by a fixture.
 */
import { config as loadEnv } from "dotenv";
import { createHash, randomUUID } from "node:crypto";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const { address, keypair } = await import("../src/lib/server/actors");
const inv = await import("../src/lib/server/invoices");

const B = "\x1b[1m", G = "\x1b[32m", D = "\x1b[2m", O = "\x1b[0m";
const ok = (s: string) => console.log(`   ${G}✓${O} ${s}`);
const dim = (s: string) => console.log(`     ${D}${s}${O}`);

const USDC = 10_000_000n;
const FIAT = 100n;
const DAY = 86_400;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

type Target = "registered" | "acknowledged" | "funded" | "repaid";

const PLAN: { buyer: string; fiat: bigint; face: bigint; days: number; to: Target }[] = [
  { buyer: "b0987654321", fiat: 4_180n, face: 86n, days: 74, to: "registered" },
  { buyer: "b7712340098", fiat: 2_260n, face: 46n, days: 51, to: "registered" },
  { buyer: "b4455660011", fiat: 6_940n, face: 142n, days: 96, to: "acknowledged" },
  { buyer: "b3399220077", fiat: 1_580n, face: 32n, days: 38, to: "acknowledged" },
  { buyer: "b8801234455", fiat: 3_720n, face: 76n, days: 62, to: "funded" },
  { buyer: "b2088776611", fiat: 5_310n, face: 108n, days: 83, to: "registered" },
  { buyer: "b6677889900", fiat: 2_870n, face: 58n, days: 45, to: "acknowledged" },
];


/** Buy USDC through the anchor when an actor is short. Same path the panel uses. */
async function topUp(actor: "funder" | "funderB" | "admin", need: number) {
  const { AnchorClient } = await import("../src/lib/anchor/client");
  const { balanceOf, depositFromBank, fetchLimits } = await import("../src/lib/anchor/settle");
  const { Asset, Horizon } = await import("@stellar/stellar-sdk");

  const kp = keypair(actor);
  const anchor = await AnchorClient.create({ log: () => {} });
  const horizon = new Horizon.Server(
    process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  );
  const have = await balanceOf(
    horizon,
    kp.publicKey(),
    new Asset(anchor.config.assetCode, anchor.config.assetIssuer),
  );
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
  dim(`${actor}: ${fiat.toFixed(2)} ₺ → ${legs.reduce((s, l) => s + Number(l.amountOut), 0).toFixed(7)} USDC`);
}

const now = Math.floor(Date.now() / 1000);

for (const spec of PLAN) {
  const ettn = randomUUID();
  const { id } = await inv.registerInvoice({
    ettnHashHex: sha(ettn),
    docHashHex: sha(`${ettn}:doc`),
    sellerTaxId: "s1234567890",
    buyerTaxId: spec.buyer,
    amountFiatMinor: spec.fiat * FIAT,
    faceUsdc: spec.face * USDC,
    dueDate: now + spec.days * DAY,
  });
  let state = "registered";

  if (spec.to !== "registered") {
    await inv.acknowledge(id);
    state = "acknowledged";
  }

  if (spec.to === "funded" || spec.to === "repaid") {
    const accepted = await inv.acceptQuote(id);
    const payout = BigInt(accepted.quote.payoutUsdc);
    const half = payout / 2n;
    for (const [actor, amount] of [["funder", half], ["funderB", payout - half]] as const) {
      await inv.setWhitelist(address(actor), true);
      await inv.fund(id, actor, amount);
    }
    state = "funded";
  }

  ok(`#${String(id).padStart(4, "0")}  ${spec.buyer}  ${spec.fiat} ₺  →  ${state}`);
  dim(`ETTN ${ettn}`);
}

// A buffer the recourse waterfall can actually draw on, and one invoice left
// mid-raise so the treasury is holding capital rather than passing it through.
console.log(`\n${B}Hazine${O}`);
await topUp("admin", 4);
await inv.depositFirstLoss(3n * USDC);
ok("ilk zarar tamponu 3.00 USDC yatırıldı");

const open = (await inv.listInvoices()).find((i) => i.status === "acknowledged");
if (open) {
  const accepted = await inv.acceptQuote(open.id);
  const part = BigInt(accepted.quote.payoutUsdc) / 3n;
  await topUp("funder", Number(part) / 1e7 + 1);
  await inv.setWhitelist(address("funder"), true);
  await inv.fund(open.id, "funder", part);
  ok(`#${String(open.id).padStart(4, "0")} kısmen fonlandı · ${(Number(part) / 1e7).toFixed(2)} USDC hazinede duruyor`);
}

const t = await inv.treasurySnapshot();
dim(`varlık ${(Number(t.assets) / 1e7).toFixed(2)} USDC · ilk zarar ${(Number(t.firstLoss) / 1e7).toFixed(2)} USDC · APY ${t.apyBps} bps (${t.apySource})`);
console.log(`\n${G}${B}✅ Demo verisi zincire yazıldı${O}`);
