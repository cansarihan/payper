import { NextRequest } from "next/server";

import { asRole } from "@/lib/auth/roles";
import { readSession, writeSession } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Change which party you are acting as, without changing who you are.
 *
 * The role switcher used to post to the demo sign-in, which replaced the whole
 * session — so a wallet user who wanted to act as the buyer silently became a
 * demo user, and their next transaction was signed by a key this server holds
 * rather than by their wallet. This keeps the method, the address and the linked
 * wallet, and moves only the role.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "auth-role"), 30, 60_000);
    const session = await readSession();
    if (!session) return fail(new Error("Sign in first"), 401);

    const { role } = (await req.json()) as { role?: string };
    const next = { ...session, role: asRole(role), issuedAt: Date.now() };
    await writeSession(next);
    return ok({ session: next });
  } catch (e) {
    return fail(e);
  }
}
