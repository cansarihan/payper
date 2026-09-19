import { NextRequest } from "next/server";
import { Asset, Horizon } from "@stellar/stellar-sdk";

import { AnchorClient } from "@/lib/anchor/client";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** What an address actually holds, read from Horizon rather than assumed. */
export async function GET(req: NextRequest) {
  try {
    const address = new URL(req.url).searchParams.get("address");
    if (!address || !/^G[A-Z2-7]{55}$/.test(address)) {
      return fail(new Error("Geçerli bir adres gerekiyor"), 422);
    }
    const anchor = await AnchorClient.create({ log: () => {} });
    const horizon = new Horizon.Server(
      process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    );
    const usdc = new Asset(anchor.config.assetCode, anchor.config.assetIssuer);

    try {
      const account = await horizon.loadAccount(address);
      const native = account.balances.find((b) => b.asset_type === "native");
      const asset = account.balances.find(
        (b) => "asset_code" in b && b.asset_code === usdc.code && b.asset_issuer === usdc.issuer,
      );
      return ok({
        address,
        funded: true,
        xlm: native?.balance ?? "0",
        asset: {
          code: usdc.code,
          issuer: usdc.issuer,
          balance: asset?.balance ?? "0",
          trustline: !!asset,
        },
      });
    } catch {
      return ok({ address, funded: false, xlm: "0", asset: { code: usdc.code, issuer: usdc.issuer, balance: "0", trustline: false } });
    }
  } catch (e) {
    return fail(e);
  }
}
