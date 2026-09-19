import { ROLE_LABEL, type Session, type SessionRole } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";

/**
 * Who may ask the server to sign.
 *
 * Every mutating route spends a key the server holds, so an unguarded route is
 * a faucet: anyone who can reach the deployment could register invoices, fund
 * with the funders' keys, or move platform capital. These guards are the
 * boundary; they throw, and `fail()` turns that into the right status.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The role the caller would need, so the interface can offer the way out. */
    readonly needsRole?: SessionRole,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) throw new AuthError("Bu işlem için giriş yapmalısın", 401);
  return session;
}

/**
 * A session in one of the roles the action belongs to.
 *
 * The role is not decoration: the buyer acknowledges, the seller accepts a
 * quote, a funder funds. Letting any signed-in party call any of them would let
 * a funder acknowledge an invoice on the buyer's behalf.
 */
export async function requireRole(...roles: SessionRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    // Name the parties, not the enum: "this step belongs to the buyer" is
    // something a first-time user can act on.
    const wanted = roles.map((r) => ROLE_LABEL[r]).join(" ya da ");
    throw new AuthError(
      `Bu adımı ${wanted} yapar. Şu an ${ROLE_LABEL[session.role]} olarak giriş yaptın.`,
      403,
      roles[0],
    );
  }
  return session;
}

/**
 * Platform operations — declaring a default, capitalising the buffer.
 *
 * Not user actions, so a user session is not enough. The token is mandatory in
 * production: unset, these refuse rather than fall open, because falling open
 * is how a demo deployment becomes someone's piggy bank.
 */
export function requireOperator(req: Request): void {
  const expected = process.env.PAYPER_OPERATOR_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new AuthError("PAYPER_OPERATOR_TOKEN tanımlı değil — platform işlemleri kapalı", 503);
    }
    return; // local development only
  }
  const got = req.headers.get("x-payper-operator") ?? "";
  if (got.length !== expected.length || !timingEqual(got, expected)) {
    throw new AuthError("Platform yetkisi gerekli", 403);
  }
}

const timingEqual = (a: string, b: string) => {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * A fixed-window counter, per key.
 *
 * One process, in memory — enough to stop a loop from minting a thousand
 * challenges or burning testnet keys, which is the actual exposure here.
 */
declare global {
  // eslint-disable-next-line no-var
  var __payperRate: Map<string, { count: number; resetAt: number }> | undefined;
}
const buckets = (globalThis.__payperRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || hit.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  hit.count += 1;
  if (hit.count > limit) {
    throw new AuthError(
      `Çok fazla istek — ${Math.ceil((hit.resetAt - now) / 1000)} saniye sonra tekrar dene`,
      429,
    );
  }
}

/** Caller identity for rate limiting: the proxy's client address, else the peer. */
export const clientKey = (req: Request, scope: string) =>
  `${scope}:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
