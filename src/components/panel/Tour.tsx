"use client";

import { useEffect, useState } from "react";

import { C, FONT } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";
import type { AppState } from "@/lib/types";
import type { Screen } from "./Shell";

interface Stop {
  screen: Screen;
  title: string;
  body: string;
  /** What on this screen came off the chain, so nothing looks staged. */
  live: string;
}

/**
 * A guided walk through the product, for someone seeing it for the first time.
 *
 * Eight screens in a fixed order is obvious once you know the product and
 * opaque when you do not, so this drives the navigation and says, at each stop,
 * what to look at and which figures were read from chain. It shows the real
 * screens against the real ledger — there is no rehearsed path and no
 * substitute data, which is the only version worth putting in front of a jury.
 */
export function Tour({
  lang,
  state,
  onGo,
  onClose,
}: {
  lang: Lang;
  state: AppState | null;
  onGo: (s: Screen) => void;
  onClose: () => void;
}) {
  const [at, setAt] = useState(0);
  const stops = lang === "tr" ? tr(state) : en(state);
  const stop = stops[at];

  useEffect(() => {
    onGo(stop.screen);
    window.scrollTo(0, 0);
  }, [at, stop.screen, onGo]);

  // Arrow keys and Escape: a walkthrough nobody can drive from the keyboard is
  // a slideshow.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setAt((i) => Math.min(stops.length - 1, i + 1));
      if (e.key === "ArrowLeft") setAt((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [stops.length, onClose]);

  const last = at === stops.length - 1;

  return (
    <div
      role="dialog"
      aria-label={lang === "tr" ? "Ürün turu" : "Product tour"}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        zIndex: 70,
        width: "min(720px, calc(100vw - 32px))",
        background: C.ink,
        color: C.white,
        borderRadius: 24,
        padding: "18px 20px",
        boxShadow: "0 24px 70px rgba(0,0,0,.4)",
        animation: "popIn .3s cubic-bezier(.2,.8,.2,1) both",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT.mono,
            fontSize: 11,
            color: C.mint,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: C.mint,
              animation: "pulse 2s infinite",
            }}
          />
          {at + 1} / {stops.length}
        </span>
        <button
          onClick={onClose}
          style={{
            border: 0,
            background: "rgba(255,255,255,.1)",
            color: C.white,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {lang === "tr" ? "Turu kapat" : "Close tour"}
        </button>
      </div>

      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 5 }}>
        {stop.title}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, margin: "0 0 10px", color: "#DDD" }}>{stop.body}</p>
      <div
        style={{
          display: "flex",
          alignItems: "start",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          background: C.panel,
          fontFamily: FONT.mono,
          fontSize: 11,
          color: C.mint,
          lineHeight: 1.5,
          marginBottom: 12,
          overflowWrap: "anywhere",
        }}
      >
        <span aria-hidden>◉</span>
        <span>{stop.live}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {stops.map((s, i) => (
            <button
              key={s.screen + i}
              onClick={() => setAt(i)}
              aria-label={`${i + 1}`}
              style={{
                flex: 1,
                height: 4,
                border: 0,
                padding: 0,
                borderRadius: 999,
                background: i <= at ? C.mint : "rgba(255,255,255,.18)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setAt((i) => Math.max(0, i - 1))}
          disabled={at === 0}
          style={{
            border: "1px solid rgba(255,255,255,.2)",
            background: "transparent",
            color: at === 0 ? "rgba(255,255,255,.3)" : C.white,
            borderRadius: 999,
            padding: "9px 16px",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          ←
        </button>
        <button
          onClick={() => (last ? onClose() : setAt((i) => i + 1))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: 0,
            borderRadius: 999,
            padding: "9px 10px 9px 18px",
            background: C.mint,
            color: C.ink,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {last ? (lang === "tr" ? "Bitir" : "Finish") : lang === "tr" ? "Sıradaki" : "Next"}
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: C.ink,
              color: C.mint,
              display: "grid",
              placeItems: "center",
            }}
          >
            {last ? "✓" : "→"}
          </span>
        </button>
      </div>
    </div>
  );
}

const usdc = (v: string | undefined) => (v ? (Number(v) / 1e7).toFixed(2) : "—");
const pct = (bps: number | undefined) => `%${((bps ?? 0) / 100).toFixed(2)}`;

const en = (s: AppState | null): Stop[] => [
  {
    screen: "overview",
    title: "Overview · the book as it stands",
    body: "The mint half is the supplier's position, the black half the treasury and what is awaiting a decision. No figure here is a constant; every one was read from the contract on this request.",
    live: `treasury ${usdc(s?.treasury.assets)} USDC · APY ${pct(s?.treasury.apyBps)} (${s?.treasury.apySource ?? "—"}) · ${s?.invoices.length ?? 0} invoices`,
  },
  {
    screen: "upload",
    title: "1 · Upload · ETTN uniqueness",
    body: "A real UBL-TR e-invoice goes in. Mandatory fields, the structure of the XAdES signature block and the document's SHA-256 are all checked. The point is the ETTN: the contract refuses a second registration of the same one, before anything else runs.",
    live: "register() writes on chain · the DataKey::Ettn record has its TTL extended to the maximum",
  },
  {
    screen: "buyer",
    title: "2 · Buyer acknowledgement · the lock",
    body: "Nobody but the address written on the invoice can confirm it — the contract compares them. Without this the invoice cannot be funded, because the buyer is the party who makes the receivable real.",
    live: "acknowledge() · only invoice.buyer passes require_auth",
  },
  {
    screen: "quote",
    title: "3 · The discount · the heart of it",
    body: "Four components, each returned with its provenance. The currency premium is measured from the feed's own history rather than assumed. A component that fell back to a parameter says so, and cannot be presented as live.",
    live: `quote() → ${pct(s?.activeQuote?.totalDiscountBps)} · fx ${s?.activeQuote?.fxSource ?? "—"} · yield ${s?.activeQuote?.yieldSource ?? "—"}`,
  },
  {
    screen: "anchor",
    title: "4 · The lira bridge · SEP-6, both ways",
    body: "The terminal on the right shows the real requests. The domain, the rate and every endpoint in the boxes above were discovered from the anchor's own stellar.toml at run time — none of it is hard-coded.",
    live: `${s?.anchor?.homeDomain ?? "anchor"} · SEP-38 sell ${s?.anchor?.rates?.sell_rate ?? "—"} · first loss ${usdc(s?.treasury.firstLoss)} USDC`,
  },
  {
    screen: "pay",
    title: "5 · Pay by sound",
    body: "A payment with no camera, no pairing and no data connection: 4-bit symbols become sixteen tones at 90 ms each, closed by a CRC-8. The receiver runs a 4096-point FFT and locks on the preamble. The frame test round-trips 2,000 random payloads byte for byte.",
    live: "encoder and decoder both run in the browser · the QR is a SEP-7 URI, generated locally",
  },
  {
    screen: "board",
    title: "6 · The funding board · the crowd",
    body: "How many people funded the invoice is set in the largest type, because that is the number worth remembering. Capital sits in the DeFindex vault while the round fills.",
    live: `fund() deposits into the vault · ${s?.activeFunders.length ?? 0} funders read from chain`,
  },
  {
    screen: "settle",
    title: "7 · Settlement, and the default waterfall",
    body: "At maturity the buyer pays and the contract distributes pro rata. If they do not, the same contract drains the first-loss buffer to funders first and records the remainder as a claim on the supplier. Declaring it early is refused on chain, not here.",
    live: `grace ${s?.limits.gracePeriodDays ?? "—"} days after the due date · mark_default() returns the split`,
  },
  {
    screen: "market",
    title: "Market · who pays, and what they pay today",
    body: "The factoring assumptions are sliders you set, and the comparison recomputes against the live quote. Turkey's policy rate is 37% — discounting a receivable below it would be pricing under the cost of money.",
    live: "the comparison runs on a real invoice in state and the live discount",
  },
];

const tr = (s: AppState | null): Stop[] => [
  {
    screen: "overview",
    title: "Genel bakış · defterin şu anki hâli",
    body: "Yeşil yarı tedarikçinin durumu, siyah yarı hazine ve karar bekleyenler. Buradaki hiçbir sayı sabit değil; hepsi bu istekte kontrattan okundu.",
    live: `hazine ${usdc(s?.treasury.assets)} USDC · APY ${pct(s?.treasury.apyBps)} (${s?.treasury.apySource ?? "—"}) · ${s?.invoices.length ?? 0} fatura`,
  },
  {
    screen: "upload",
    title: "1 · Fatura yükleme · ETTN tekilliği",
    body: "Gerçek bir UBL-TR e-faturası giriyor. Zorunlu alanlar, XAdES imza bloğunun yapısı ve belgenin SHA-256'sı kontrol ediliyor. Asıl mesele ETTN: kontrat aynısının ikinci kaydını, başka hiçbir şey çalışmadan reddediyor.",
    live: "register() zincire yazıyor · DataKey::Ettn kaydının TTL'i maksimuma çekiliyor",
  },
  {
    screen: "buyer",
    title: "2 · Alıcı onayı · ürünün kilidi",
    body: "Faturada yazılı adres dışında kimse onaylayamıyor — kontrat ikisini karşılaştırıyor. Bu onay olmadan fatura fonlanamıyor, çünkü alacağı gerçek kılan taraf alıcı.",
    live: "acknowledge() · require_auth'u yalnız invoice.buyer geçebilir",
  },
  {
    screen: "quote",
    title: "3 · İskonto · işin kalbi",
    body: "Dört bileşen, her biri kaynağıyla dönüyor. Kur primi varsayılmıyor, beslemenin kendi geçmişinden ölçülüyor. Yedeğe düşen bir bileşen bunu söylüyor ve canlı diye sunulamıyor.",
    live: `quote() → ${pct(s?.activeQuote?.totalDiscountBps)} · kur ${s?.activeQuote?.fxSource ?? "—"} · getiri ${s?.activeQuote?.yieldSource ?? "—"}`,
  },
  {
    screen: "anchor",
    title: "4 · TL köprüsü · çift yönlü SEP-6",
    body: "Sağdaki terminal gerçek istekleri gösteriyor. Üstteki kutulardaki alan adı, kur ve tüm uç noktalar kodda sabit değil — anchor'ın kendi stellar.toml'undan çalışma anında keşfedildi.",
    live: `${s?.anchor?.homeDomain ?? "anchor"} · SEP-38 satış ${s?.anchor?.rates?.sell_rate ?? "—"} · ilk zarar ${usdc(s?.treasury.firstLoss)} USDC`,
  },
  {
    screen: "pay",
    title: "5 · Sesle ödeme",
    body: "Kamerasız, eşleşmesiz, veri bağlantısız bir ödeme: 4-bit semboller 90 ms'lik on altı tona dönüşüyor, sonunu CRC-8 kapatıyor. Alıcı tarafta 4096 noktalı FFT senkron dizisine kilitleniyor. Çerçeve testi 2.000 rastgele yükü birebir geri döndürüyor.",
    live: "kodlayıcı da çözücü de tarayıcıda çalışıyor · QR yerelde üretilen bir SEP-7 URI'si",
  },
  {
    screen: "board",
    title: "6 · Fonlama panosu · kalabalık",
    body: "Faturayı kaç kişinin fonladığı en büyük puntoda, çünkü akılda kalması gereken sayı bu. Tur dolarken sermaye DeFindex vault'unda duruyor.",
    live: `fund() vault'a yatırıyor · ${s?.activeFunders.length ?? 0} fonlayıcı zincirden okundu`,
  },
  {
    screen: "settle",
    title: "7 · Kapanış ve temerrüt şelalesi",
    body: "Vadede alıcı ödüyor ve kontrat oransal dağıtıyor. Ödemezse aynı kontrat önce ilk zarar tamponunu fonlayıcılara boşaltıyor, kalanı tedarikçiden rücu alacağı olarak kaydediyor. Erken ilan burada değil, zincirde reddediliyor.",
    live: `vadeden sonra ${s?.limits.gracePeriodDays ?? "—"} gün ek süre · mark_default() dağılımı döndürüyor`,
  },
  {
    screen: "market",
    title: "Pazar · kim ödüyor, bugün neye ödüyor",
    body: "Faktoring varsayımlarını kaydırıcılarla sen giriyorsun; karşılaştırma canlı teklife göre yeniden hesaplanıyor. TCMB politika faizi %37 — bir alacağı bunun altında iskonto etmek paranın maliyetinin altında fiyatlamak olurdu.",
    live: "karşılaştırma state'teki gerçek faturadan ve canlı iskontodan hesaplanıyor",
  },
];
