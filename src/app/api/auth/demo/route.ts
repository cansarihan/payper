import { NextRequest } from "next/server";

import type { SessionRole } from "@/lib/auth/roles";
import { writeSession } from "@/lib/auth/session";
import { address } from "@/lib/server/actors";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Sign in as one of the demo parties, without a wallet.
 *
 * On stage there is one laptop and three roles to play, and asking a jury to
 * watch three wallet handshakes is worse than showing the product. This path is
 * explicit about what it is — the session records `method: "demo"`, the
 * interface says so, and `DEMO_LOGIN=off` removes it.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "demo-login"), 20, 60_000);
    if (process.env.DEMO_LOGIN === "off") {
      return fail(new Error("Demo girişi kapalı"), 403);
    }
    const { role, name } = (await req.json()) as { role?: SessionRole; name?: string };
    const chosen: SessionRole =
      role === "seller" || role === "buyer" || role === "funder" ? role : "seller";
    const actor = chosen === "seller" ? "seller" : chosen === "buyer" ? "buyer" : "funder";

    const session = {
      address: address(actor),
      name: displayName(name),
      role: chosen,
      method: "demo" as const,
      issuedAt: Date.now(),
    };
    await writeSession(session);
    return ok({ session });
  } catch (e) {
    return fail(e);
  }
}

function displayName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 48);
  return name.length >= 2 ? name : undefined;
}
