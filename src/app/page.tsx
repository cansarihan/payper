import { Hero, Marquee, TopNav } from "@/components/Hero";
import { Closing, Pillars, Steps, Ways } from "@/components/Sections";
import { C, FONT, shortKey, trLira, trNumber, trPct, usdc } from "@/lib/design";
import { DEFAULT_LANG, isLang, t, type Lang } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

/** Public page, rendered from chain state per request. No cache, no placeholder. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: requested } = await searchParams;
  const lang: Lang = isLang(requested) ? requested : DEFAULT_LANG;
  const d = t(lang);
  const state = await loadState();

  const financed = state
    ? state.invoices
        .filter((i) => i.status === "funded" || i.status === "repaid")
        .reduce((sum, i) => sum + Number(i.amountFiat) / 100, 0)
    : 0;
  const stats: [string, string, string][] = [
    ["\u20ba", state ? trNumber(financed, 0) : "\u00b7\u00b7", d.statsLabels[0]],
    ["", state ? String(state.invoices.length) : "\u00b7\u00b7", d.statsLabels[1]],
    [
      "%",
      state ? trNumber(state.treasury.apyBps / 100, 2) : "\u00b7\u00b7",
      state
        ? `${d.statsLabels[2]} \u00b7 ${state.treasury.apySource === "live" ? d.tagLive : d.tagFallback}`
        : `${d.statsLabels[2]} \u00b7 ${d.loading}`,
    ],
    ["", String(state?.invoices.filter((i) => i.status === "defaulted").length ?? 0), d.statsLabels[3]],
  ];

  return (
    <main style={{ background: C.black, color: C.white, minHeight: "100vh" }}>
      <TopNav d={d} lang={lang} />
      <Hero d={d} lang={lang} stats={stats} />
      <Marquee />

      <section id="proof" style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(60px,9vw,110px) 28px 0" }}>
        <h2
          className="reveal-lg"
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(28px,4.4vw,52px)",
            fontWeight: 600,
            letterSpacing: "-.045em",
            lineHeight: 1.05,
            textWrap: "balance",
            maxWidth: 820,
          }}
        >
          {d.proofTitle}
        </h2>
        <p
          className="reveal"
          style={{
            margin: "0 0 34px",
            fontSize: 16.5,
            lineHeight: 1.6,
            color: "rgba(255,255,255,.65)",
            maxWidth: 640,
            fontWeight: 500,
          }}
        >
          {d.proofLead}
        </p>
        {state ? <LiveFigures state={state} d={d} /> : <Unreachable d={d} />}
      </section>

      <Steps d={d} />
      <Ways d={d} />
      <Pillars d={d} />
      <Closing
        d={d}
        lang={lang}
        contract={state?.contracts.invoice ?? ""}
        network={state?.network ?? "testnet"}
      />
      <Wordmark />
      <Foot d={d} state={state} lang={lang} />
    </main>
  );
}

/** The closing wordmark: one word, large enough to read as a full stop. */
function Wordmark() {
  return (
    <div
      style={{
        overflow: "hidden",
        padding: "clamp(50px,8vw,90px) 32px 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "end",
        lineHeight: 0.8,
      }}
    >
      <div
        style={{
          fontSize: "clamp(90px,22vw,340px)",
          fontWeight: 800,
          letterSpacing: "-.06em",
          color: "transparent",
          background: "linear-gradient(180deg,#242424,#080808)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          transform: "translateY(12%)",
          userSelect: "none",
        }}
      >
        payper
      </div>
    </div>
  );
}

