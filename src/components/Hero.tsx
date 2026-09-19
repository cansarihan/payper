import { LangSwitch } from "@/components/LangSwitch";
import { Lockup } from "@/components/Logo";
import { C, FONT } from "@/lib/design";
import type { Lang, t } from "@/lib/i18n/dictionary";

type Copy = ReturnType<typeof t>;

const RIBBON =
  "linear-gradient(90deg,transparent 0,rgba(255,255,255,.02) 30%,rgba(230,230,230,.9) 47%,#fff 50%,rgba(210,210,210,.85) 53%,rgba(255,255,255,.02) 70%,transparent)";

const PARTNERS = [
  "Stellar",
  "Soroban",
  "DeFindex",
  "Reflector",
  "SEP-6",
  "SEP-38",
  "SEP-10",
  "SEP-53",
  "USDC",
  "UBL-TR",
  "Rise In",
];

export function TopNav({ d, lang }: { d: Copy; lang: Lang }) {
  const q = lang === "en" ? "" : `?lang=${lang}`;
  return (
    <header
      style={{
        position: "fixed",
        top: 14,
        left: 0,
        right: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <nav
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 6px 6px 18px",
          borderRadius: 999,
          background: "rgba(14,14,16,.92)",
          border: "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        <a
          href={`/${q}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginRight: 12,
            textDecoration: "none",
          }}
        >
          <Lockup colour={C.white} size={24} />
        </a>
        {d.landingNav.map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{
              padding: "10px 13px",
              fontSize: 13.5,
              fontWeight: 600,
              color: C.white,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </a>
        ))}
        <LangSwitch lang={lang} />
        <a
          href={`/app${q}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.mint,
            color: C.ink,
            borderRadius: 999,
            padding: "6px 6px 6px 18px",
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {d.openPanel}
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: C.ink,
              color: C.mint,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
            }}
          >
            →
          </span>
        </a>
      </nav>
    </header>
  );
}

export function Hero({
  d,
  lang,
  stats,
}: {
  d: Copy;
  lang: Lang;
  stats: readonly (readonly [string, string, string])[];
}) {
  const q = lang === "en" ? "" : `?lang=${lang}`;
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "1fr auto",
        background: "radial-gradient(ellipse at 50% 100%,#1c1c1c,#050505 70%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "-12%",
          top: "-30%",
          width: "24vw",
          height: "170vh",
          transform: "rotate(22deg)",
          background: RIBBON,
          filter: "blur(1.5px)",
          opacity: 0.9,
          animation: "ribbonL 30s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-8%",
          top: "-40%",
          width: "20vw",
          height: "180vh",
          transform: "rotate(18deg)",
          background: RIBBON,
          filter: "blur(1.5px)",
          opacity: 0.85,
          animation: "ribbonR 34s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%,transparent 30%,rgba(5,5,5,.9) 75%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "170px 24px 60px",
        }}
      >
        <div style={{ maxWidth: 1000 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 26,
              fontFamily: FONT.mono,
              fontSize: 12,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: C.mint,
              animation: "blurIn 1.2s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.mint,
                animation: "pulse 2s infinite",
              }}
            />
            {d.liveNow}
          </div>

          <h1
            style={{
              fontSize: "clamp(44px,7.4vw,108px)",
              lineHeight: 0.98,
              fontWeight: 500,
              letterSpacing: "-.04em",
              margin: "0 0 28px",
              textWrap: "balance",
              animation: "blurIn 1.4s cubic-bezier(.2,.8,.2,1) .15s both",
            }}
          >
            {d.tagline[0]}
            <br />
            <span style={{ color: C.mint }}>{d.tagline[1]}</span>
          </h1>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.72)",
              maxWidth: 640,
              margin: "0 auto 36px",
              fontWeight: 500,
              animation: "blurIn 1.2s cubic-bezier(.2,.8,.2,1) .5s both",
            }}
          >
            {d.lead} <b style={{ color: C.white }}>{d.leadEmphasis}</b>
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              animation: "blurIn 1.2s cubic-bezier(.2,.8,.2,1) .7s both",
            }}
          >
            <HeroButton href={`/app${q}`} primary>
              {d.uploadCta}
            </HeroButton>
            <HeroButton href="#how">{d.exploreCta}</HeroButton>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 1240,
          width: "100%",
          margin: "0 auto",
          padding: "0 32px 48px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 24,
          animation: "blurIn 1.2s cubic-bezier(.2,.8,.2,1) .95s both",
        }}
      >
        {stats.map(([prefix, value, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: "clamp(32px,3.2vw,48px)",
                fontWeight: 500,
                letterSpacing: "-.04em",
                lineHeight: 1,
              }}
            >
              {prefix && (
                <span style={{ fontSize: ".55em", opacity: 0.6, verticalAlign: "top" }}>
                  {prefix}
                </span>
              )}
              {value}
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
                lineHeight: 1.3,
                maxWidth: 140,
              }}
            >
              {label}
            </span>
          </div>
        ))}
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

export function Marquee() {
  return (
    <section
      style={{
        background: C.white,
        color: C.ink,
        padding: "30px 0",
        overflow: "hidden",
        maskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",
        WebkitMaskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 72,
          width: "max-content",
          animation: "marquee 34s linear infinite",
          alignItems: "center",
        }}
      >
        {[...PARTNERS, ...PARTNERS].map((p, i) => (
          <span
            key={i}
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-.03em",
              color: C.grey,
              whiteSpace: "nowrap",
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

function HeroButton({
  children,
  href,
  primary,
}: {
  children: React.ReactNode;
  href: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        background: primary ? C.mint : "rgba(255,255,255,.06)",
        border: primary ? 0 : "1px solid rgba(255,255,255,.12)",
        color: primary ? C.ink : C.white,
        borderRadius: 999,
        padding: "8px 8px 8px 22px",
        fontSize: 15.5,
        fontWeight: 700,
        textDecoration: "none",
        backdropFilter: "blur(10px)",
      }}
    >
      <span>{children}</span>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: primary ? C.ink : C.mint,
          color: primary ? C.mint : C.ink,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        →
      </span>
    </a>
  );
}
