import { NextRequest } from "next/server";

import { clearBankAccount, getBankAccount, saveBankAccount } from "@/lib/bank";
import { signerAddress } from "@/lib/auth/roles";
import { clientKey, rateLimit, requireSession } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Where an off-ramp actually lands.
 *
 * Keyed by the address of the session that owns it, so one party cannot read
 * or overwrite another's payout destination. The IBAN is checked with its own
 * checksum before it is stored: a mistyped digit in an account number that
 * only looked right is how money reaches a stranger.
 */
export async function GET() {
  try {
    const session = await requireSession();
    return ok({ account: getBankAccount(signerAddress(session)) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "bank"), 20, 60_000);
    const session = await requireSession();
    const body = (await req.json()) as { iban?: string; holder?: string; bankName?: string };
    if (!body.iban || !body.holder) {
      return fail(new Error("An IBAN and an account holder are required"), 422);
    }
    const account = saveBankAccount(signerAddress(session), {
      iban: body.iban,
      holder: body.holder,
      bankName: body.bankName,
    });
    return ok({ account });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    clearBankAccount(signerAddress(session));
    return ok({ account: null });
  } catch (e) {
    return fail(e);
  }
}
