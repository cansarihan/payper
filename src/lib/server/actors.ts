import { Keypair } from "@stellar/stellar-sdk";
import { execFileSync } from "node:child_process";

export type Actor = "admin" | "seller" | "buyer" | "funder" | "funderB";

const ENV_NAME: Record<Actor, string> = {
  admin: "ADMIN_SECRET",
  seller: "SME_SECRET",
  buyer: "BUYER_SECRET",
  funder: "FUNDER_SECRET",
  funderB: "FUNDER_B_SECRET",
};

const CLI_NAME: Record<Actor, string> = {
  admin: "payper-admin",
  seller: "payper-sme",
  buyer: "payper-buyer",
  funder: "payper-funder",
  funderB: "payper-funder-b",
};

const cache = new Map<Actor, Keypair>();

/**
 * The keys the demo signs with.
 *
 * One machine plays four parties on stage, so these are server-held. They come
 * from the environment in a deployment and from the local Stellar CLI during
 * development, which is where they were created — that way nothing has to be
 * pasted into a file that might get committed.
 */
export function keypair(actor: Actor): Keypair {
  const hit = cache.get(actor);
  if (hit) return hit;

  const fromEnv = process.env[ENV_NAME[actor]];
  const secret = fromEnv?.trim() || readFromCli(actor);
  if (!secret) {
    throw new Error(
      `${actor} için anahtar yok: ${ENV_NAME[actor]} tanımla ya da \`stellar keys generate ${CLI_NAME[actor]}\` çalıştır`,
    );
  }
  const kp = Keypair.fromSecret(secret);
  cache.set(actor, kp);
  return kp;
}

export const address = (actor: Actor): string => keypair(actor).publicKey();

function readFromCli(actor: Actor): string | null {
  try {
    return execFileSync("stellar", ["keys", "secret", CLI_NAME[actor]], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
