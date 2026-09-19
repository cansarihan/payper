"use client";

import { C, FONT } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import { useScrollProgress } from "@/lib/useScrollProgress";

/**
 * The five steps as a pipeline you scroll through.
 *
 * A rail across the top fills as the section passes and the card beneath it
 * swaps to the step the rail has reached, so the sequence is read one call at
 * a time rather than as five paragraphs stacked on top of each other.
 */

const FNS = ["register", "acknowledge", "quote", "fund", "repay"];
const COLOURS = [C.mint, C.blue, C.coral, C.lime, C.mint];
const ON_COLOUR = [C.ink, C.white, C.white, C.ink, C.ink];

export function Flow({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [ref, p] = useScrollProgress<HTMLElement>(0.45);
  const count = d.steps.length;
  const stage = Math.min(count - 1, Math.floor(p * count));
  const [title, desc, tech] = d.steps[stage];
  const accent = COLOURS[stage];
  const q = lang === "en" ? "" : `?lang=${lang}`;

  return (
    <section
      id="how"
      ref={ref}
      style={{
        background: "radial-gradient(ellipse at 50% 0%,#141414,#050505 70%)",
        color: C.white,
        height: `${count * 70 + 60}vh`,
        position: "relative",
        scrollMarginTop: 0,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: 34,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "110px 32px 48px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "clamp(30px,4.4vw,58px)",
              fontWeight: 500,
              letterSpacing: "-.04em",
              lineHeight: 1.02,
              margin: "0 0 14px",
              textWrap: "balance",
            }}
          >
            {d.howTitle}
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.62)",
              maxWidth: 620,
              margin: 0,
              fontWeight: 500,
            }}
          >
            {d.howP}
          </p>
        </div>

        <div style={{ position: "relative", display: "grid", gap: 14 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 21,
              height: 2,
              background: "rgba(255,255,255,.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 21,
              height: 2,
              width: `${(stage / Math.max(1, count - 1)) * 100}%`,
              background: `linear-gradient(90deg,${C.mint},${accent})`,
              transition: "width .45s cubic-bezier(.2,.8,.2,1), background .45s",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${count},minmax(0,1fr))`,
            }}
          >
            {d.steps.map(([label], i) => {
              const done = i <= stage;
              const here = i === stage;
              return (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    justifyItems: i === 0 ? "start" : i === count - 1 ? "end" : "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: FONT.mono,
                      fontSize: 13,
                      fontWeight: 700,
                      background: done ? COLOURS[i] : "#151517",
                      color: done ? ON_COLOUR[i] : "rgba(255,255,255,.45)",
                      border: done ? "0" : "1px solid rgba(255,255,255,.14)",
                      boxShadow: here ? `0 0 0 6px ${COLOURS[i]}26` : "none",
                      transform: here ? "scale(1.08)" : "scale(1)",
                      transition: "all .45s cubic-bezier(.2,.8,.2,1)",
                    }}
                  >
                    0{i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 10.5,
                      letterSpacing: ".04em",
                      color: here ? COLOURS[i] : "rgba(255,255,255,.35)",
                      whiteSpace: "nowrap",
                      transition: "color .45s",
                    }}
                  >
                    {FNS[i]}()
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          key={stage}
          style={{
            alignSelf: "start",
            borderRadius: 24,
            padding: "clamp(26px,3.4vw,42px)",
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.08)",
            display: "grid",
            gap: 18,
            alignContent: "start",
            animation: "blurInA .55s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".06em",
                color: accent,
              }}
            >
              {d.step} {String(stage + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                color: accent,
                background: "rgba(255,255,255,.06)",
                padding: "3px 9px",
                borderRadius: 6,
              }}
            >
              {FNS[stage]}()
            </span>
          </div>

          <div
            style={{
              fontSize: "clamp(28px,3.6vw,50px)",
              fontWeight: 500,
              letterSpacing: "-.035em",
              lineHeight: 1.02,
              textWrap: "balance",
            }}
          >
            {title}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.72)",
              maxWidth: 720,
            }}
          >
            {desc}
          </p>

          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 11.5,
              lineHeight: 1.7,
              color: "rgba(255,255,255,.45)",
              borderTop: "1px solid rgba(255,255,255,.08)",
              paddingTop: 16,
              overflowWrap: "anywhere",
            }}
          >
            {tech}
          </div>

          {stage === count - 1 && (
            <a
              href={`/app${q}`}
              style={{
                justifySelf: "start",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                background: C.mint,
                color: C.ink,
                borderRadius: 999,
                padding: "8px 8px 8px 22px",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span>{d.uploadCta}</span>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: C.ink,
                  color: C.mint,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                →
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
