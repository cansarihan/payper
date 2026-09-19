import { C, FONT, shortKey, trLira, trPct, usdc } from "@/lib/design";

export const dynamic = "force-dynamic";

/** Public page, rendered from chain state per request. No cache, no placeholder. */
export default async function Page() {
  const state = await loadState();

  return (
    <main style={{ background: C.black, color: C.white, minHeight: "100vh" }}>
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(60px,10vw,140px) 28px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: C.mint,
            marginBottom: 28,
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
          Stellar testnet · canlı
        </div>

        <h1
          style={{
            fontSize: "clamp(40px,7.5vw,92px)",
            fontWeight: 600,
            letterSpacing: "-.05em",
            lineHeight: .98,
            margin: "0 0 26px",
            textWrap: "balance",
          }}
        >
          Vadeli faturan,
          <br />
          <span style={{ color: C.mint }}>bugün hesabında.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px,2vw,20px)",
            lineHeight: 1.55,
            color: "rgba(255,255,255,.72)",
            maxWidth: 680,
            margin: "0 0 44px",
            fontWeight: 500,
          }}
        >
          KOBİ e-faturasını yükler, alıcı zincir üstünde onaylar, para aynı gün TL
          olarak bankaya düşer. Vadede alıcı öder; kontrat fonlayıcılara oransal
          dağıtır. İskonto sabit bir sayı değil —{" "}
          <b style={{ color: C.white }}>canlı zincir getirisinden ve kurdan hesaplanıyor.</b>
        </p>

        {state ? <LiveFigures state={state} /> : <Unreachable />}
      </section>
    </main>
  );
}

function LiveFigures({ state }: { state: State }) {
  const q = state.activeQuote;
  const annual = q && q.days > 0 ? (q.totalDiscountBps * 365) / q.days / 100 : null;

  const cards: { k: string; v: string; sub: string; tag?: string }[] = [
    {
      k: "Hazine getirisi",
      v: trPct(state.treasury.apyBps),
      sub: "fonlanan sermaye buradan getiri üretir",
      tag: state.treasury.apySource,
    },
    q
      ? {
          k: "Canlı iskonto",
          v: trPct(q.totalDiscountBps),
          sub: `${q.days} gün · yıllık ~%${annual!.toFixed(1)}`,
          tag: q.fxSource === "live" && q.yieldSource === "live" ? "live" : "fallback",
        }
      : { k: "Canlı iskonto", v: "—", sub: "fiyatlanacak fatura yok" },
    {
      k: "Defterdeki fatura",
      v: String(state.invoices.length),
      sub: `${state.invoices.filter((i) => i.status === "repaid").length} tanesi vadesinde ödendi`,
    },
    {
      k: "Hazine varlığı",
      v: usdc(state.treasury.assets),
      sub: state.anchor ? `${state.anchor.homeDomain} · SEP-6` : "anchor okunamadı",
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
                  {c.tag === "live" ? "canlı" : "fallback"}
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
          ["kontrat", shortKey(state.contracts.invoice, 6, 6)],
          ["hazine", shortKey(state.contracts.treasury, 6, 6)],
          ["besleme", shortKey(state.contracts.fxOracle, 6, 6)],
          ["anchor", state.anchor?.homeDomain ?? "—"],
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
          Şu an işlenen fatura <b style={{ color: C.white }}>#{state.active.id}</b> ·{" "}
          {trLira(state.active.amountFiat)} · durum <b style={{ color: C.mint }}>{state.active.status}</b>.
          Bu sayfadaki her rakam istek anında zincirden okundu.
        </p>
      )}
    </>
  );
}

const Unreachable = () => (
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
    Zincir şu anda okunamıyor, bu yüzden buraya sayı yazmıyoruz. Sayfa sahte bir
    değer göstermektense boş kalır.
  </div>
);

interface State {
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
