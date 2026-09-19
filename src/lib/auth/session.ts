import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { Session } from "./roles";

export type { AuthMethod, LinkedWallet, Session, SessionRole } from "./roles";

const COOKIE = "payper_session";
const MAX_AGE = 12 * 60 * 60;

/**
 * The key the session cookie is signed with.
 *
 * On globalThis because Next bundles route handlers separately — a module-level
 * constant would give each route its own secret, and every cookie issued by one
 * would be rejected by the next. Unset in the environment it is random per
 * process, so a restart signs everyone out; a deployment must pin it.
 */
declare global {
  // eslint-disable-next-line no-var
  var __payperSessionSecret: Buffer | undefined;
}

function secret(): Buffer {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return Buffer.from(fromEnv, "utf8");
  globalThis.__payperSessionSecret ??= randomBytes(32);
  return globalThis.__payperSessionSecret;
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

export function serializeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(sign(payload), "utf8");
  const given = Buffer.from(mac, "utf8");
  // Length-check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and a forged cookie is a mismatch.
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (Date.now() - session.issuedAt > MAX_AGE * 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  return parseSession((await cookies()).get(COOKIE)?.value);
}

export async function writeSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE, serializeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
