import { ROLE_LABEL, type Session, type SessionRole } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";

/**
 * Access control for routes that sign with server-held keys.
 *
 * These throw; `fail()` maps them to a status.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Role the caller would need. */
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

/** Require a session in one of the roles that owns the action. */
export async function requireRole(...roles: SessionRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    // Name the party, not the enum.
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
 * Platform operations. Token required in production; unset, they refuse rather
 * than fall open.
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

/** Fixed-window counter, in process memory. */
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

/** Rate-limit key: proxy client address, else the peer. */
export const clientKey = (req: Request, scope: string) =>
  `${scope}:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
