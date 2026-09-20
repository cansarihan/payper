import { NextResponse } from "next/server";

import { contractErrorName, ERROR_MESSAGES } from "@/lib/soroban/client";

/**
 * Map a thrown error to a response.
 *
 * `detail` carries the raw host string in development and is withheld in
 * production, where it would expose accounts and contract ids.
 */
export function fail(e: unknown, status = 400) {
  const message = e instanceof Error ? e.message : String(e);
  const auth =
    e instanceof Error && e.name === "AuthError"
      ? (e as Error & { status?: number; needsRole?: string })
      : undefined;
  const code = contractErrorName(message);

  console.log(`  refused · ${code ?? "error"} · ${message.slice(0, 120)}`);

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

export const ok = <T extends object>(body: T) => {
  // A one-line outcome next to the arrival logged by the middleware. Keys only,
  // never values: a body here would put signed envelopes and invoice contents
  // into the journal.
  const keys = Object.keys(body).slice(0, 6).join(" ");
  console.log(`  ok${keys ? ` · ${keys}` : ""}`);
  return json({ ok: true, ...body });
};

/** JSON with bigint support; chain amounts serialise as decimal strings. */
export function json(body: unknown, init?: ResponseInit) {
  return new NextResponse(
    JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      ...init,
      headers: { "content-type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
    },
  );
}
