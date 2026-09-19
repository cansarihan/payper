import { randomBytes } from "node:crypto";

/**
 * Single-use login challenges.
 *
 * On globalThis for the same reason the session secret is: Next gives each
 * route handler its own module instance, so a Map declared at module level
 * would mean /api/auth/challenge and /api/auth/wallet never see the same
 * nonces — and every valid signature would be rejected.
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

/**
 * Human-readable on purpose.
 *
 * The wallet shows this text to the person signing, so it has to say plainly
 * that nothing moves — otherwise "approve this signature" is a prompt to trust
 * something unreadable.
 */
export function challengeMessage(address: string, nonce: string): string {
  return [
    "Payper giriş doğrulaması",
    "",
    `Adres: ${address}`,
    `Tek kullanımlık kod: ${nonce}`,
    `Zaman: ${new Date().toISOString()}`,
    "",
    "Bu imza yalnızca cüzdanın sahibi olduğunu kanıtlar.",
    "Hiçbir varlık transfer edilmez, hiçbir işlem yetkilendirilmez.",
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

/** Reading a challenge consumes it, so a signature cannot be replayed. */
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
