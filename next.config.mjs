import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const srcAlias = resolve(root, "src");

/** @type {import('next').NextConfig} */
const config = {
  // A self-contained server bundle for the container; only for the image build,
  // because `next start` refuses to serve a standalone build and the README
  // hands that command to judges.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,

  // The SEP and Soroban clients run in route handlers, where they need node
  // built-ins; keeping the Stellar SDK external avoids bundling it.
  serverExternalPackages: ["@stellar/stellar-sdk"],

  // Declared here rather than inherited from tsconfig: this project is on
  // TypeScript 7, which dropped `baseUrl`, and Next derives its webpack alias
  // from that field.
  webpack: (cfg) => {
    cfg.resolve.alias = { ...cfg.resolve.alias, "@": srcAlias };
    return cfg;
  },
  turbopack: { resolveAlias: { "@/*": "./src/*" } },

  env: {
    PUBLIC_INVOICE_CONTRACT_ID: process.env.PUBLIC_INVOICE_CONTRACT_ID ?? "",
    PUBLIC_TREASURY_CONTRACT_ID: process.env.PUBLIC_TREASURY_CONTRACT_ID ?? "",
    PUBLIC_FX_ORACLE_CONTRACT_ID: process.env.PUBLIC_FX_ORACLE_CONTRACT_ID ?? "",
    PUBLIC_ANCHOR_HOME_DOMAIN: process.env.PUBLIC_ANCHOR_HOME_DOMAIN ?? "",
    PUBLIC_TREASURY_MODE: process.env.PUBLIC_TREASURY_MODE ?? "local",
    PUBLIC_STELLAR_NETWORK: process.env.PUBLIC_STELLAR_NETWORK ?? "testnet",
  },
};

export default config;
