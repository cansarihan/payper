import { readSession } from "@/lib/auth/session";
import { ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ session: await readSession(), demoLogin: process.env.DEMO_LOGIN !== "off" });
}
