"use client";

import { useState } from "react";

import { C, FONT, trNumber, trPct } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, InvoiceView } from "@/lib/types";
import type { Screen } from "./Shell";

/**
 * The dashboard: a mint half carrying the score gauge, the two settlement
 * cards and the six-card grid, over a black half holding the cash-flow bars,
 * the vault split and the invoice book. Every figure is derived from chain
 * state; nothing here is a decorative constant.
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
  const [cardMenu, setCardMenu] = useState(-1);
  const [filter, setFilter] = useState<"all" | InvoiceView["status"]>("all");
  const m = metrics(state, d);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="ov-top" style={{ gap: 28, padding: "24px 30px 30px" }}>
        <div style={{ display: "grid", gap: 22, alignContent: "start", minWidth: 0 }}>
          <div
            data-tour="ov-score"
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                {m.scoreDelta >= 0 ? "+" : ""}
                {m.scoreDelta} <span style={{ fontWeight: 500 }}>pts</span>
              </div>
              <div
                style={{
                  fontSize: 78,
                  lineHeight: 0.95,
                  fontWeight: 600,
                  letterSpacing: "-.04em",
                  margin: "2px 0 8px",
                }}
              >
                {m.score}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3, opacity: 0.75, maxWidth: 120 }}>
                {d.scoreCaption}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, justifyItems: "center", paddingTop: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span
                  style={{
                    background: C.white,
                    border: `1px solid ${C.ink}`,
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  DeFindex
                </span>
                <span
                  style={{
                    border: "1px solid rgba(10,10,10,.35)",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(10,10,10,.6)",
                  }}
                >
                  TRY/USD · {m.fxLive ? d.liveTag : d.tagFallback}
                </span>
              </div>
              <ScoreGauge value={m.score} />
            </div>
          </div>

          <div
            data-tour="ov-kpi"
            style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}
          >
            <SettledCard label={d.kpiSettled} value={m.settledToday} onOpen={() => onGo("anchor")} />
            <SettledCard label={d.kpiPending} value={m.pendingAtMaturity} onOpen={() => onGo("board")} />
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

        <div
          data-tour="ov-cards"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 14,
            alignContent: "start",
          }}
        >
          {m.cards.map((card, i) => (
            <div
              key={card.title}
              style={{
                background: C.white,
                color: C.ink,
                borderRadius: 24,
                padding: "20px 20px 18px",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                gap: 10,
                minHeight: 190,
                animation: "popIn .5s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: card.iconBg,
                    color: card.iconFg,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {card.icon}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardMenu(cardMenu === i ? -1 : i);
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "1px solid rgba(10,10,10,.15)",
                    background: cardMenu === i ? C.ink : "transparent",
                    color: cardMenu === i ? C.mint : C.ink,
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <circle cx="7" cy="2.5" r="1.6" />
                    <circle cx="7" cy="7" r="1.6" />
                    <circle cx="7" cy="11.5" r="1.6" />
                  </svg>
                </button>

                {cardMenu === i && (
                  <>
                    <div
                      onClick={() => setCardMenu(-1)}
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 36,
                        zIndex: 41,
                        width: 200,
                        background: C.white,
                        borderRadius: 16,
                        padding: 6,
                        boxShadow: "0 20px 50px rgba(0,0,0,.22),0 0 0 1px rgba(10,10,10,.06)",
                        animation: "popIn .2s cubic-bezier(.2,.8,.2,1) both",
                        transformOrigin: "top right",
                        textAlign: "left",
                      }}
                    >
                      {[
                        { label: d.cardMenu[0], icon: "↗", go: () => onGo(card.to) },
                        { label: d.cardMenu[1], icon: "⤓", go: () => downloadCsv(state) },
                      ].map((mi) => (
                        <button
                          key={mi.label}
                          onClick={() => {
                            setCardMenu(-1);
                            mi.go();
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            textAlign: "left",
                            background: "transparent",
                            border: 0,
                            borderRadius: 10,
                            padding: "9px 10px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.ink,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              background: C.paper,
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                            }}
                          >
                            {mi.icon}
                          </span>
                          {mi.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{card.title}</div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((k) => (
                    <span
                      key={k}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: k < 2 ? C.ink : "rgba(10,10,10,.2)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: C.ink,
          color: C.white,
          borderRadius: "32px 32px 0 0",
          padding: "28px 30px 40px",
          display: "grid",
          gap: 28,
          flex: 1,
          alignContent: "start",
        }}
      >
        <div className="ov-top" style={{ gap: 28 }}>
          <div style={{ minWidth: 0, display: "grid", gap: 22, alignContent: "start" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: 19, fontWeight: 600 }}>{d.cashflow}</div>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    color: C.mint,
                    background: "rgba(61,226,156,.12)",
                    borderRadius: 999,
                    padding: "5px 12px",
                  }}
                >
                  {d.last12} ↗
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12,1fr)",
                  gap: 8,
                  alignItems: "end",
                  height: 140,
                }}
              >
                {m.bars.map((b, i) => (
                  <div
                    key={i}
                    title={b.label}
                    style={{
                      height: b.h,
                      borderRadius: "6px 6px 2px 2px",
                      background: b.colour,
                      transformOrigin: "bottom",
                      animation: "barUp .7s cubic-bezier(.2,.8,.2,1) both",
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  color: "rgba(255,255,255,.45)",
                }}
              >
                {m.barTicks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: 24,
                padding: 22,
                background: C.panel,
                display: "grid",
                gridTemplateColumns: "auto minmax(0,1fr)",
                gap: 22,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: `conic-gradient(${C.mint} 0 ${m.split.deployed}%,${C.blue} ${m.split.deployed}% ${m.split.deployed + m.split.idle}%,${C.coral} ${m.split.deployed + m.split.idle}% 100%)`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    border: "1px dashed rgba(255,255,255,.2)",
                    animation: "spin 30s linear infinite",
                  }}
                />
                <div
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: "50%",
                    background: C.panel,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>
                      {trPct(state.treasury.apyBps)}
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: "rgba(255,255,255,.5)" }}>
                      APY
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{d.vault}</span>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: C.mint,
                      color: C.ink,
                      fontWeight: 700,
                    }}
                  >
                    {d.treasuryMode} · {state.treasury.mode}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                  {(
                    [
                      [d.deployed, C.mint, m.split.deployedUsdc],
                      [d.idle, C.blue, m.split.idleUsdc],
                      [d.firstLossLabel, C.coral, m.split.firstLossUsdc],
                    ] as const
                  ).map(([label, colour, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "rgba(255,255,255,.6)",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: colour }} />
                        {label}
                      </span>
                      <span style={{ fontFamily: FONT.mono }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 32, flexWrap: "wrap" }}>
                <span style={{ fontSize: 19, fontWeight: 600 }}>{d.invoicesLabel}</span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {state.invoices.length}{" "}
                  <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.65)" }}>
                    {d.all}
                  </span>
                </span>
              </div>
              <button
                onClick={() => onGo("board")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.25)",
                  background: "transparent",
                  color: C.white,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                }}
              >
                ↗
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
              {m.offers.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderRadius: 24,
                    padding: 22,
                    background: C.panel,
                    color: "rgba(255,255,255,.6)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {d.noOffers}
                </div>
              ) : (
                m.offers.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onGo(o.to)}
                    style={{
                      background: o.bg,
                      color: o.fg,
                      border: 0,
                      borderRadius: 24,
                      padding: "18px 18px 16px",
                      display: "grid",
                      gap: 22,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: C.white,
                          color: C.ink,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          boxShadow: "0 0 0 3px rgba(255,255,255,.35)",
                          flex: "none",
                        }}
                      >
                        #
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.15 }}>{o.name}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.75, marginBottom: 2 }}>
                          {d.discount}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>
                          {o.rate}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.75, marginBottom: 2 }}>
                          {d.due}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>
                          {o.days}
                          <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 3 }}>{d.days}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div data-tour="ov-book" style={{ borderRadius: 24, background: C.panel, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              padding: "18px 22px",
              borderBottom: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <div style={{ fontWeight: 700 }}>{d.invoicesLabel}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(
                [
                  ["all", d.all],
                  ["registered", d.statuses.registered],
                  ["acknowledged", d.statuses.acknowledged],
                  ["funded", d.statuses.funded],
                  ["repaid", d.statuses.repaid],
                ] as const
              ).map(([key, label]) => {
                const n =
                  key === "all"
                    ? state.invoices.length
                    : state.invoices.filter((r) => r.status === key).length;
                const on = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 11,
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: on ? C.mint : "transparent",
                      color: on ? C.ink : "rgba(255,255,255,.7)",
                      border: `1px solid ${on ? C.mint : "rgba(255,255,255,.15)"}`,
                      fontWeight: 700,
                      transition: "all .25s",
                    }}
                  >
                    {label} {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inv-row inv-head">
            <span>ID</span>
            <span>{d.buyer}</span>
            <span>ETTN</span>
            <span>{d.amount}</span>
            <span>{d.due}</span>
            <span>{d.discount}</span>
            <span>{d.status}</span>
          </div>

          {m.rows.filter((r) => filter === "all" || r.status === filter).length === 0 ? (
            <div style={{ padding: "36px 22px", color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>
              {d.empty}
            </div>
          ) : (
            m.rows
              .filter((r) => filter === "all" || r.status === filter)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => onGo(r.to)}
                  className="inv-row inv-body"
                  style={{ animation: "blurInA .4s both" }}
                >
                  <span style={{ fontFamily: FONT.mono, color: "rgba(255,255,255,.5)" }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.buyer}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                    {r.ettn}
                  </span>
                  <span style={{ fontFamily: FONT.mono }}>{r.amount}</span>
                  <span style={{ fontFamily: FONT.mono, color: "rgba(255,255,255,.5)" }}>{r.due}</span>
                  <span style={{ fontFamily: FONT.mono, color: C.mint }}>{r.discount}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: r.statusColour,
                      color: C.ink,
                      width: "fit-content",
                      fontWeight: 600,
                    }}
                  >
                    {r.statusLabel}
                  </span>
                </button>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function SettledCard({
  label,
  value,
  onOpen,
}: {
  label: string;
  value: { whole: string; frac: string };
  onOpen: () => void;
}) {
  return (
    <div style={{ background: C.white, color: C.ink, borderRadius: 24, padding: 18, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <button
          onClick={onOpen}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(10,10,10,.15)",
            background: "transparent",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            flex: "none",
          }}
        >
          ↗
        </button>
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 500, opacity: 0.55 }}>₺</span> {value.whole}
        <span style={{ fontSize: 18, fontWeight: 500 }}>{value.frac}</span>
      </div>
    </div>
  );
}

/** Semicircular gauge with a needle. 300..900 maps onto the arc's 180°. */
function ScoreGauge({ value }: { value: number }) {
  const clamped = Math.max(300, Math.min(900, value));
  const fraction = (clamped - 300) / 600;
  const angle = -120 + fraction * 158;
  const dashOffset = 420 - fraction * 350;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 260, aspectRatio: "260/170" }}>
      <svg viewBox="-20 -20 280 190" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="gArc" x1="0" x2="1">
            <stop offset="0" stopColor={C.mint} />
            <stop offset=".55" stopColor={C.green} />
            <stop offset="1" stopColor={C.ink} />
          </linearGradient>
        </defs>
        <path
          d="M30 135 A90 90 0 0 1 210 135"
          fill="none"
          stroke={C.white}
          strokeOpacity="0.75"
          strokeWidth="30"
          strokeLinecap="round"
        />
        <path
          d="M30 135 A90 90 0 0 1 210 135"
          fill="none"
          stroke="url(#gArc)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeDasharray="420"
          strokeDashoffset={dashOffset}
          style={{ animation: "drawArc 1.4s cubic-bezier(.2,.8,.2,1) both" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: 0,
          height: 0,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 0",
          animation: "needle 1.4s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -13,
            bottom: 8,
            width: 26,
            height: 34,
            background: C.ink,
            clipPath: "polygon(50% 0,100% 100%,50% 78%,0 100%)",
            transform: "translateY(-8px)",
          }}
        />
      </div>
    </div>
  );
}

