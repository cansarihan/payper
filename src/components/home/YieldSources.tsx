"use client";

import { useState } from "react";

import { C, trPct } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";
import { home } from "@/lib/i18n/home";
import type { AppState } from "@/lib/types";
import { clamp01, useScrollProgress } from "@/lib/useScrollProgress";

/**
 * The three places a funder's return actually comes from, each backed by a
 * number read from chain rather than a claim.
 *
 * Scroll-driven: the rows slide in from the left one after another while the
 * card on the right settles, and opening a row swaps what the card shows.
 */
export function YieldSources({ lang, state }: { lang: Lang; state: AppState | null }) {
  const h = home(lang);
  const [ref, p] = useScrollProgress<HTMLElement>();
  const [open, setOpen] = useState(0);

  const q = state?.activeQuote ?? null;
  const values = [
    {
      value: q ? trPct(q.totalDiscountBps) : "—",
      sub: q
        ? `${(Number(state?.active?.amountFiat ?? 0) / 100).toLocaleString("tr-TR")} TRY · ${q.days} ${lang === "tr" ? "gün" : "days"}`
        : lang === "tr"
          ? "teklif bekleniyor"
          : "awaiting a quote",
      live: !!q,
    },
    {
      value: state ? trPct(state.treasury.apyBps) : "—",
      sub: state ? `${state.treasury.apySource === "live" ? h.live : h.fallback} · ${state.treasury.mode}` : "—",
      live: state?.treasury.apySource === "live",
    },
    {
      value: q ? trPct(q.fxRiskBps) : "—",
      sub: q
        ? q.fxSource === "live"
          ? `${q.fxWindowDays} ${lang === "tr" ? "günde" : "days"} ${q.fxDriftBps} bps`
          : h.fallback
        : "—",
      live: q?.fxSource === "live",
    },
  ];

  const headIn = Math.min(1, p * 3);
  const cardIn = clamp01((p - 0.25) / 0.3);
  const icons = ["₺", "#", "⇄"];

  return (
    <section ref={ref} style={{ height: "200vh", position: "relative", background: C.white, color: C.ink }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "grid",
          alignContent: "center",
          padding: "110px 32px 40px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(40px,5.2vw,72px)",
            fontWeight: 500,
            letterSpacing: "-.04em",
            lineHeight: 1,
            margin: "0 0 60px",
            textWrap: "balance",
            opacity: headIn,
            transform: `translateY(${(1 - headIn) * 30}px)`,
            filter: `blur(${(1 - headIn) * 14}px)`,
            transition: "all .2s linear",
          }}
        >
          {h.srcTitle}
        </h2>

        <div className="src-split" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", gap: 60, alignItems: "center", display: "grid" }}>
          <div style={{ display: "grid" }}>
            {h.src.map(([title, desc], i) => {
              const rowIn = clamp01((p - 0.15 - i * 0.12) / 0.22);
              const isOpen = open === i;
              return (
                <div
                  key={title}
                  onClick={() => setOpen(i)}
                  style={{
                    borderTop: "1px solid rgba(10,10,10,.1)",
                    padding: "22px 0",
                    cursor: "pointer",
                    opacity: rowIn,
                    transform: `translateX(${(1 - rowIn) * -40}px)`,
                    filter: `blur(${(1 - rowIn) * 8}px)`,
                    transition: "opacity .25s, transform .25s, filter .25s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: isOpen ? C.mint : C.paper,
                          color: C.ink,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          transition: "background .4s",
                        }}
                      >
                        {icons[i]}
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 20,
                        color: C.grey,
                        display: "inline-block",
                        transform: `rotate(${isOpen ? 45 : 0}deg)`,
                        transition: "transform .4s cubic-bezier(.2,.8,.2,1)",
                      }}
                    >
                      +
                    </span>
                  </div>
                  <div
                    style={{
                      maxHeight: isOpen ? 140 : 0,
                      opacity: isOpen ? 1 : 0,
                      overflow: "hidden",
                      transition: "max-height .5s cubic-bezier(.2,.8,.2,1), opacity .4s",
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 0 4px 44px",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "#5a5a5a",
                        transform: `translateY(${isOpen ? 0 : -10}px)`,
                        transition: "transform .5s cubic-bezier(.2,.8,.2,1)",
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(10,10,10,.1)" }} />
          </div>

          <div
            style={{
              aspectRatio: "1",
              borderRadius: 14,
              background: "radial-gradient(ellipse at 30% 20%,#3a3a3a,#0a0a0a 70%)",
              position: "relative",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              opacity: cardIn,
              transform: `scale(${(0.92 + cardIn * 0.08).toFixed(3)}) translateY(${(1 - cardIn) * 40}px)`,
              filter: `blur(${(1 - cardIn) * 12}px)`,
              transition: "all .25s ease-out",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 50% 50%,rgba(61,226,156,.25),transparent 55%)",
              }}
            />
            <div
              key={open}
              style={{
                position: "relative",
                textAlign: "center",
                color: C.white,
                animation: "blurInA .5s cubic-bezier(.2,.8,.2,1) both",
                padding: "0 24px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  opacity: 0.6,
                  marginBottom: 10,
                }}
              >
                {h.src[open][2]}
              </div>
              <div
                style={{
                  fontSize: "clamp(44px,5vw,72px)",
                  fontWeight: 500,
                  letterSpacing: "-.045em",
                  lineHeight: 1,
                  color: C.mint,
                }}
              >
                {values[open].value}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10, fontWeight: 600 }}>
                {values[open].sub}
              </div>
              {values[open].live && (
                <div
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: "rgba(61,226,156,.16)",
                    color: C.mint,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".06em",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: C.mint,
                      animation: "blink 1.6s infinite",
                    }}
                  />
                  {h.live.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
