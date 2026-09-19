/**
 * SEP-1 discovery.
 *
 * Every endpoint this product talks to is read from the anchor's own
 * stellar.toml at runtime. Nothing is hard-coded, which is the whole point:
 * pointing at a different anchor is one environment variable, not a code
 * change — so when a real TRY anchor appears, the product follows it.
 */
export interface AnchorConfig {
  homeDomain: string;
  webAuthEndpoint: string;
  transferServer: string;
  kycServer: string | null;
  quoteServer: string | null;
  signingKey: string;
  assetCode: string;
  assetIssuer: string;
  fiatAsset: string;
  fiatAssetCode: string;
}

export class AnchorConfigError extends Error {}

interface Cached {
  at: number;
  config: AnchorConfig;
}
const cache = new Map<string, Cached>();
const TTL = 5 * 60_000;

export async function discover(opts?: {
  homeDomain?: string;
  assetCode?: string;
  fiatAssetCode?: string;
}): Promise<AnchorConfig> {
  const homeDomain =
    opts?.homeDomain ?? process.env.PUBLIC_ANCHOR_HOME_DOMAIN ?? "tr-mock-anchor.fly.dev";
  const assetCode = opts?.assetCode ?? process.env.PUBLIC_ANCHOR_ASSET_CODE ?? "USDC";
  const fiatAssetCode = opts?.fiatAssetCode ?? process.env.PUBLIC_FIAT_ASSET_CODE ?? "TRY";

  const key = `${homeDomain}|${assetCode}|${fiatAssetCode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.config;

  const url = `https://${homeDomain}/.well-known/stellar.toml`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new AnchorConfigError(`stellar.toml could not be read: ${url} → HTTP ${res.status}`);
  const toml = await res.text();

  const scalar = (name: string) =>
    new RegExp(`^\\s*${name}\\s*=\\s*"([^"]+)"`, "m").exec(toml)?.[1] ?? null;

  const webAuthEndpoint = scalar("WEB_AUTH_ENDPOINT");
  const transferServer = scalar("TRANSFER_SERVER_SEP0024") ?? scalar("TRANSFER_SERVER");
  const signingKey = scalar("SIGNING_KEY");
  if (!webAuthEndpoint || !transferServer || !signingKey) {
    throw new AnchorConfigError(
      `stellar.toml is missing a field (WEB_AUTH_ENDPOINT / TRANSFER_SERVER / SIGNING_KEY): ${url}`,
    );
  }

  // The issuer is read from the asset table rather than assumed, so the code
  // and issuer always belong together.
  const issuer =
    new RegExp(`code\\s*=\\s*"${assetCode}"[\\s\\S]*?issuer\\s*=\\s*"(G[A-Z2-7]{55})"`).exec(
      toml,
    )?.[1] ??
    new RegExp(`issuer\\s*=\\s*"(G[A-Z2-7]{55})"[\\s\\S]*?code\\s*=\\s*"${assetCode}"`).exec(
      toml,
    )?.[1] ??
    process.env.PUBLIC_USDC_ISSUER ??
    null;
  if (!issuer) {
    throw new AnchorConfigError(`${assetCode} issuer was not found in stellar.toml: ${url}`);
  }

  const config: AnchorConfig = {
    homeDomain,
    webAuthEndpoint,
    transferServer: transferServer.replace(/\/$/, ""),
    kycServer: scalar("KYC_SERVER"),
    quoteServer: scalar("ANCHOR_QUOTE_SERVER"),
    signingKey,
    assetCode,
    assetIssuer: issuer,
    fiatAsset: `iso4217:${fiatAssetCode}`,
    fiatAssetCode,
  };
  cache.set(key, { at: Date.now(), config });
  return config;
}
