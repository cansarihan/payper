import { NextRequest, NextResponse } from "next/server";

import { buildInvoice, SPECS, type InvoiceSpec } from "@/lib/ubl/generate";

export const dynamic = "force-dynamic";

/**
 * Sample invoice, minted per session.
 *
 * An ETTN is single-use, so a fixed file would register exactly once. The
 * duplicate reuses the primary's ETTN so the refusal can be demonstrated.
 */
declare global {
  // eslint-disable-next-line no-var
  var __payperDemoEttns: Map<string, string> | undefined;
}
const issued = (globalThis.__payperDemoEttns ??= new Map());

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const variant = (params.get("variant") ?? "primary") as InvoiceSpec["key"];
  const session = params.get("session") ?? "default";

  const spec = SPECS.find((s) => s.key === variant);
  if (!spec) {
    return NextResponse.json({ ok: false, error: `Bilinmeyen varyant: ${variant}` }, { status: 404 });
  }

  // The duplicate must carry the primary's ETTN for this session. The video pair
  // carries its own fixed identifier, so it needs none of this.
  const shares = variant === "duplicate" ? "primary" : variant;
  const key = `${session}:${shares}`;
  const existing = spec.ettn ? undefined : issued.get(key);
  const { xml, ettn } = buildInvoice(spec, existing ? { ettn: existing } : undefined);
  if (!spec.ettn) issued.set(key, ettn);

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${spec.fileName}"`,
    },
  });
}
