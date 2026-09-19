"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { C, FONT } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";
import type { AppState } from "@/lib/types";
import type { Screen } from "./Shell";

interface Stop {
  screen: Screen;
  /** `data-tour` value of the element to light up. Absent means the whole screen. */
  target?: string;
  title: string;
  body: string;
  /** What here came off the chain, so nothing looks staged. */
  live: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A guided walk that points at things.
 *
 * The earlier version only changed screens and described them from a bar at the
 * bottom, which left the reader hunting for whatever was being talked about.
 * This one dims the page and cuts a hole around the element in question, so the
 * sentence and the thing it describes are never more than a glance apart.
 *
 * Several stops can share a screen; the navigation only moves when the stops on
 * the current one are spent.
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
  const [box, setBox] = useState<Box | null>(null);
  const stops = lang === "tr" ? tr(state) : en(state);
  const stop = stops[at];

  const back = useCallback(() => setAt((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setAt((i) => (i >= stops.length - 1 ? i : i + 1)),
    [stops.length],
  );

  useEffect(() => {
    onGo(stop.screen);
  }, [stop.screen, onGo]);

  // The target may not exist the instant the screen switches, so the measure
  // retries for a few frames before giving up and lighting the whole page.
  useLayoutEffect(() => {
    let alive = true;
    let tries = 0;

    const measure = () => {
      if (!alive) return;
      if (!stop.target) {
        setBox(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`);
      if (!el) {
        if (tries++ < 30) requestAnimationFrame(measure);
        else setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 10;
      setBox({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    };

    // Bring the target into view first; measuring before the scroll settles
    // would box the wrong place.
    const el = stop.target
      ? document.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`)
      : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(measure, el ? 340 : 60);

    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [at, stop.target]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next, back, onClose]);

  const last = at === stops.length - 1;
  const onScreen = stops.filter((s) => s.screen === stop.screen);
  const indexHere = onScreen.indexOf(stop) + 1;

  // The card goes under the highlight when there is room, over it otherwise.
  const below = box ? box.top + box.height + 16 : 0;
  const fitsBelow = box ? below + 230 < window.innerHeight : false;

  return (
    <>
      {/* The dim. A single element with an enormous spread gives a hole with
          no seams, which four panels around the target would not. */}
      <div
        onClick={next}
        style={{
          position: "fixed",
          zIndex: 90,
          pointerEvents: "auto",
          top: box ? box.top : 0,
          left: box ? box.left : 0,
          width: box ? box.width : 0,
          height: box ? box.height : 0,
          borderRadius: box ? 20 : 0,
          boxShadow: `0 0 0 9999px rgba(8,10,9,${box ? 0.62 : 0.5})`,
          border: box ? `2px solid ${C.mint}` : "none",
          transition: "all .35s cubic-bezier(.2,.8,.2,1)",
        }}
      />

      <div
        role="dialog"
        aria-label={lang === "tr" ? "Ürün turu" : "Product tour"}
        style={{
          position: "fixed",
          zIndex: 91,
          left: box
            ? Math.max(16, Math.min(box.left, window.innerWidth - 440))
            : "50%",
          top: box ? (fitsBelow ? below : Math.max(16, box.top - 236)) : "auto",
          bottom: box ? "auto" : 24,
          transform: box ? "none" : "translateX(-50%)",
          width: "min(420px, calc(100vw - 32px))",
          background: C.ink,
          color: C.white,
          borderRadius: 22,
          padding: "16px 18px",
          boxShadow: "0 30px 80px rgba(0,0,0,.5)",
          animation: "popIn .28s cubic-bezier(.2,.8,.2,1) both",
          transition: "left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 9,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: FONT.mono,
              fontSize: 10.5,
              color: C.mint,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.mint,
                animation: "pulse 2s infinite",
              }}
            />
            {at + 1}/{stops.length}
            {onScreen.length > 1 && (
              <span style={{ color: "rgba(255,255,255,.4)" }}>
                · {indexHere}/{onScreen.length}
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: "rgba(255,255,255,.1)",
              color: C.white,
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {lang === "tr" ? "Kapat" : "Close"}
          </button>
        </div>

        <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 5 }}>
          {stop.title}
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 9px", color: "#DDD" }}>
          {stop.body}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "start",
            gap: 7,
            padding: "9px 11px",
            borderRadius: 11,
            background: C.panel,
            fontFamily: FONT.mono,
            fontSize: 10,
            color: C.mint,
            lineHeight: 1.5,
            marginBottom: 11,
            overflowWrap: "anywhere",
          }}
        >
          <span aria-hidden>◉</span>
          <span>{stop.live}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {stops.map((s, i) => (
              <button
                key={s.screen + i}
                onClick={() => setAt(i)}
                aria-label={`${i + 1}`}
                style={{
                  flex: 1,
                  height: 3,
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
            onClick={back}
            disabled={at === 0}
            style={{
              border: "1px solid rgba(255,255,255,.2)",
              background: "transparent",
              color: at === 0 ? "rgba(255,255,255,.3)" : C.white,
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ←
          </button>
          <button
            onClick={() => (last ? onClose() : next())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: 0,
              borderRadius: 999,
              padding: "8px 9px 8px 16px",
              background: C.mint,
              color: C.ink,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {last ? (lang === "tr" ? "Bitir" : "Finish") : lang === "tr" ? "Sıradaki" : "Next"}
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: C.ink,
                color: C.mint,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
              }}
            >
              {last ? "✓" : "→"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

const usdc = (v: string | undefined) => (v ? (Number(v) / 1e7).toFixed(2) : "—");
const pct = (bps: number | undefined) => `%${((bps ?? 0) / 100).toFixed(2)}`;

const en = (s: AppState | null): Stop[] => [
  {
    screen: "overview",
    target: "ov-score",
    title: "The score, and where it comes from",
    body: "Not a decoration. Repayments earn, defaults cost, and an unblemished but empty book sits at the base — all counted from the invoices the contract holds. The two pills beside it say which feed the price is reading.",
    live: `${s?.invoices.length ?? 0} invoices on chain · treasury ${s?.treasury.mode ?? "—"}`,
  },
  {
    screen: "overview",
    target: "ov-kpi",
    title: "Money that has moved, money that has not",
    body: "On the left, what actually reached a bank account. On the right, what is still out at maturity. Both derived from the payouts the contract recorded, not from a ledger we keep beside it.",
    live: `treasury ${usdc(s?.treasury.assets)} USDC`,
  },
  {
    screen: "overview",
    target: "ov-cards",
    title: "Six figures, each one a screen",
    body: "Financed volume, the average discount, what is open, how many wallets are funding, defaults, and how many ETTNs the contract has locked. Any card opens the screen behind it, and the menu on each will export the book as CSV.",
    live: "every value counted from state.invoices at this request",
  },
  {
    screen: "overview",
    target: "ov-book",
    title: "The book itself",
    body: "Every invoice with its status, filtered by the pills above. A row opens the step it is waiting on — which is how you move through the product without needing to know its order.",
    live: "id · buyer tax number · ETTN · amount · due · discount · status",
  },
  {
    screen: "upload",
    target: "up-split",
    title: "1 · The document, and the one thing that matters in it",
    body: "A real UBL-TR e-invoice goes in. Mandatory fields, the XAdES signature block's structure and the document's SHA-256 are checked here. The ETTN is the point: the contract refuses a second registration of the same one before anything else runs.",
    live: "register() writes the ETTN hash · DataKey::Ettn TTL extended to the maximum",
  },
  {
    screen: "buyer",
    target: "bu-card",
    title: "2 · The acknowledgement is the lock",
    body: "Only the address written on the invoice can confirm it — the contract compares them. Without this the invoice cannot be funded, because the buyer is the party who makes the receivable real to a stranger.",
    live: "acknowledge() · only invoice.buyer passes require_auth",
  },
  {
    screen: "quote",
    target: "q-split",
    title: "3 · Four components, and where each came from",
    body: "The currency premium is measured from the feed's own history rather than assumed: thirty closes are read, the lira's actual move across the window is projected onto the tenor, and half the peak-to-trough range is added as a volatility allowance. A component that fell back to a parameter says so.",
    live: `quote() → ${pct(s?.activeQuote?.totalDiscountBps)} · fx ${s?.activeQuote?.fxSource ?? "—"} · yield ${s?.activeQuote?.yieldSource ?? "—"}`,
  },
  {
    screen: "anchor",
    target: "an-facts",
    title: "4 · Nothing here is written in our code",
    body: "The domain, the asset, the rate and the transfer server were all discovered from the anchor's own stellar.toml when this page loaded. Moving to a different anchor is one domain change — which is the whole reason to speak a standard rather than an API.",
    live: `${s?.anchor?.homeDomain ?? "anchor"} · SEP-1 discovery at run time`,
  },
  {
    screen: "anchor",
    target: "an-split",
    title: "4 · The rail, and its receipts",
    body: "Run the flow and the terminal on the right fills with the real requests, status codes and all. Each transfer that results carries the anchor's own id and a link to the Stellar transaction it produced. Below that are the same requests as commands you can paste into a terminal yourself.",
    live: `SEP-38 sell ${s?.anchor?.rates?.sell_rate ?? "—"} · first loss ${usdc(s?.treasury.firstLoss)} USDC`,
  },
  {
    screen: "pay",
    target: "pay-split",
    title: "5 · A payment with no camera and no data",
    body: "The request is encoded as eight tones and played out loud; a phone in the room hears it, checks the CRC and acts on it. Scan the QR with a phone to open the listener. The sound carries a request, never an authorisation — anyone can replay it, so the server is what decides.",
    live: "encoder and decoder both in the browser · the QR is a SEP-7 URI",
  },
  {
    screen: "board",
    target: "bo-split",
    title: "6 · The crowd is the number to remember",
    body: "How many wallets funded the invoice is set in the largest type on the screen, because that is what a factoring company cannot do: let two hundred people each put in fifty dollars. Capital sits in the DeFindex vault while the round fills.",
    live: `${s?.activeFunders.length ?? 0} funders read from chain`,
  },
  {
    screen: "settle",
    target: "se-split",
    title: "7 · Both ways this can end",
    body: "At maturity the buyer pays and the contract distributes pro rata. If they do not, the same contract drains the first-loss buffer to funders first and records the remainder as a claim on the supplier. Declaring a default early is refused on chain, not here.",
    live: `grace ${s?.limits.gracePeriodDays ?? "—"} days after the due date · mark_default() returns the split`,
  },
  {
    screen: "market",
    target: "mk-split",
    title: "Is it actually cheaper?",
    body: "The factoring assumptions are sliders you set, and the comparison recomputes against the live quote. If you think a factor is cheaper than we claim, type your number and watch the conclusion move — that is a better argument than a slide.",
    live: "the comparison runs on a real invoice in state and the live discount",
  },
];

const tr = (s: AppState | null): Stop[] => [
  {
    screen: "overview",
    target: "ov-score",
    title: "Skor ve nereden geldiği",
    body: "Süs değil. Ödemeler kazandırıyor, temerrütler kaybettiriyor, lekesiz ama boş bir defter tabanda oturuyor — hepsi kontratın tuttuğu faturalardan sayılıyor. Yanındaki iki pill, fiyatın hangi beslemeyi okuduğunu söylüyor.",
    live: `zincirde ${s?.invoices.length ?? 0} fatura · hazine ${s?.treasury.mode ?? "—"}`,
  },
  {
    screen: "overview",
    target: "ov-kpi",
    title: "Hareket eden para, etmeyen para",
    body: "Solda gerçekten bir banka hesabına ulaşan tutar. Sağda vadede hâlâ açıkta olan. İkisi de kontratın kaydettiği ödemelerden türetiliyor, yanında tuttuğumuz bir defterden değil.",
    live: `hazine ${usdc(s?.treasury.assets)} USDC`,
  },
  {
    screen: "overview",
    target: "ov-cards",
    title: "Altı rakam, her biri bir ekran",
    body: "Finanse edilen hacim, ortalama iskonto, açıktakiler, kaç cüzdanın fonladığı, temerrütler ve kontratın kilitlediği ETTN sayısı. Her kart arkasındaki ekranı açıyor, üstündeki menü de defteri CSV olarak indiriyor.",
    live: "her değer bu istekte state.invoices'tan sayıldı",
  },
  {
    screen: "overview",
    target: "ov-book",
    title: "Defterin kendisi",
    body: "Her fatura durumuyla birlikte, üstteki pill'lerle filtreleniyor. Bir satır beklediği adımı açıyor — ürünün sırasını bilmeden içinde dolaşmanın yolu bu.",
    live: "id · alıcı VKN · ETTN · tutar · vade · iskonto · durum",
  },
  {
    screen: "upload",
    target: "up-split",
    title: "1 · Belge ve içindeki tek önemli şey",
    body: "Gerçek bir UBL-TR e-faturası giriyor. Zorunlu alanlar, XAdES imza bloğunun yapısı ve belgenin SHA-256'sı burada kontrol ediliyor. Asıl mesele ETTN: kontrat aynısının ikinci kaydını, başka hiçbir şey çalışmadan reddediyor.",
    live: "register() ETTN hash'ini yazıyor · DataKey::Ettn TTL'i maksimuma çekiliyor",
  },
  {
    screen: "buyer",
    target: "bu-card",
    title: "2 · Kilit, alıcının onayı",
    body: "Faturada yazılı adres dışında kimse onaylayamıyor — kontrat ikisini karşılaştırıyor. Bu onay olmadan fatura fonlanamıyor, çünkü alacağı bir yabancı için gerçek kılan taraf alıcı.",
    live: "acknowledge() · require_auth'u yalnız invoice.buyer geçebilir",
  },
  {
    screen: "quote",
    target: "q-split",
    title: "3 · Dört bileşen ve her birinin kaynağı",
    body: "Kur primi varsayılmıyor, beslemenin kendi geçmişinden ölçülüyor: otuz kapanış okunuyor, liranın o pencerede fiilen ettiği hareket vadeye projekte ediliyor, tepe-dip bandının yarısı oynaklık payı olarak ekleniyor. Yedeğe düşen bir bileşen bunu söylüyor.",
    live: `quote() → ${pct(s?.activeQuote?.totalDiscountBps)} · kur ${s?.activeQuote?.fxSource ?? "—"} · getiri ${s?.activeQuote?.yieldSource ?? "—"}`,
  },
  {
    screen: "anchor",
    target: "an-facts",
    title: "4 · Buradaki hiçbir şey kodumuzda yazılı değil",
    body: "Alan adı, varlık, kur ve transfer sunucusu — hepsi bu sayfa yüklenirken anchor'ın kendi stellar.toml'undan keşfedildi. Başka bir anchor'a geçmek tek bir alan adı değişikliği; bir API yerine standart konuşmanın bütün sebebi bu.",
    live: `${s?.anchor?.homeDomain ?? "anchor"} · çalışma anında SEP-1 keşfi`,
  },
  {
    screen: "anchor",
    target: "an-split",
    title: "4 · Kanal ve makbuzları",
    body: "Akışı çalıştır, sağdaki terminal gerçek isteklerle dolsun — durum kodlarıyla birlikte. Oluşan her transfer anchor'ın kendi id'sini ve ürettiği Stellar işlemine giden bir link taşıyor. Altında da aynı istekler, terminale yapıştırabileceğin komutlar hâlinde.",
    live: `SEP-38 satış ${s?.anchor?.rates?.sell_rate ?? "—"} · ilk zarar ${usdc(s?.treasury.firstLoss)} USDC`,
  },
  {
    screen: "pay",
    target: "pay-split",
    title: "5 · Kamerasız ve veri bağlantısız bir ödeme",
    body: "İstek sekiz tona kodlanıp yüksek sesle çalınıyor; odadaki telefon duyuyor, CRC'sini doğruluyor ve işleme koyuyor. QR'ı telefonla okutunca dinleyici açılıyor. Ses bir istek taşıyor, yetki değil — kaydedip tekrar çalan herkes aynısını yapabilir, o yüzden kararı sunucu veriyor.",
    live: "kodlayıcı da çözücü de tarayıcıda · QR bir SEP-7 URI'si",
  },
  {
    screen: "board",
    target: "bo-split",
    title: "6 · Akılda kalması gereken sayı kalabalık",
    body: "Faturayı kaç cüzdanın fonladığı ekrandaki en büyük puntoda, çünkü bir faktoring şirketinin yapamadığı şey bu: iki yüz kişinin ellişer dolar koyması. Tur dolarken sermaye DeFindex vault'unda duruyor.",
    live: `zincirden ${s?.activeFunders.length ?? 0} fonlayıcı okundu`,
  },
  {
    screen: "settle",
    target: "se-split",
    title: "7 · Bunun iki bitiş yolu",
    body: "Vadede alıcı ödüyor ve kontrat oransal dağıtıyor. Ödemezse aynı kontrat önce ilk zarar tamponunu fonlayıcılara boşaltıyor, kalanı tedarikçiden rücu alacağı olarak kaydediyor. Temerrüdü erken ilan etmek burada değil, zincirde reddediliyor.",
    live: `vadeden sonra ${s?.limits.gracePeriodDays ?? "—"} gün ek süre · mark_default() dağılımı döndürüyor`,
  },
  {
    screen: "market",
    target: "mk-split",
    title: "Gerçekten daha mı ucuz?",
    body: "Faktoring varsayımları senin ayarladığın kaydırıcılar ve karşılaştırma canlı teklife göre yeniden hesaplanıyor. Faktoringin iddia ettiğimizden ucuz olduğunu düşünüyorsan kendi sayını gir ve sonucun nasıl kaydığını gör — bu bir slayttan daha iyi bir argüman.",
    live: "karşılaştırma state'teki gerçek faturadan ve canlı iskontodan hesaplanıyor",
  },
];
