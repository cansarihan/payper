import { C, FONT, trPct } from "@/lib/design";
import type { Lang, t } from "@/lib/i18n/dictionary";
import { home } from "@/lib/i18n/home";

type Copy = ReturnType<typeof t>;

/** How it works: five steps, each one a contract call or a SEP flow. */
export function Steps({ d, lang }: { d: Copy; lang: Lang }) {
  const q = lang === "en" ? "" : `?lang=${lang}`;
  const fns = ["register", "acknowledge", "quote", "fund", "repay"];
  const colours = [C.mint, C.blue, C.coral, C.lime, C.mint];

  return (
    <section
      id="how"
      style={{
        background: C.black,
        color: C.white,
        padding: "130px 32px 80px",
        scrollMarginTop: 80,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          className="reveal-lg"
          style={{
            fontSize: "clamp(36px,5.4vw,74px)",
            fontWeight: 500,
            letterSpacing: "-.04em",
            lineHeight: 1.02,
            margin: "0 0 20px",
            textWrap: "balance",
          }}
        >
          {d.howTitle}
        </h2>
        <p
          className="reveal-2"
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: "rgba(255,255,255,.7)",
            maxWidth: 640,
            margin: "0 0 56px",
            fontWeight: 500,
          }}
        >
          {d.howP}
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {d.steps.map(([title, desc, tech], i) => (
            <div
              key={title}
              className={["reveal", "reveal-2", "reveal-3"][i % 3]}
              style={{
                display: "grid",
                gridTemplateColumns: "56px minmax(0,1fr)",
                gap: 22,
                alignItems: "start",
                padding: "26px 28px",
                borderRadius: 16,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: colours[i],
                  color: i === 1 || i === 2 ? C.white : C.ink,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                0{i + 1}
              </span>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.02em" }}>
                    {title}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 11,
                      color: colours[i],
                      background: "rgba(255,255,255,.06)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {fns[i]}()
                  </span>
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,.72)" }}>
                  {desc}
                </div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 11.5,
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,.45)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {tech}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44 }}>
          <a
            href={`/app${q}`}
            style={{
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
        </div>
      </div>
    </section>
  );
}

/**
 * Three ways in, as tall cards. Each one carries a figure read from chain, so
 * the audience and the number they would act on sit together.
 */
export function Ways({
  d,
  lang,
  apyBps,
  discountBps,
}: {
  d: Copy;
  lang: Lang;
  apyBps: number | null;
  discountBps: number | null;
}) {
  const q = lang === "en" ? "" : `?lang=${lang}`;
  const looks = [
    {
      bg: "linear-gradient(180deg,#1a1a1a,#050505)",
      fg: C.white,
      btn: C.mint,
      k: "APY",
      v: apyBps === null ? null : trPct(apyBps),
      href: `/app${q}`,
    },
    {
      bg: "linear-gradient(180deg,#bdbdbd,#8f8f8f)",
      fg: C.ink,
      btn: C.white,
      k: d.discount,
      v: discountBps === null ? null : trPct(discountBps),
      href: `/app${q}`,
    },
    {
      bg: "linear-gradient(180deg,#f4f4f4,#dedede)",
      fg: C.ink,
      btn: C.white,
      k: d.due,
      v: "T+0",
      href: `/app${q}`,
    },
  ];

  return (
    <section
      id="who"
      style={{
        background: C.white,
        color: C.ink,
        padding: "104px 32px 96px",
        display: "grid",
        alignContent: "center",
        scrollMarginTop: 80,
      }}
    >
      <h2
        className="reveal"
        style={{
          textAlign: "center",
          fontSize: "clamp(36px,5vw,68px)",
          fontWeight: 500,
          letterSpacing: "-.04em",
          lineHeight: 1,
          margin: "0 0 44px",
        }}
      >
        {d.waysTitle}
      </h2>
      <div
        style={{
          maxWidth: 1340,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          gap: 16,
        }}
      >
        {d.ways.map(([title, desc, cta], i) => {
          const look = looks[i];
          return (
            <div
              key={title}
              className="reveal"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 14,
                minHeight: 520,
                padding: "32px 30px",
                background: look.bg,
                color: look.fg,
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(30px,2.8vw,40px)",
                  fontWeight: 500,
                  letterSpacing: "-.035em",
                  lineHeight: 1.02,
                  maxWidth: 280,
                }}
              >
                {title}
              </div>
              <div style={{ alignSelf: "start", marginTop: 48 }}>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.65, marginBottom: 6 }}>
                  {look.k}
                </div>
                <div
                  style={{
                    fontSize: "clamp(44px,4.4vw,66px)",
                    fontWeight: 500,
                    letterSpacing: "-.045em",
                    lineHeight: 1,
                  }}
                >
                  {look.v ?? (
                    <span
                      aria-label={d.loading}
                      style={{
                        display: "inline-block",
                        width: "3.2em",
                        height: "0.62em",
                        borderRadius: 8,
                        background:
                          look.fg === C.white
                            ? "linear-gradient(90deg,rgba(255,255,255,.14),rgba(255,255,255,.28),rgba(255,255,255,.14))"
                            : "linear-gradient(90deg,rgba(10,10,10,.12),rgba(10,10,10,.22),rgba(10,10,10,.12))",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s linear infinite",
                      }}
                    />
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, opacity: 0.78, maxWidth: 330 }}>
                  {desc}
                </div>
                <a
                  href={look.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    background: look.btn,
                    color: C.ink,
                    borderRadius: 999,
                    padding: "6px 6px 6px 18px",
                    fontSize: 13.5,
                    fontWeight: 700,
                    justifySelf: "start",
                    textDecoration: "none",
                  }}
                >
                  <span>{cta}</span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: C.mint,
                      color: C.ink,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                    }}
                  >
                    →
                  </span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** What is different, on the dark half of the page. */
export function Pillars({ d }: { d: Copy }) {
  const tagBg = [C.mint, C.blue, C.coral];
  const tagFg = [C.ink, C.white, C.white];
  return (
    <section
      id="why"
      style={{
        background: "radial-gradient(ellipse at 50% 0%,#1c1c1c,#050505 70%)",
        color: C.white,
        display: "grid",
        alignContent: "center",
        padding: "100px 32px",
        scrollMarginTop: 80,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 14,
        }}
      >
        {d.pillars.map(([tag, title, desc], i) => (
          <div
            key={tag}
            className={["reveal", "reveal-2", "reveal-3"][i % 3]}
            style={{
              borderRadius: 14,
              padding: 30,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: tagBg[i % 3],
                color: tagFg[i % 3],
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".08em",
                marginBottom: 20,
                fontFamily: FONT.mono,
              }}
            >
              {tag}
            </span>
            <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 10 }}>
              {title}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,.65)" }}>
              {desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Where this came from, said once and plainly. */
export function LedBy({ lang }: { lang: Lang }) {
  const h = home(lang);
  return (
    <section
      style={{
        background: C.white,
        color: C.ink,
        display: "grid",
        placeItems: "center",
        padding: "110px 32px 40px",
        textAlign: "center",
      }}
    >
      <div className="reveal">
        <h2
          style={{
            fontSize: "clamp(40px,5.2vw,72px)",
            fontWeight: 500,
            letterSpacing: "-.04em",
            lineHeight: 1,
            margin: "0 0 16px",
            textWrap: "balance",
          }}
        >
          {h.ledTitle}
        </h2>
        <p style={{ fontSize: 16, color: "#6a6a6a", margin: "0 auto", maxWidth: 520, lineHeight: 1.55 }}>
          {h.ledP}
        </p>
      </div>
    </section>
  );
}

export function ModernCta({ d, lang }: { d: Copy; lang: Lang }) {
  const h = home(lang);
  const q = lang === "en" ? "" : `?lang=${lang}`;
  return (
    <section
      style={{
        background: C.white,
        color: C.ink,
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: "120px 32px",
        textAlign: "center",
      }}
    >
      <div className="reveal">
        <h2
          style={{
            fontSize: "clamp(40px,5.2vw,72px)",
            fontWeight: 500,
            letterSpacing: "-.04em",
            lineHeight: 1.02,
            margin: "0 0 34px",
            textWrap: "balance",
          }}
        >
          {h.modernTitle}
        </h2>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="#how"
            style={{
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
            <span>{d.exploreCta}</span>
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
          <a
            href={`/app${q}`}
            style={{
              color: C.ink,
              padding: "16px 20px",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {d.openPanel} ↗
          </a>
        </div>
      </div>
    </section>
  );
}

/** The closing statement, with every deployed contract linked beneath it. */
export function Closing({
  d,
  lang,
  contracts,
  network,
  anchorDomain,
  treasuryMode,
}: {
  d: Copy;
  lang: Lang;
  contracts: readonly (readonly [string, string])[];
  network: string;
  anchorDomain: string | null;
  treasuryMode: string | null;
}) {
  const h = home(lang);
  const q = lang === "en" ? "" : `?lang=${lang}`;
  const explorer = `https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}/contract`;

  return (
    <section
      style={{
        background: C.black,
        color: C.white,
        padding: "140px 32px 60px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 900,
          height: 500,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(61,226,156,.22),transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <h2
        className="reveal"
        style={{
          position: "relative",
          fontSize: "clamp(40px,6vw,92px)",
          fontWeight: 500,
          letterSpacing: "-.045em",
          lineHeight: 0.98,
          margin: "0 0 36px",
          textWrap: "balance",
        }}
      >
        {h.ctaTitle}
      </h2>
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href={`/app${q}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: C.mint,
            color: C.ink,
            borderRadius: 999,
            padding: "8px 8px 8px 24px",
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <span>{d.openPanel}</span>
          <span
            style={{
              width: 38,
              height: 38,
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
        <a
          href={`/app${q}`}
          style={{
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            color: C.white,
            borderRadius: 999,
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {h.ctaPool}
        </a>
      </div>

      {contracts.length > 0 && (
        <div
          style={{
            position: "relative",
            marginTop: 90,
            paddingTop: 34,
            borderTop: "1px solid rgba(255,255,255,.1)",
            display: "grid",
            gap: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              fontFamily: FONT.mono,
              fontSize: 11,
            }}
          >
            {contracts.map(([label, id]) => (
              <a
                key={label}
                href={`${explorer}/${id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 13px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.08)",
                  color: "rgba(255,255,255,.7)",
                  textDecoration: "none",
                }}
              >
                <span style={{ color: C.mint }}>{label}</span>
                {id.slice(0, 6)}…{id.slice(-4)} ↗
              </a>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              justifyContent: "center",
              fontSize: 12,
              color: "rgba(255,255,255,.45)",
            }}
          >
            <span>
              {lang === "tr" ? "Ağ" : "Network"}: {network}
            </span>
            {anchorDomain && <span>Anchor: {anchorDomain}</span>}
            {treasuryMode && (
              <span>
                {lang === "tr" ? "Hazine" : "Treasury"}: {treasuryMode}
              </span>
            )}
            <span>{d.footerNote}</span>
          </div>
        </div>
      )}
    </section>
  );
}

const Section = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section
    id={id}
    style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(60px,9vw,110px) 28px 0", scrollMarginTop: 90 }}
  >
    {children}
  </section>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2
    className="reveal-lg"
    style={{
      margin: 0,
      fontSize: "clamp(28px,4.4vw,52px)",
      fontWeight: 600,
      letterSpacing: "-.045em",
      lineHeight: 1.05,
      textWrap: "balance",
      maxWidth: 820,
    }}
  >
    {children}
  </h2>
);
