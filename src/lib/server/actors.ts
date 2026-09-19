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
 * Demo signing keys, server-held so one machine can play four parties.
 *
 * From the environment in a deployment, from the local Stellar CLI otherwise.
 */
export function keypair(actor: Actor): Keypair {
  const hit = cache.get(actor);
  if (hit) return hit;

  const fromEnv = process.env[ENV_NAME[actor]];
  const secret = fromEnv?.trim() || readFromCli(actor);
  if (!secret) {
    throw new Error(
      `no key for ${actor}: set ${ENV_NAME[actor]} or run \`stellar keys generate ${CLI_NAME[actor]}\``,
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
