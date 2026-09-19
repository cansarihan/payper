import { NextResponse } from "next/server";

import { contractErrorName, ERROR_MESSAGES } from "@/lib/soroban/client";

/**
 * Turn a thrown error into something a user can read.
 *
 * Contract errors arrive as opaque host strings; the ones that matter get their
 * Turkish explanation. The raw message stays alongside for development and is
 * withheld in production, where it would name accounts and contract ids to any
 * caller.
 */
export function fail(e: unknown, status = 400) {
  const message = e instanceof Error ? e.message : String(e);
  const auth =
    e instanceof Error && e.name === "AuthError"
      ? (e as Error & { status?: number; needsRole?: string })
      : undefined;
  const code = contractErrorName(message);

  return NextResponse.json(
    {
      ok: false,
      code: code ?? null,
      error: code ? (ERROR_MESSAGES[code] ?? code) : message,
      needsRole: auth?.needsRole,
      detail: process.env.NODE_ENV === "production" ? undefined : message,
    },
    { status: auth?.status ?? (code === "EttnAlreadyUsed" ? 409 : status) },
  );
}

export const ok = <T extends object>(body: T) => json({ ok: true, ...body });

/**
 * JSON that survives chain data.
 *
 * Almost every amount here is an i128, which the SDK decodes to `bigint`, and
 * `JSON.stringify` throws on those rather than guessing. Decimal strings are
 * the guess we want: exact, and the interface formats them anyway.
 */
export function json(body: unknown, init?: ResponseInit) {
  return new NextResponse(
    JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      ...init,
      headers: { "content-type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
    },
  );
}
