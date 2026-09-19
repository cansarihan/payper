"use client";

import { useState } from "react";

import { C, FONT, shortKey, trLira, trNumber, trPct } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, InvoiceView } from "@/lib/types";
import { ScreenHead } from "./Shell";
import type { Screen } from "./Shell";

/**
 * The book, counted.
 *
 * Every figure here is derived from the invoices the contract holds, in the
 * window the reader picks. Nothing is aggregated into a separate store, which
 * means the numbers cannot drift from the ledger they describe — and an empty
 * window says so rather than reaching further back to look busy.
 */

const RANGES = [7, 30, 90, 365] as const;

const STATUS_COLOUR: Record<InvoiceView["status"], string> = {
  registered: C.amber,
  acknowledged: C.blue,
  funded: C.mint,
  repaid: C.green,
  defaulted: C.coral,
};

export function Stats({
  lang,
  state,
  onGo,
}: {
  lang: Lang;
  state: AppState;
  onGo: (s: Screen) => void;
}) {
  const d = t(lang);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);

  const now = Date.now() / 1000;
  const from = now - range * 86_400;
  const within = state.invoices.filter((i) => i.createdAt >= from);

  const sum = (list: InvoiceView[]) => list.reduce((s, i) => s + BigInt(i.amountFiat), 0n);
  const volume = sum(within);
  const priced = within.filter((i) => i.lockedDiscountBps > 0);
  const avgDiscount = priced.length
    ? Math.round(priced.reduce((s, i) => s + i.lockedDiscountBps, 0) / priced.length)
    : 0;
  const settled = within.filter((i) => i.status === "repaid");

  // One column per day, oldest first.
  const columns = Math.min(range, 60);
  const step = (range * 86_400) / columns;
  const days = Array.from({ length: columns }, (_, k) => {
    const start = from + k * step;
    const list = within.filter((i) => i.createdAt >= start && i.createdAt < start + step);
    return { at: start, count: list.length, total: sum(list) };
  });
  const peak = days.reduce((m, x) => (x.total > m ? x.total : m), 1n);

  const buyers = (() => {
    const map = new Map<string, bigint>();
    for (const i of within) map.set(i.buyer, (map.get(i.buyer) ?? 0n) + BigInt(i.amountFiat));
    const rows = [...map.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)).slice(0, 5);
    const max = rows[0]?.[1] ?? 1n;
    return rows.map(([address, v], k) => ({
      k: shortKey(address, 6, 4),
      v: trLira(v),
      w: `${Number((v * 100n) / max)}%`,
      c: [C.mint, C.blue, C.lime, C.coral, C.amber][k],
    }));
  })();

  const mix = (["registered", "acknowledged", "funded", "repaid", "defaulted"] as const)
    .map((s) => ({
      k: d.statuses[s],
      s,
      n: within.filter((i) => i.status === s).length,
      c: STATUS_COLOUR[s],
    }))
    .filter((x) => x.n > 0);

  const kpis: [string, string, string][] = [
    [d.statsVolume, trLira(volume, 0), `${within.length} ${d.invoicesLabel.toLowerCase()}`],
    [
      d.statsActive,
      String(within.filter((i) => i.status === "acknowledged" || i.status === "funded").length),
      `${state.invoices.length} ${lang === "tr" ? "toplam" : "in total"}`,
    ],
    [
      d.statsAvgDiscount,
      avgDiscount ? trPct(avgDiscount) : "—",
      avgDiscount
        ? `${d.annual} ~%${trNumber((avgDiscount * 365) / 90 / 100, 1)}`
        : lang === "tr"
          ? "kilitli teklif yok"
          : "no locked quote",
    ],
    [
      d.statsSettled,
      String(settled.length),
      settled.length ? trLira(sum(settled), 0) : lang === "tr" ? "henüz yok" : "none yet",
    ],
  ];

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead
        step={d.statsLabel}
        title={d.statsTitle}
        lead={d.statsLead}
        right={
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, background: "rgba(255,255,255,.45)" }}>
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontFamily: FONT.mono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: range === r ? C.ink : "transparent",
                  color: range === r ? C.white : C.ink,
                }}
              >
                {r}
                {lang === "tr" ? "g" : "d"}
              </button>
            ))}
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        {kpis.map(([k, v, sub]) => (
          <div key={k} style={{ background: C.white, borderRadius: 24, padding: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.55 }}>{k}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-.03em",
                margin: "8px 0 4px",
                fontFamily: FONT.mono,
              }}
            >
              {v}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.grey }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="anchor-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div
          style={{
            background: C.ink,
            color: C.white,
            borderRadius: 28,
            padding: 24,
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{d.statsDaily}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
              {range} {lang === "tr" ? "gün" : "days"}
            </span>
          </div>

          {within.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.5)", fontWeight: 600 }}>
              {d.empty}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns},1fr)`,
                  gap: columns > 30 ? 2 : 4,
                  alignItems: "end",
                  height: 150,
                }}
              >
                {days.map((day, i) => {
                  const h = day.total > 0n ? Math.max(6, Number((day.total * 100n) / peak)) : 2;
                  return (
                    <div
                      key={i}
                      title={`${new Date(day.at * 1000).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB")} · ${trLira(day.total, 0)}`}
                      style={{
                        height: `${h}%`,
                        borderRadius: "4px 4px 1px 1px",
                        background: day.count > 0 ? C.mint : "rgba(255,255,255,.12)",
                        transformOrigin: "bottom",
                        animation: "barUp .6s cubic-bezier(.2,.8,.2,1) both",
                        animationDelay: `${i * 0.008}s`,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: "rgba(255,255,255,.4)",
                }}
              >
                <span>
                  {new Date(from * 1000).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB")}
                </span>
                <span>{lang === "tr" ? "bugün" : "today"}</span>
              </div>
            </>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{d.statsMix}</span>
            {mix.length === 0 ? (
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>{d.empty}</span>
            ) : (
              <>
                <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden" }}>
                  {mix.map((m) => (
                    <div
                      key={m.s}
                      title={`${m.k} · ${m.n}`}
                      style={{ flex: m.n, background: m.c, transition: "flex .4s" }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {mix.map((m) => (
                    <button
                      key={m.s}
                      onClick={() => onGo("invoices")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        border: 0,
                        background: "transparent",
                        color: "rgba(255,255,255,.7)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: m.c }} />
                      {m.k} {m.n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 28, padding: 24, display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{d.statsBuyers}</div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.grey }}>
              {lang === "tr"
                ? "Bir alıcıya yoğunlaşmak, fonlayıcı için tek bir karşı tarafa yoğunlaşmak demektir. Portföy büyürken izlenmesi gereken sayı bu."
                : "Concentration in one buyer is concentration in one counterparty for the funder. This is the figure to watch as the portfolio grows."}
            </p>
          </div>

          {buyers.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: C.grey, fontWeight: 600 }}>
              {d.empty}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {buyers.map((b) => (
                <div key={b.k} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 12 }}>{b.k}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{b.v}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(10,10,10,.07)" }}>
                    <div
                      style={{
                        width: b.w,
                        height: "100%",
                        borderRadius: 999,
                        background: b.c,
                        transition: "width .5s cubic-bezier(.2,.8,.2,1)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
