import { NextRequest, NextResponse } from "next/server";

import { buildInvoice, SPECS, type InvoiceSpec } from "@/lib/ubl/generate";

export const dynamic = "force-dynamic";

/**
 * A sample invoice, minted per session.
 *
 * An ETTN is single-use, so a file on disk stops being registerable after the
 * first run — which would make the demo work exactly once. Each session gets
 * its own, except the duplicate, which deliberately reuses the primary's so the
 * refusal can be shown.
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

  // The duplicate must carry the primary's ETTN for this session, or it proves
  // nothing.
  const key = `${session}:${variant === "duplicate" ? "primary" : variant}`;
  const existing = issued.get(key);
  const { xml, ettn } = buildInvoice(spec, existing ? { ettn: existing } : undefined);
  issued.set(key, ettn);

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${spec.fileName}"`,
    },
  });
}
