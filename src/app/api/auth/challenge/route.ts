import { NextRequest } from "next/server";

import { issueChallenge } from "@/lib/auth/challenge";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "challenge"), 20, 60_000);
    const { address } = (await req.json()) as { address?: string };
    if (!address || !/^G[A-Z2-7]{55}$/.test(address)) {
      return fail(new Error("A valid Stellar address is required"), 422);
    }
    const challenge = issueChallenge(address);
    return ok({ nonce: challenge.nonce, message: challenge.message });
  } catch (e) {
    return fail(e);
  }
}
