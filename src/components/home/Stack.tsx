"use client";

import { C, FONT } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";
import { home } from "@/lib/i18n/home";
import { useScrollProgress } from "@/lib/useScrollProgress";

/**
 * The six layers the product is built out of, stacked as isometric slabs.
 *
 * Scroll-driven: each layer drops into place as the section passes and the card
 * beside it swaps to that layer's description, so the architecture is read one
 * floor at a time instead of as a diagram to decode.
 */

const ACCENTS = [C.blue, C.mint, C.amber, C.coral, C.lime, C.mint];
const ACCENT_FG = [C.white, C.ink, C.ink, C.white, C.ink, C.ink];

export function Stack({ lang }: { lang: Lang }) {
  const h = home(lang);
  const [ref, p] = useScrollProgress<HTMLElement>(0.45);
  const count = h.layers.length;
  const stage = Math.min(count - 1, Math.floor(p * count));
  const current = h.layers[stage];

  return (
    <section
      ref={ref}
      style={{
        background: C.white,
        color: C.ink,
        height: `${count * 70 + 60}vh`,
        position: "relative",
      }}
    >
      <div
        className="stack-split"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "grid",
          alignItems: "center",
          gap: 40,
          maxWidth: 1300,
          margin: "0 auto",
          padding: "90px 32px 0",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 3,
            width: `${Math.round(((stage + 1) / count) * 100)}%`,
            background: `linear-gradient(90deg,${C.blue},${C.mint})`,
            transition: "width .2s",
          }}
        />

        <div style={{ position: "relative", height: "min(600px,80vh)", display: "grid", placeItems: "center" }}>
          <div style={{ position: "relative", width: "min(560px,100%)", aspectRatio: "560/430" }}>
            {h.layers.map(([name], i) => {
              const on = i <= stage;
              const top = i === count - 1;
              const accent = ACCENTS[i];
              return (
                <div
                  key={name}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transform: `translateY(${-i * 40}px)`,
                    opacity: on ? 1 : 0,
                    transition: "opacity .3s",
                    filter: "drop-shadow(0 22px 34px rgba(0,0,0,.22))",
                  }}
                >
                  <div
                    style={{
                      animation: on ? "layerDrop .9s cubic-bezier(.2,.8,.2,1) both" : "none",
                    }}
                  >
                    <svg viewBox="0 0 560 340" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
                      <defs>
                        <linearGradient id={`pprLayer${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor={top ? "#5DF2B4" : i === stage ? "#4a4a4a" : "#3c3c3c"} />
                          <stop offset="1" stopColor={top ? C.green : i === stage ? "#1a1a1a" : "#141414"} />
                        </linearGradient>
                      </defs>
                      <polygon points="0,140 280,0 560,140 280,280" fill={`url(#pprLayer${i})`} />
                      <polygon points="0,140 280,280 280,310 0,170" fill={top ? C.green : "#111"} />
                      <polygon points="280,280 560,140 560,170 280,310" fill={top ? "#2fbf84" : "#1d1d1d"} />
                      <polygon points="280,280 560,140 560,146 280,286" fill={accent} opacity=".95" />
                      <polygon points="0,140 280,280 280,286 0,146" fill={accent} opacity=".55" />
                      {top && (
                        <>
                          <polygon points="70,140 280,35 490,140 280,245" fill="rgba(0,0,0,.14)" />
                          <text
                            x="280"
                            y="150"
                            textAnchor="middle"
                            transform="rotate(-26.6 280 140)"
                            fill={C.ink}
                            fontFamily="Urbanist,sans-serif"
                            fontWeight="800"
                            fontSize="30"
                            letterSpacing="-0.5"
                          >
                            payper
                          </text>
                        </>
                      )}
                      <text
                        x="420"
                        y="303"
                        textAnchor="middle"
                        transform="rotate(-26.6 420 298)"
                        fill={top ? C.ink : C.white}
                        fontFamily="Urbanist,sans-serif"
                        fontWeight="700"
                        fontSize="13"
                        letterSpacing=".2"
                      >
                        {name}
                      </text>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          key={stage}
          style={{
            borderRadius: 20,
            padding: "44px 32px",
            background: "linear-gradient(180deg,#fafafa,#f2f2f2)",
            border: "1px solid rgba(10,10,10,.05)",
            minHeight: 340,
            display: "grid",
            alignContent: "space-between",
            gap: 60,
            animation: "blurInA .6s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 22,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: ACCENTS[stage],
                  color: ACCENT_FG[stage],
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: FONT.mono,
                  transition: "background .4s",
                }}
              >
                {String(stage + 1).padStart(2, "0")}
              </span>
              {h.stackLabel} · {String(stage + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: "clamp(34px,4vw,56px)",
                fontWeight: 500,
                letterSpacing: "-.04em",
                lineHeight: 1,
              }}
            >
              {current[0]}
            </div>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.55, color: "#5a5a5a" }}>{current[1]}</div>
        </div>
      </div>
    </section>
  );
}
