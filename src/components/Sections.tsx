import { C, FONT } from "@/lib/design";
import type { t } from "@/lib/i18n/dictionary";

type Copy = ReturnType<typeof t>;

/** The seven steps, each named with the call behind it. */
export function Steps({ d }: { d: Copy }) {
  return (
    <Section id="how">
      <Heading>{d.howTitle}</Heading>
      <div style={{ display: "grid", gap: 10, marginTop: 34 }}>
        {d.howSteps.map(([title, call, body], i) => (
          <div
            key={call}
            className={i % 2 ? "reveal-2" : "reveal"}
            style={{
              display: "grid",
              gridTemplateColumns: "48px minmax(0,1fr)",
              gap: 20,
              alignItems: "start",
              padding: "22px 24px",
              borderRadius: 22,
              background: "#101010",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: i === 0 ? C.mint : "#1C1C1E",
                color: i === 0 ? C.ink : "rgba(255,255,255,.6)",
                display: "grid",
                placeItems: "center",
                fontFamily: FONT.mono,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>
                  {title}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.mint }}>{call}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,.62)",
                  maxWidth: 640,
                }}
              >
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Who this is for, said in their own terms. */
export function Ways({ d }: { d: Copy }) {
  const tones = [C.mint, C.blue, C.lime];
  return (
    <Section id="who">
      <Heading>{d.waysTitle}</Heading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 14,
          marginTop: 34,
        }}
      >
        {d.ways.map(([who, body], i) => (
          <div
            key={who}
            className={["reveal", "reveal-2", "reveal"][i]}
            style={{
              background: i === 0 ? C.mint : "#101010",
              color: i === 0 ? C.ink : C.white,
              borderRadius: 26,
              padding: "26px 24px",
              display: "grid",
              gap: 14,
              minHeight: 200,
              alignContent: "start",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === 0 ? C.ink : tones[i],
              }}
            />
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.03em" }}>{who}</span>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: i === 0 ? "rgba(10,10,10,.72)" : "rgba(255,255,255,.62)",
              }}
            >
              {body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** The three claims, each stated so it can be checked. */
export function Pillars({ d }: { d: Copy }) {
  return (
    <Section id="why">
      <Heading>{d.pillarsTitle}</Heading>
      <div style={{ display: "grid", gap: 12, marginTop: 34 }}>
        {d.pillars.map(([title, body], i) => (
          <div
            key={title}
            className={i % 2 ? "reveal-2" : "reveal"}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,.8fr) minmax(0,1.2fr)",
              gap: 26,
              padding: "28px 26px",
              borderRadius: 26,
              background: "#101010",
              alignItems: "start",
            }}
            data-pillar
          >
            <h3
              style={{
                margin: 0,
                fontSize: "clamp(20px,2.4vw,28px)",
                fontWeight: 600,
                letterSpacing: "-.03em",
                lineHeight: 1.15,
              }}
            >
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,.65)" }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Closing, with the two links that let someone check the claims. */
export function Closing({
  d,
  lang,
  contract,
  network,
}: {
  d: Copy;
  lang: string;
  contract: string;
  network: string;
}) {
  return (
    <Section>
      <div
        className="reveal-lg"
        style={{
          background: C.mint,
          color: C.ink,
          borderRadius: 34,
          padding: "clamp(34px,6vw,64px)",
          display: "grid",
          gap: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(30px,5vw,58px)",
            fontWeight: 600,
            letterSpacing: "-.045em",
            lineHeight: 1,
          }}
        >
          {d.closingTitle}
        </h2>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, maxWidth: 560, fontWeight: 500 }}>
          {d.closingLead}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <a
            href={lang === "en" ? "/app" : `/app?lang=${lang}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: C.ink,
              color: C.white,
              borderRadius: 999,
              padding: "14px 14px 14px 26px",
              fontSize: 15.5,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {d.openPanel}
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: C.mint,
                color: C.ink,
                display: "grid",
                placeItems: "center",
              }}
            >
              →
            </span>
          </a>
          <a
            href={`https://stellar.expert/explorer/${
              network === "mainnet" ? "public" : "testnet"
            }/contract/${contract}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: `1px solid ${C.ink}`,
              borderRadius: 999,
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              color: C.ink,
            }}
          >
            stellar.expert ↗
          </a>
        </div>
      </div>
    </Section>
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
