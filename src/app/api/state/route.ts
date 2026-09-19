import { AnchorClient } from "@/lib/anchor/client";
import { address } from "@/lib/server/actors";
import { config, funders, listInvoices, quote, treasurySnapshot } from "@/lib/server/invoices";
import { fail, json } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Everything the interface renders, in one round trip.
 *
 * The client holds no chain logic at all: it reads this and draws. The anchor
 * snapshot and the contract config depend on nothing else here, so they run
 * alongside the invoice scan rather than behind it.
 */
export async function GET() {
  try {
    const [invoices, treasury, anchor, cfg] = await Promise.all([
      listInvoices(),
      treasurySnapshot(),
      anchorSnapshot().catch(() => null),
      config().catch(() => null),
    ]);

    // The invoice the operator is most likely looking at: the furthest along
    // that still has something to do, else the newest.
    const priority: Record<string, number> = {
      acknowledged: 0,
      registered: 1,
      funded: 2,
      repaid: 3,
      defaulted: 4,
    };
    const active =
      [...invoices].sort((a, b) => priority[a.status]! - priority[b.status]! || b.id - a.id)[0] ??
      null;

    const [activeQuote, activeFunders] = await Promise.all([
      active ? quote(active.id).catch(() => null) : null,
      active ? funders(active.id).catch(() => []) : [],
    ]);

    return json({
      ok: true,
      network: process.env.PUBLIC_STELLAR_NETWORK ?? "testnet",
      contracts: {
        invoice: process.env.PUBLIC_INVOICE_CONTRACT_ID ?? "",
        treasury: process.env.PUBLIC_TREASURY_CONTRACT_ID ?? "",
        fxOracle: process.env.PUBLIC_FX_ORACLE_CONTRACT_ID ?? "",
      },
      actors: {
        seller: address("seller"),
        buyer: address("buyer"),
        funder: address("funder"),
        funderB: address("funderB"),
      },
      invoices,
      treasury,
      active,
      activeQuote,
      activeFunders,
      anchor,
      limits: {
        gracePeriodDays: Math.round(Number(cfg?.grace_period ?? 0) / 86_400),
        quoteTtlHours: Math.round(Number(cfg?.quote_ttl ?? 0) / 3600),
        whitelistThresholdUsdc: String(cfg?.whitelist_threshold ?? 0),
      },
    });
  } catch (e) {
    return fail(e, 500);
  }
}

async function anchorSnapshot() {
  const client = await AnchorClient.create({ log: () => {} });
  const health = await client.health();
  return {
    homeDomain: client.config.homeDomain,
    assetCode: client.config.assetCode,
    assetIssuer: client.config.assetIssuer,
    fiatAsset: client.config.fiatAsset,
    endpoints: {
      webAuth: client.config.webAuthEndpoint,
      transferServer: client.config.transferServer,
      kycServer: client.config.kycServer,
      quoteServer: client.config.quoteServer,
      signingKey: client.config.signingKey,
    },
    rates: health?.rates ?? null,
    limits: health?.limits ?? null,
    treasury: health?.treasury ?? null,
  };
}
