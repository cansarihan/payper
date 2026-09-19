import { randomBytes } from "node:crypto";

/**
 * Single-use login challenges.
 *
 * On globalThis because Next gives each route handler its own module instance;
 * a module-level Map would not be shared between issue and verify.
 */
export interface Challenge {
  nonce: string;
  address: string;
  message: string;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __payperChallenges: Map<string, Challenge> | undefined;
}
const store: Map<string, Challenge> = (globalThis.__payperChallenges ??= new Map());

const TTL = 5 * 60_000;

/** Shown verbatim by the wallet, so it states plainly that nothing moves. */
export function challengeMessage(address: string, nonce: string): string {
  return [
    "Payper sign-in verification",
    "",
    `Adres: ${address}`,
    `Tek kullanımlık kod: ${nonce}`,
    `Zaman: ${new Date().toISOString()}`,
    "",
    "This signature only proves that you own the wallet.",
    "No asset is transferred and no transaction is authorised.",
  ].join("\n");
}

export function issueChallenge(address: string): Challenge {
  sweep();
  const nonce = randomBytes(16).toString("hex");
  const challenge: Challenge = {
    nonce,
    address,
    message: challengeMessage(address, nonce),
    createdAt: Date.now(),
  };
  store.set(nonce, challenge);
  return challenge;
}

/** Consumes the challenge; signatures cannot be replayed. */
export function consumeChallenge(nonce: string): Challenge | null {
  sweep();
  const hit = store.get(nonce);
  if (!hit) return null;
  store.delete(nonce);
  return hit;
}

function sweep() {
  const cutoff = Date.now() - TTL;
  for (const [nonce, c] of store) if (c.createdAt < cutoff) store.delete(nonce);
}
