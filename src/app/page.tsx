import { Hero, Marquee, TopNav } from "@/components/Hero";
import { Podium } from "@/components/home/Podium";
import { Stack } from "@/components/home/Stack";
import { YieldSources } from "@/components/home/YieldSources";
import { Closing, LedBy, ModernCta, Pillars, Steps, Ways } from "@/components/Sections";
import { C, FONT, shortKey, trNumber } from "@/lib/design";
import { DEFAULT_LANG, isLang, t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState } from "@/lib/types";

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

      <Steps d={d} lang={lang} />
      <Ways
        d={d}
        lang={lang}
        apyBps={state?.treasury.apyBps ?? null}
        discountBps={state?.activeQuote?.totalDiscountBps ?? null}
      />
      <Podium lang={lang} apyBps={state?.treasury.apyBps ?? null} />
      <YieldSources lang={lang} state={state} />
      <Pillars d={d} />
      <LedBy lang={lang} />
      <Stack lang={lang} />
      <ModernCta d={d} lang={lang} />
      <Closing
        d={d}
        lang={lang}
        contracts={
          state
            ? ([
                [lang === "tr" ? "Fatura" : "Invoice", state.contracts.invoice],
                [lang === "tr" ? "Hazine" : "Treasury", state.contracts.treasury],
                ["TRY/USD", state.contracts.fxOracle],
              ] as [string, string][]).filter(([, id]) => !!id)
            : []
        }
        network={state?.network ?? "testnet"}
        anchorDomain={state?.anchor?.homeDomain ?? null}
        treasuryMode={state?.treasury.mode ?? null}
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
function Foot({ d, state, lang }: { d: ReturnType<typeof t>; state: AppState | null; lang: Lang }) {
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

/** Call the route handler directly rather than over HTTP. */
async function loadState(): Promise<AppState | null> {
  try {
    const { GET } = await import("./api/state/route");
    const res = await GET();
    const body = (await res.json()) as AppState & { ok: boolean };
    return body.ok ? body : null;
  } catch {
    return null;
  }
}
