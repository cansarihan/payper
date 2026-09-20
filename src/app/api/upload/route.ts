import { NextRequest, NextResponse } from "next/server";

import { clientKey, rateLimit, requireRole } from "@/lib/server/guard";
import { invoiceByEttn, isEttnAvailable, registerInvoice } from "@/lib/server/invoices";
import { fail, ok } from "@/lib/server/respond";
import { parseUblInvoice, UblParseError } from "@/lib/ubl/parse";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Verify a UBL-TR invoice and, unless inspecting only, register it.
 *
 * The ETTN is checked here for a readable refusal and again in the contract,
 * which is the check that binds.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "upload"), 30, 60_000);
    const form = await req.formData();
    const file = form.get("file");
    const inspectOnly = form.get("inspect") === "1";
    // A wallet buyer asks to be named so they can acknowledge for themselves.
    const buyerIsWallet = form.get("buyerIsWallet") === "1";
    // Inspection writes nothing; only registration spends a key.
    const session = inspectOnly ? null : await requireRole("seller");
    if (buyerIsWallet && !session?.wallet) {
      throw new Error("Naming your wallet as the buyer needs a wallet session.");
    }

    if (!(file instanceof File)) return fail(new Error("No file was sent"), 422);
    if (file.size > 5 * 1024 * 1024) return fail(new Error("The file is larger than 5 MB"), 413);

    const bytes = Buffer.from(await file.arrayBuffer());

    let parsed;
    try {
      parsed = parseUblInvoice(bytes);
    } catch (e) {
      if (e instanceof UblParseError) {
        return NextResponse.json(
          { ok: false, stage: "parse", field: e.field ?? null, error: e.message },
          { status: 422 },
        );
      }
      throw e;
    }

    const available = await isEttnAvailable(parsed.ettnHash);
    const checks = [
      { key: "ubl", label: "UBL-TR structure", pass: true, detail: parsed.profileId ?? "UBL 2.1" },
      {
        key: "signature",
        label: "XAdES signature block",
        pass: parsed.signature.structurallyValid,
        detail: parsed.signature.notes.join(" · "),
      },
      { key: "hash", label: "Belge SHA-256", pass: true, detail: `${parsed.docHash.slice(0, 16)}…` },
      {
        key: "ettn",
        label: "ETTN uniqueness",
        pass: available,
        detail: available ? `${parsed.ettn} · daha önce kullanılmamış` : "ETTN already used",
      },
    ];

    if (!available) {
      return NextResponse.json(
        {
          ok: false,
          stage: "ettn",
          document: parsed,
          checks,
          heldBy: await invoiceByEttn(parsed.ettnHash),
          error: "This ETTN has already been financed. The same receivable cannot be sold twice.",
        },
        { status: 409 },
      );
    }

    if (inspectOnly) return ok({ document: parsed, checks, registered: null });

    const dueDate = Math.floor(Date.parse(parsed.dueDate) / 1000);
    // Face value in USDC at the anchor's current rate.
    const { AnchorClient } = await import("@/lib/anchor/client");
    const anchor = await AnchorClient.create({ log: () => {} });
    const health = await anchor.health();
    const rate = Number(health?.rates?.mid_rate ?? 0) || 48.7;
    const faceUsdc = BigInt(Math.round((Number(parsed.amountMinor) / 100 / rate) * 1e7));

    const { id, hash } = await registerInvoice({
      ettnHashHex: parsed.ettnHash,
      docHashHex: parsed.docHash,
      sellerTaxId: parsed.seller.taxId,
      buyerTaxId: parsed.buyer.taxId,
      amountFiatMinor: BigInt(parsed.amountMinor),
      faceUsdc,
      dueDate,
      // A buyer who signed in with their own wallet can be named here, and then
      // they are the only address the contract will accept an acknowledgement
      // from — including instead of the demo key this process holds.
      buyerAddress: buyerIsWallet ? session?.wallet?.address : undefined,
    });

    return ok({ document: parsed, checks, registered: { id, hash } });
  } catch (e) {
    return fail(e);
  }
}
