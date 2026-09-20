import { NextRequest, NextResponse } from "next/server";

/**
 * One line per API call, on stdout.
 *
 * Next.js logs nothing in production, so a terminal watching the service showed
 * only its own restarts — which made it useless for watching the product work.
 * This prints what was asked and how long the answer took, so `journalctl -fu
 * payper` reads as a live trace of the flow rather than silence.
 *
 * Bodies are never logged: they carry session cookies, signed envelopes and
 * invoice contents.
 */
export function middleware(req: NextRequest) {
  const started = Date.now();
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  res.headers.set("x-payper-t0", String(started));

  // The response is streamed past this point, so the arrival is what is logged
  // here and the duration is left to the route that answers it.
  console.log(`→ ${req.method} ${pathname}`);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
