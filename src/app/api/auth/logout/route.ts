import { clearSession } from "@/lib/auth/session";
import { ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();
  return ok({ signedOut: true });
}
