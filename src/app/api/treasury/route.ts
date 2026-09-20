import { Address } from "@stellar/stellar-sdk";

import { read } from "@/lib/soroban/client";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFINDEX_MANIFEST =
  "https://raw.githubusercontent.com/paltalabs/defindex/main/public/testnet.contracts.json";

/**
 * Everything the treasury screen shows, read rather than configured.
 *
 * The hash comparison is the part worth putting on a page: a vault claiming to
 * be a DeFindex vault while running different code would fail it, and a reader
 * can repeat the same two reads themselves.
 */
export async function GET(req: Request) {
  try {
    rateLimit(clientKey(req, "treasury"), 40, 60_000);

    const vault = process.env.PUBLIC_DEFINDEX_VAULT_ID ?? "";
    const adapter = process.env.PUBLIC_TREASURY_CONTRACT_ID ?? "";
    const invoice = process.env.PUBLIC_INVOICE_CONTRACT_ID ?? "";
    const network = process.env.PUBLIC_STELLAR_NETWORK ?? "testnet";
    const explorer = `https://api.stellar.expert/explorer/${network}/contract`;

    const maybe = async <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
    const shares = vault && adapter
      ? await maybe(read<bigint>(vault, "balance", [new Address(adapter).toScVal()]))
      : null;

    const [name, symbol, decimals, supply, deployed, published, blendBps, apy] = await Promise.all([
      vault ? maybe(read<string>(vault, "name", [])) : null,
      vault ? maybe(read<string>(vault, "symbol", [])) : null,
      vault ? maybe(read<number>(vault, "decimals", [])) : null,
      vault ? maybe(read<bigint>(vault, "total_supply", [])) : null,
      vault
        ? maybe(
            fetch(`${explorer}/${vault}`, { cache: "no-store" })
              .then((r) => r.json())
              .then((j: { wasm?: string }) => j.wasm ?? null),
          )
        : null,
      maybe(
        fetch(DEFINDEX_MANIFEST, { cache: "no-store" })
          .then((r) => r.json())
          .then((j: { hashes?: Record<string, string> }) => j.hashes?.defindex_vault ?? null),
      ),
      adapter ? maybe(read<number | null>(adapter, "blend_apy_bps", [])) : null,
      invoice ? maybe(read<[number, number]>(invoice, "treasury_apy_bps", [])) : null,
    ]);

    return ok({
      network,
      vault: {
        id: vault,
        name,
        symbol,
        decimals,
        totalSupply: supply != null ? String(supply) : null,
        ourShares: shares != null ? String(shares) : null,
      },
      adapter: { id: adapter },
      blend: {
        pool: process.env.PUBLIC_BLEND_POOL_ID ?? "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
        bps: blendBps ?? null,
      },
      yield: apy ? { bps: apy[0], source: apy[1] === 0 ? "live" : apy[1] === 1 ? "fallback" : "param" } : null,
      proof: {
        deployedWasm: deployed,
        publishedWasm: published,
        matches: Boolean(deployed && published && deployed === published),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