/** Footer facts, read from the running deployment rather than written here. */
function Foot({ d, state, lang }: { d: ReturnType<typeof t>; state: State | null; lang: Lang }) {
  const items = [
    state?.contracts.invoice ? `${d.contract} ${shortKey(state.contracts.invoice, 4, 4)}` : d.contract,
    "SEP-1 · 6 · 10 · 12 · 38 · 40 · 53",
    state?.anchor?.homeDomain ?? "anchor",
    "Soroban",
  ];
  return (
    <footer
      style={{
        padding: "26px 28px 30px",
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 11.5,
        color: "rgba(255,255,255,.42)",
        fontFamily: FONT.mono,
      }}
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {items.map((i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
      <div>
        payper · {d.footerNote}
        {lang !== "en" && " · "}
      </div>
    </footer>
  );
}

function LiveFigures({ state, d }: { state: State; d: ReturnType<typeof t> }) {
  const q = state.activeQuote;
  const annual = q && q.days > 0 ? (q.totalDiscountBps * 365) / q.days / 100 : null;

  const cards: { k: string; v: string; sub: string; tag?: string }[] = [
    {
      k: d.treasuryYield,
      v: trPct(state.treasury.apyBps),
      sub: d.treasuryYieldSub,
      tag: state.treasury.apySource,
    },
    q
      ? {
          k: d.liveDiscount,
          v: trPct(q.totalDiscountBps),
          sub: `${q.days} ${d.days} · ${d.annual} ~%${annual!.toFixed(1)}`,
          tag: q.fxSource === "live" && q.yieldSource === "live" ? "live" : "fallback",
        }
      : { k: d.liveDiscount, v: "—", sub: d.noInvoiceToPrice },
    {
      k: d.bookSize,
      v: String(state.invoices.length),
      sub: `${state.invoices.filter((i) => i.status === "repaid").length} ${d.settledSuffix}`,
    },
    {
      k: d.treasuryAssets,
      v: usdc(state.treasury.assets),
      sub: state.anchor ? `${state.anchor.homeDomain} · SEP-6` : d.anchorUnreadable,
    },
  ];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
          marginBottom: 34,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.k}
            className="reveal"
            style={{ background: "#121212", borderRadius: 22, padding: "22px 24px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.62)" }}>
                {c.k}
              </span>
              {c.tag && (
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 9,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: c.tag === "live" ? "rgba(61,226,156,.16)" : "rgba(245,165,36,.18)",
                    color: c.tag === "live" ? C.mint : C.amber,
                  }}
                >
                  {c.tag === "live" ? d.tagLive : d.tagFallback}
                </span>
              )}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>
              {c.v}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.45)",
                marginTop: 8,
                lineHeight: 1.45,
              }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        className="reveal-2"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          fontFamily: FONT.mono,
          fontSize: 11.5,
          color: "rgba(255,255,255,.5)",
        }}
      >
        {[
          [d.contract, shortKey(state.contracts.invoice, 6, 6)],
          [d.treasury, shortKey(state.contracts.treasury, 6, 6)],
          [d.feed, shortKey(state.contracts.fxOracle, 6, 6)],
          [d.anchor, state.anchor?.homeDomain ?? "—"],
          ["SEP", "1 · 10 · 12 · 38 · 6"],
        ].map(([k, v]) => (
          <span key={k} style={{ padding: "8px 14px", borderRadius: 999, background: "#121212" }}>
            <span style={{ opacity: .5 }}>{k}</span> {v}
          </span>
        ))}
      </div>

      {state.active && (
        <p
          style={{
            marginTop: 30,
            fontSize: 13.5,
            color: "rgba(255,255,255,.45)",
            lineHeight: 1.6,
          }}
        >
          {d.processing} <b style={{ color: C.white }}>#{state.active.id}</b> ·{" "}
          {trLira(state.active.amountFiat)} · {d.status}{" "}
          <b style={{ color: C.mint }}>{state.active.status}</b>. {d.everyFigure}
        </p>
      )}
    </>
  );
}

const Unreachable = ({ d }: { d: ReturnType<typeof t> }) => (
  <div
    style={{
      background: "rgba(245,165,36,.14)",
      color: C.amber,
      borderRadius: 20,
      padding: "20px 22px",
      fontSize: 14,
      lineHeight: 1.6,
      maxWidth: 620,
    }}
  >
    {d.chainUnreachable}
  </div>
);

interface State {
  network: string;
  contracts: { invoice: string; treasury: string; fxOracle: string };
  invoices: { id: number; status: string; amountFiat: string }[];
  active: { id: number; status: string; amountFiat: string } | null;
  activeQuote: { days: number; totalDiscountBps: number; fxSource: string; yieldSource: string } | null;
  treasury: { apyBps: number; apySource: string; assets: string };
  anchor: { homeDomain: string } | null;
}

/** Call the route handler directly rather than over HTTP. */
async function loadState(): Promise<State | null> {
  try {
    const { GET } = await import("./api/state/route");
    const res = await GET();
    const body = (await res.json()) as State & { ok: boolean };
    return body.ok ? body : null;
  } catch {
    return null;
  }
}
