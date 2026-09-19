"use client";

import { useCallback, useEffect, useState } from "react";

import { C, FONT, trLira, trNumber, trPct, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, QuoteView } from "@/lib/types";
import { ScreenHead } from "./Shell";

/**
 * The discount, component by component.
 *
 * Each row carries the formula behind its number and whether that number was
 * read from chain in this call. A price presented as live while quietly using a
 * constant is worse than a constant, so the provenance is on screen.
 */
export function Quote({
  lang,
  state,
  onDone,
}: {
  lang: Lang;
  state: AppState;
  onDone: () => void;
}) {
  const d = t(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [override, setOverride] = useState<QuoteView | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const candidates = state.invoices.filter(
    (i) => i.status === "acknowledged" || i.status === "funded" || i.status === "repaid",
  );
  const invoice =
    state.invoices.find((i) => i.id === picked) ??
    (state.active && candidates.some((c) => c.id === state.active!.id) ? state.active : null) ??
    candidates[0] ??
    null;
  const q = override ?? (invoice?.id === state.active?.id ? state.activeQuote : null);

  const loadFor = useCallback(async (id: number) => {
    setPicked(id);
    setOverride(null);
    setHash(null);
    const res = await fetch(`/api/quote?invoiceId=${id}`, { cache: "no-store" });
    const json = (await res.json()) as { ok: boolean; quote?: QuoteView };
    if (json.ok && json.quote) setOverride(json.quote);
  }, []);

  // Price the selected invoice rather than showing an empty card and waiting
  // for a click.
  useEffect(() => {
    if (invoice && !q) void loadFor(invoice.id);
  }, [invoice?.id, q, loadFor]);

  async function accept() {
    if (!invoice) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        hash?: string;
        quote?: QuoteView;
        error?: string;
      };
      if (!json.ok) throw new Error(json.error ?? "Quote could not be accepted");
      setHash(json.hash ?? null);
      if (json.quote) setOverride(json.quote);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!invoice || !q) {
    return (
      <div style={{ animation: "rise .4s both" }}>
        <ScreenHead step={`${d.step} 3 · quote`} title={d.quoteTitle} lead={d.quoteLead} />
        <div
          style={{
            background: C.white,
            borderRadius: 28,
            padding: "56px 24px",
            textAlign: "center",
            color: C.grey,
            fontWeight: 600,
          }}
        >
          {d.loading}…
        </div>
      </div>
    );
  }

  const rows: {
    k: string;
    bps: number;
    live: boolean;
    formula: string;
    colour: string;
  }[] = [
    {
      k: d.treasuryYield,
      bps: q.yieldBps,
      live: q.yieldSource === "live",
      formula: `${q.apyBps} bps × ${q.days} / 365`,
      colour: C.mint,
    },
    {
      k: d.range.replace(d.range, lang === "tr" ? "Kur riski" : "Currency risk"),
      bps: q.fxRiskBps,
      live: q.fxSource === "live",
      formula: `${q.fxDriftBps} × ${q.days} / ${q.fxWindowDays} + ${q.fxRangeBps} / 2`,
      colour: C.blue,
    },
    {
      k: lang === "tr" ? "Kredi primi" : "Credit premium",
      bps: q.creditPremiumBps,
      live: false,
      formula: lang === "tr" ? "yapılandırma" : "configured",
      colour: C.coral,
    },
    {
      k: lang === "tr" ? "Platform ücreti" : "Platform fee",
      bps: q.platformFeeBps,
      live: false,
      formula: lang === "tr" ? "yapılandırma" : "configured",
      colour: C.amber,
    },
  ];

  const total = q.totalDiscountBps;
  const annual = q.days > 0 ? (total * 365) / q.days / 100 : 0;
  const locked = invoice.lockedDiscountBps > 0;

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 3 · quote`} title={d.quoteTitle} lead={d.quoteLead} />

      {candidates.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {candidates.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => void loadFor(c.id)}
              style={{
                border: `1px solid ${c.id === invoice.id ? C.ink : "rgba(10,10,10,.16)"}`,
                background: c.id === invoice.id ? C.ink : "transparent",
                color: c.id === invoice.id ? C.white : C.ink,
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: FONT.mono,
              }}
            >
              #{c.id}
            </button>
          ))}
        </div>
      )}

      <div className="quote-split" style={{ display: "grid", gap: 20, alignItems: "start" }}>
        <div style={{ background: C.white, borderRadius: 28, padding: 24 }}>
          {/* the stacked share bar */}
          <div
            style={{
              display: "flex",
              height: 18,
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            {rows.map((r) => (
              <span
                key={r.k}
                title={`${r.k} · ${r.bps} bps`}
                style={{
                  width: `${(r.bps / total) * 100}%`,
                  background: r.colour,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {r.live && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s linear infinite",
                    }}
                  />
                )}
              </span>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".06em",
              opacity: 0.55,
              marginBottom: 10,
            }}
          >
            {d.components.toUpperCase()}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((r, i) => (
              <div
                key={r.k}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "grid",
                  gridTemplateColumns: "44px minmax(0,1fr) auto auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "13px 15px",
                  borderRadius: 16,
                  background: "#F7F7F5",
                  animation: "blurInA .45s both",
                  animationDelay: `${i * 0.07}s`,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${(r.bps / total) * 100}%`,
                    background: r.colour,
                    opacity: 0.1,
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: r.colour,
                    color: C.ink,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {r.bps}
                </span>
                <span style={{ position: "relative", display: "grid", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.k}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.55 }}>
                    {r.formula}
                  </span>
                </span>
                <span
                  style={{
                    position: "relative",
                    fontFamily: FONT.mono,
                    fontSize: 9.5,
                    letterSpacing: ".06em",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: r.live ? "rgba(26,143,99,.14)" : "rgba(10,10,10,.07)",
                    color: r.live ? C.green : C.grey,
                  }}
                >
                  {r.live ? d.liveTag : d.paramTag}
                </span>
                <span
                  style={{
                    position: "relative",
                    fontFamily: FONT.mono,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {trPct(r.bps)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
              gap: 8,
            }}
          >
            <Obs k={d.vaultApy} v={trPct(q.apyBps)} />
            <Obs k={d.drift} v={`${q.fxDriftBps} bps`} />
            <Obs k={d.range} v={`${q.fxRangeBps} bps`} />
            <Obs k={d.window} v={`${q.fxWindowDays} ${d.days}`} />
          </div>
        </div>

        {/* what it means in money */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.ink, color: C.white, borderRadius: 28, padding: 26 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.6)",
                marginBottom: 10,
              }}
            >
              {d.payout}
            </div>
            <div
              style={{
                fontSize: "clamp(34px,3.6vw,52px)",
                fontWeight: 600,
                letterSpacing: "-.04em",
                lineHeight: 1,
                color: C.mint,
              }}
            >
              {trLira(q.payoutFiat)}
            </div>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 12,
                color: "rgba(255,255,255,.55)",
                marginTop: 8,
              }}
            >
              {usdc(q.payoutUsdc, 4)}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 20, fontFamily: FONT.mono, fontSize: 12 }}>
              <Line k={d.faceValue} v={trLira(invoice.amountFiat)} />
              <Line k={d.discount} v={`${trPct(total)} · ${d.annual} ~%${trNumber(annual, 1)}`} colour={C.mint} />
              <Line k={d.tenor} v={`${q.days} ${d.days}`} />
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "13px 15px",
                borderRadius: 16,
                background: "rgba(255,95,87,.12)",
                color: C.coral,
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 1.5,
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </div>
          )}

          {locked ? (
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 20,
                background: C.lime,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {d.accepted} · {trPct(invoice.lockedDiscountBps)}
              {hash && (
                <>
                  {" · "}
                  <a
                    href={`https://stellar.expert/explorer/${
                      state.network === "mainnet" ? "public" : "testnet"
                    }/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.ink }}
                  >
                    {hash.slice(0, 12)}… ↗
                  </a>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => void accept()}
              disabled={busy}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: busy ? "rgba(10,10,10,.12)" : C.ink,
                color: busy ? C.ink : C.white,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {busy ? `${d.loading}…` : d.acceptQuote}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Obs = ({ k, v }: { k: string; v: string }) => (
  <div style={{ padding: "11px 13px", borderRadius: 14, background: "#F7F7F5" }}>
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        opacity: 0.5,
        marginBottom: 4,
      }}
    >
      {k}
    </div>
    <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700 }}>{v}</div>
  </div>
);

const Line = ({ k, v, colour }: { k: string; v: string; colour?: string }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 12,
      background: C.panel,
    }}
  >
    <span style={{ color: "rgba(255,255,255,.55)" }}>{k}</span>
    <span style={{ color: colour ?? C.white, textAlign: "right" }}>{v}</span>
  </div>
);
