"use client";

import { C, FONT, trLira, trNumber, trPct, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, InvoiceStatus } from "@/lib/types";
import type { Screen } from "./Shell";

const STATUS_COLOUR: Record<InvoiceStatus, string> = {
  registered: C.amber,
  acknowledged: C.blue,
  funded: C.mint,
  repaid: C.green,
  defaulted: C.coral,
};

/**
 * The book at a glance.
 *
 * The score is derived from what the ledger actually holds — settled invoices
 * against defaults, weighted by how much of the book has completed a full cycle
 * — rather than being a number chosen to look healthy.
 */
export function Overview({
  lang,
  state,
  onGo,
}: {
  lang: Lang;
  state: AppState;
  onGo: (s: Screen) => void;
}) {
  const d = t(lang);
  const invoices = state.invoices;

  const repaid = invoices.filter((i) => i.status === "repaid").length;
  const defaulted = invoices.filter((i) => i.status === "defaulted").length;
  const closed = repaid + defaulted;
  const volume = invoices.reduce((s, i) => s + BigInt(i.amountFiat), 0n);
  const outstanding = invoices
    .filter((i) => i.status === "funded")
    .reduce((s, i) => s + BigInt(i.fundedAmount), 0n);

  // 500 is the floor with no history; a clean settled invoice lifts it, a
  // default costs roughly four times as much as a settlement earns.
  const score = Math.round(
    Math.min(1000, 500 + repaid * 55 - defaulted * 220 + Math.min(invoices.length, 12) * 4),
  );
  const angle = -90 + (Math.min(1000, Math.max(0, score)) / 1000) * 180;

  const q = state.activeQuote;
  const annual = q && q.days > 0 ? (q.totalDiscountBps * 365) / q.days / 100 : null;

  const cards: { k: string; v: string; sub: string; to: Screen; tone?: string }[] = [
    {
      k: d.treasuryYield,
      v: trPct(state.treasury.apyBps),
      sub: state.treasury.apySource === "live" ? d.liveTag : d.paramTag,
      to: "anchor",
      tone: state.treasury.apySource === "live" ? C.mint : C.amber,
    },
    {
      k: d.liveDiscount,
      v: q ? trPct(q.totalDiscountBps) : "—",
      sub: q ? `${q.days} ${d.days} · ~%${trNumber(annual!, 1)}` : d.noInvoiceToPrice,
      to: "quote",
      tone: C.blue,
    },
    {
      k: d.treasuryAssets,
      v: usdc(state.treasury.assets),
      sub: state.anchor?.homeDomain ?? "—",
      to: "anchor",
    },
    {
      k: lang === "tr" ? "Fonlanan tutar" : "Outstanding",
      v: usdc(outstanding),
      sub: `${invoices.filter((i) => i.status === "funded").length} ${lang === "tr" ? "fatura" : "invoices"}`,
      to: "board",
      tone: C.lime,
    },
    {
      k: lang === "tr" ? "Toplam hacim" : "Total volume",
      v: trLira(volume, 0),
      sub: `${invoices.length} ${lang === "tr" ? "fatura" : "invoices"}`,
      to: "upload",
    },
    {
      k: lang === "tr" ? "Vadesinde ödenen" : "Settled",
      v: String(repaid),
      sub: defaulted ? `${defaulted} ${lang === "tr" ? "temerrüt" : "defaulted"}` : d.empty,
      to: "anchor",
      tone: C.green,
    },
  ];

  return (
    <div style={{ animation: "rise .4s both", display: "grid", gap: 20 }}>
      <div className="ov-top" style={{ display: "grid", gap: 26, alignItems: "start" }}>
        {/* score */}
        <div style={{ display: "grid", gap: 20, alignContent: "start", minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 16, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                {closed > 0 ? `${repaid}/${closed}` : "—"}{" "}
                <span style={{ fontWeight: 500 }}>{lang === "tr" ? "kapanan" : "closed"}</span>
              </div>
              <div
                style={{
                  fontSize: "clamp(52px,7vw,78px)",
                  lineHeight: 0.95,
                  fontWeight: 600,
                  letterSpacing: "-.04em",
                  margin: "2px 0 8px",
                }}
              >
                {score}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.35, opacity: 0.75, maxWidth: 130 }}>
                Payper Score · {lang === "tr" ? "zincirden türetildi" : "derived on chain"}
              </div>
            </div>

            <div style={{ display: "grid", justifyItems: "center", paddingTop: 6 }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 260, aspectRatio: "260/170" }}>
                <svg viewBox="-20 -20 280 190" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="arc" x1="0" x2="1">
                      <stop offset="0" stopColor={C.mint} />
                      <stop offset=".55" stopColor={C.green} />
                      <stop offset="1" stopColor={C.ink} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M30 135 A90 90 0 0 1 210 135"
                    fill="none"
                    stroke="rgba(10,10,10,.14)"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  <path
                    d="M30 135 A90 90 0 0 1 210 135"
                    fill="none"
                    stroke="url(#arc)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * Math.min(1000, score)) / 1000}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }}
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "19%",
                    width: 0,
                    height: 0,
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: "0 0",
                    transition: "transform 1.2s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -11,
                      bottom: 6,
                      width: 22,
                      height: 68,
                      background: C.ink,
                      clipPath: "polygon(50% 0,100% 100%,50% 78%,0 100%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            <Kpi
              k={lang === "tr" ? "Bugün geçen" : "Settled today"}
              v={usdc(state.treasury.assets)}
              onClick={() => onGo("anchor")}
            />
            <Kpi
              k={lang === "tr" ? "Onay bekleyen" : "Awaiting"}
              v={String(invoices.filter((i) => i.status === "registered").length)}
              onClick={() => onGo("buyer")}
            />
          </div>

          <button
            onClick={() => onGo("upload")}
            style={{
              background: C.ink,
              color: C.white,
              border: 0,
              borderRadius: 999,
              padding: "14px 26px",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            + {d.uploadTitle}
          </button>
        </div>

        {/* cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, alignContent: "start" }}>
          {cards.map((c, i) => (
            <button
              key={c.k}
              onClick={() => onGo(c.to)}
              style={{
                background: C.white,
                color: C.ink,
                border: 0,
                borderRadius: 24,
                padding: "20px 20px 18px",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                gap: 10,
                minHeight: 168,
                textAlign: "left",
                animation: "rise .5s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.75 }}>{c.k}</span>
              <span style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.03em", alignSelf: "center" }}>
                {c.v}
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10.5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  justifySelf: "start",
                  background: c.tone ? `${c.tone}26` : C.paper,
                  color: c.tone ?? C.grey,
                }}
              >
                {c.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* the book */}
      <div style={{ background: C.ink, color: C.white, borderRadius: 28, padding: 24, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {lang === "tr" ? "Fatura defteri" : "Invoice book"}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
            {invoices.length} · {state.network}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div style={{ padding: "36px 12px", textAlign: "center", color: "rgba(255,255,255,.5)", fontWeight: 600 }}>
            {d.empty}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {invoices.slice(0, 8).map((inv, i) => (
              <div
                key={inv.id}
                className="ov-row"
                style={{
                  display: "grid",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: C.panel,
                  fontSize: 12.5,
                  animation: "blurInA .4s both",
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>#{inv.id}</span>
                <span style={{ fontWeight: 600 }}>{trLira(inv.amountFiat)}</span>
                <span style={{ fontFamily: FONT.mono, color: "rgba(255,255,255,.5)" }}>
                  {new Date(inv.dueDate * 1000).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB")}
                </span>
                <span style={{ fontFamily: FONT.mono, color: "rgba(255,255,255,.5)" }}>
                  {inv.lockedDiscountBps > 0 ? trPct(inv.lockedDiscountBps) : "—"}
                </span>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    letterSpacing: ".05em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 999,
                    justifySelf: "start",
                    background: `${STATUS_COLOUR[inv.status]}26`,
                    color: STATUS_COLOUR[inv.status],
                  }}
                >
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Kpi = ({ k, v, onClick }: { k: string; v: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      background: C.white,
      color: C.ink,
      border: 0,
      borderRadius: 24,
      padding: 18,
      display: "grid",
      gap: 10,
      textAlign: "left",
    }}
  >
    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{k}</span>
    <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{v}</span>
  </button>
);
