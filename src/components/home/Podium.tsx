"use client";

import { C } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";
import { home } from "@/lib/i18n/home";
import { clamp01, easeOut, useScrollProgress } from "@/lib/useScrollProgress";

/**
 * Where invoice financing sits against other places a dollar can earn.
 *
 * Scroll-driven: bars grow out of the floor in a staggered order as the section
 * passes, so the comparison lands one column at a time. Our own column is the
 * live treasury APY; the rest are cited market references, which is what the
 * footnote is for.
 */
export function Podium({ lang, apyBps }: { lang: Lang; apyBps: number | null }) {
  const h = home(lang);
  const [ref, p] = useScrollProgress<HTMLElement>();
  const headIn = Math.min(1, p * 4);

  const bars = [
    { label: h.pod[0], value: "%4,00", height: 60, order: 3, ours: false },
    { label: h.pod[1], value: "%5,70", height: 79, order: 1, ours: false },
    {
      label: "◉ payper · treasury",
      // The only bar read from chain. Until it arrives it says so, because a
      // placeholder number next to four cited references would be indistinguishable
      // from them.
      value: apyBps === null ? "··" : `%${(apyBps / 100).toFixed(2).replace(".", ",")}`,
      height: 100,
      order: 0,
      ours: true,
    },
    { label: h.pod[2], value: "%4,50", height: 67, order: 2, ours: false },
    { label: h.pod[3], value: "%3,30", height: 52, order: 4, ours: false },
  ];

  return (
    <section
      ref={ref}
      style={{
        height: "260vh",
        position: "relative",
        background: "radial-gradient(ellipse at 50% 60%,#1a1a1a,#050505 70%)",
        color: C.white,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: 40,
          padding: "130px 32px 0",
        }}
      >
        <div
          style={{
            textAlign: "center",
            opacity: headIn,
            transform: `translateY(${(1 - headIn) * 30}px)`,
            filter: `blur(${(1 - headIn) * 14}px)`,
            transition: "all .2s linear",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(40px,5.2vw,72px)",
              fontWeight: 500,
              letterSpacing: "-.04em",
              lineHeight: 1,
              margin: "0 0 12px",
            }}
          >
            {h.podTitle}
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.75)", margin: 0, fontWeight: 500 }}>
            {h.podSub}
          </p>
        </div>

        <div
          style={{
            maxWidth: 1600,
            width: "100%",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(5,minmax(0,1fr))",
            gap: 18,
            alignItems: "end",
            alignSelf: "end",
          }}
        >
          {bars.map((b) => {
            const start = 0.12 + b.order * 0.09;
            const grow = easeOut(clamp01((p - start) / 0.28));
            const valueIn = clamp01((p - start - 0.22) / 0.18);
            return (
              <div
                key={b.label}
                style={{
                  display: "grid",
                  gridTemplateRows: "auto minmax(0,1fr)",
                  gap: 18,
                  alignItems: "end",
                  justifyItems: "center",
                  height: "min(500px,54vh)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    opacity: valueIn,
                    transform: `translateY(${(1 - valueIn) * 24}px)`,
                    filter: `blur(${(1 - valueIn) * 10}px)`,
                    transition: "all .25s ease-out",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      color: "rgba(255,255,255,.75)",
                      marginBottom: 6,
                    }}
                  >
                    APY
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(24px,3.6vw,54px)",
                      fontWeight: 500,
                      letterSpacing: "-.04em",
                      lineHeight: 1,
                    }}
                  >
                    {b.value}
                  </div>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${b.height}%`,
                    alignSelf: "end",
                    borderRadius: "10px 10px 0 0",
                    background: b.ours
                      ? `linear-gradient(180deg,${C.mint},${C.green})`
                      : "linear-gradient(180deg,#3a3a3a,#111)",
                    border: `1px solid ${b.ours ? C.mint : "rgba(255,255,255,.1)"}`,
                    borderBottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 26,
                    fontSize: 16,
                    fontWeight: 700,
                    color: b.ours ? C.ink : C.white,
                    transformOrigin: "bottom",
                    transform: `scaleY(${grow.toFixed(3)})`,
                    boxShadow: b.ours && grow > 0.5 ? "0 0 80px rgba(61,226,156,.35)" : "none",
                    transition: "transform .15s linear",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "center",
                      padding: "0 10px",
                      opacity: grow > 0.6 ? 1 : 0,
                      transition: "opacity .3s",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "14px 0 18px",
            opacity: p > 0.85 ? 1 : 0,
            transition: "opacity .3s",
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "9px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.1)",
              fontSize: 13,
              color: "rgba(255,255,255,.75)",
            }}
          >
            {h.podNote}
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg,${C.blue},${C.mint},${C.lime},${C.mint},${C.blue})`,
        }}
      />
    </section>
  );
}