const STATUS_COLOUR: Record<InvoiceView["status"], string> = {
  registered: C.amber,
  acknowledged: C.blue,
  funded: C.mint,
  repaid: C.green,
  defaulted: C.coral,
};

const OFFER_LOOKS = [
  { bg: C.coral, fg: C.white },
  { bg: C.blue, fg: C.white },
  { bg: C.lime, fg: C.ink },
];

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function splitMoney(minor: number): { whole: string; frac: string } {
  const lira = Math.floor(minor / 100);
  if (lira >= 1000) {
    const thousands = Math.floor(lira / 1000);
    return { whole: trNumber(thousands, 0), frac: `,${String(lira % 1000).padStart(3, "0")}` };
  }
  return { whole: trNumber(lira, 0), frac: `,${String(Math.floor(minor % 100)).padStart(2, "0")}` };
}

const compact = (lira: number) =>
  lira >= 1_000_000
    ? `₺${(lira / 1_000_000).toFixed(2).replace(".", ",")}M`
    : lira >= 1000
      ? `₺${Math.round(lira / 1000)}K`
      : `₺${trNumber(lira, 0)}`;

function metrics(state: AppState, d: ReturnType<typeof t>) {
  const inv = state.invoices;
  const settled = inv.filter((i) => i.status === "funded" || i.status === "repaid");
  const financedLira = settled.reduce((s, i) => s + Number(i.amountFiat) / 100, 0);

  // Settled in lira: the payout that actually left the vault, converted at the
  // invoice's own face rate so the two columns stay comparable.
  const settledLiraMinor = settled.reduce((s, i) => {
    const face = Number(i.faceUsdc);
    if (!face) return s;
    return s + (Number(i.lockedPayoutUsdc || 0) / face) * Number(i.amountFiat);
  }, 0);

  const pending = inv.filter((i) => i.status === "funded");
  const pendingMinor = pending.reduce((s, i) => s + Number(i.amountFiat), 0);

  const discounts = inv.filter((i) => i.lockedDiscountBps > 0).map((i) => i.lockedDiscountBps);
  const avgDiscount = discounts.length
    ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
    : (state.activeQuote?.totalDiscountBps ?? 0);

  const funderWallets = new Set(state.activeFunders.map((f) => f.funder)).size;
  const defaults = inv.filter((i) => i.status === "defaulted").length;

  // An on-chain reputation, not a decoration: repayments earn, defaults cost,
  // and an unblemished but empty book sits at the base.
  const repaid = inv.filter((i) => i.status === "repaid").length;
  const score = Math.max(300, Math.min(900, 700 + repaid * 18 + settled.length * 6 - defaults * 120));
  const scoreDelta = repaid * 18 - defaults * 120;

  const now = new Date();
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const i of settled) {
    const when = new Date(i.createdAt * 1000);
    const back = (now.getFullYear() - when.getFullYear()) * 12 + (now.getMonth() - when.getMonth());
    if (back >= 0 && back < 12) buckets[11 - back] += Number(i.amountFiat) / 100;
  }
  const peak = Math.max(...buckets, 1);
  const bars = buckets.map((v, i) => ({
    h: `${Math.max(4, Math.round((v / peak) * 100))}%`,
    colour: v === 0 ? "rgba(255,255,255,.14)" : i >= 9 ? C.mint : C.blue,
    label: `${MONTHS[(now.getMonth() - (11 - i) + 12) % 12]} · ${compact(v)}`,
  }));
  const barTicks = [0, 3, 6, 9, 11].map((i) => MONTHS[(now.getMonth() - (11 - i) + 12) % 12]);

  const assets = Number(state.treasury.assets);
  const firstLoss = Number(state.treasury.firstLoss);
  const deployedStroops = pending.reduce((s, i) => s + Number(i.lockedPayoutUsdc || 0), 0);
  const total = Math.max(1, assets + firstLoss + deployedStroops);
  const split = {
    deployed: Math.round((deployedStroops / total) * 100),
    idle: Math.round((assets / total) * 100),
    deployedUsdc: `${(deployedStroops / 1e7).toFixed(2)} USDC`,
    idleUsdc: `${(assets / 1e7).toFixed(2)} USDC`,
    firstLossUsdc: `${(firstLoss / 1e7).toFixed(2)} USDC`,
  };

  const offers = inv
    .filter((i) => i.status === "acknowledged" || i.status === "registered")
    .slice(0, 3)
    .map((i, k) => ({
      id: i.id,
      name: `${d.invoicesLabel} #${i.id}`,
      rate: i.lockedDiscountBps
        ? trPct(i.lockedDiscountBps)
        : i.id === state.active?.id && state.activeQuote
          ? trPct(state.activeQuote.totalDiscountBps)
          : "—",
      days: Math.max(0, Math.round((i.dueDate * 1000 - Date.now()) / 86_400_000)),
      bg: OFFER_LOOKS[k % 3].bg,
      fg: OFFER_LOOKS[k % 3].fg,
      to: (i.status === "registered" ? "buyer" : "quote") as Screen,
    }));

  const rows = inv.map((i) => ({
    id: i.id,
    label: `#${String(i.id).padStart(4, "0")}`,
    buyer: `VKN ${i.buyerTaxId}`,
    ettn: `${i.ettnHash.slice(0, 8)}…${i.ettnHash.slice(-4)}`,
    amount: trNumber(Number(i.amountFiat) / 100, 2),
    due: new Date(i.dueDate * 1000).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
    discount: i.lockedDiscountBps ? trPct(i.lockedDiscountBps) : "—",
    status: i.status,
    statusLabel: d.statusShort[i.status],
    statusColour: STATUS_COLOUR[i.status],
    to: (i.status === "registered"
      ? "buyer"
      : i.status === "acknowledged"
        ? "quote"
        : i.status === "funded"
          ? "anchor"
          : "board") as Screen,
  }));

  return {
    score,
    scoreDelta,
    fxLive: (state.activeQuote?.fxSource ?? "fallback") === "live",
    settledToday: splitMoney(settledLiraMinor),
    pendingAtMaturity: splitMoney(pendingMinor),
    cards: [
      { title: d.cardTitles[0], value: compact(financedLira), icon: "₺", iconBg: C.mint, iconFg: C.ink, to: "board" as Screen },
      { title: d.cardTitles[1], value: avgDiscount ? trPct(avgDiscount) : "—", icon: "%", iconBg: C.mint, iconFg: C.ink, to: "quote" as Screen },
      {
        title: d.cardTitles[2],
        value: String(inv.filter((i) => i.status !== "repaid" && i.status !== "defaulted").length),
        icon: "#",
        iconBg: C.mint,
        iconFg: C.ink,
        to: "upload" as Screen,
      },
      { title: d.cardTitles[3], value: String(funderWallets), icon: "◎", iconBg: C.blue, iconFg: C.white, to: "board" as Screen },
      { title: d.cardTitles[4], value: String(defaults), icon: "!", iconBg: C.coral, iconFg: C.white, to: "anchor" as Screen },
      { title: d.cardTitles[5], value: String(settled.length), icon: "⊘", iconBg: C.lime, iconFg: C.ink, to: "upload" as Screen },
    ],
    bars,
    barTicks,
    split,
    offers,
    rows,
  };
}

function downloadCsv(state: AppState) {
  const head = ["id", "buyer_vkn", "ettn_hash", "amount_fiat", "due", "discount_bps", "status"];
  const rows = state.invoices.map((i) => [
    i.id,
    i.buyerTaxId,
    i.ettnHash,
    (Number(i.amountFiat) / 100).toFixed(2),
    new Date(i.dueDate * 1000).toISOString().slice(0, 10),
    i.lockedDiscountBps,
    i.status,
  ]);
  const csv = [head, ...rows].map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = "payper-invoices.csv";
  a.click();
}
