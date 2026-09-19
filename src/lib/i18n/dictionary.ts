/** English is the default; Turkish is the alternate. */
export type Lang = "en" | "tr";

export const LANGS: Lang[] = ["en", "tr"];
export const DEFAULT_LANG: Lang = "en";

interface Copy {
  tagline: readonly [string, string];
  lead: string;
  leadEmphasis: string;
  liveNow: string;
  treasuryYield: string;
  treasuryYieldSub: string;
  liveDiscount: string;
  noInvoiceToPrice: string;
  bookSize: string;
  settledSuffix: string;
  treasuryAssets: string;
  anchorUnreadable: string;
  tagLive: string;
  tagFallback: string;
  contract: string;
  treasury: string;
  feed: string;
  anchor: string;
  processing: string;
  status: string;
  everyFigure: string;
  chainUnreachable: string;
  days: string;
  annual: string;
}

const en: Copy = {
  tagline: ["Your term invoice,", "paid today."],
  lead:
    "A supplier uploads a term e-invoice, the buyer acknowledges it on chain, and the money arrives the same day as fiat in a bank account. At maturity the buyer pays and the contract distributes to funders.",
  leadEmphasis: "The discount is not a fixed number — it is computed from live on-chain yield and the observed currency move.",
  liveNow: "Stellar testnet · live",

  treasuryYield: "Treasury yield",
  treasuryYieldSub: "funded capital earns this while a round fills",
  liveDiscount: "Live discount",
  noInvoiceToPrice: "no invoice to price",
  bookSize: "Invoices in the book",
  settledSuffix: "settled at maturity",
  treasuryAssets: "Treasury assets",
  anchorUnreadable: "anchor unreadable",

  tagLive: "live",
  tagFallback: "fallback",

  contract: "contract",
  treasury: "treasury",
  feed: "feed",
  anchor: "anchor",

  processing: "Currently processing invoice",
  status: "status",
  everyFigure: "Every figure on this page was read from chain when it was requested.",

  chainUnreachable:
    "The chain cannot be read right now, so no figures are shown. This page stays empty rather than displaying a value nobody published.",

  days: "days",
  annual: "annual",
};

const tr: Copy = {
  tagline: ["Vadeli faturan,", "bugün ödensin."],
  lead:
    "KOBİ vadeli e-faturasını yükler, alıcı zincir üstünde onaylar, para aynı gün TL olarak banka hesabına geçer. Vadede alıcı öder, kontrat fonlayıcılara dağıtır.",
  leadEmphasis: "İskonto sabit bir sayı değil — canlı zincir getirisinden ve gözlenen kur hareketinden hesaplanıyor.",
  liveNow: "Stellar testnet · canlı",

  treasuryYield: "Hazine getirisi",
  treasuryYieldSub: "tur dolarken fonlanan sermaye bunu kazanır",
  liveDiscount: "Canlı iskonto",
  noInvoiceToPrice: "fiyatlanacak fatura yok",
  bookSize: "Defterdeki fatura",
  settledSuffix: "vadesinde ödendi",
  treasuryAssets: "Hazine varlığı",
  anchorUnreadable: "anchor okunamadı",

  tagLive: "canlı",
  tagFallback: "yedek",

  contract: "kontrat",
  treasury: "hazine",
  feed: "besleme",
  anchor: "anchor",

  processing: "Şu an işlenen fatura",
  status: "durum",
  everyFigure: "Bu sayfadaki her rakam istek anında zincirden okundu.",

  chainUnreachable:
    "Zincir şu anda okunamıyor, bu yüzden buraya sayı yazmıyoruz. Sayfa sahte bir değer göstermektense boş kalır.",

  days: "gün",
  annual: "yıllık",
};

export const t = (lang: Lang) => (lang === "tr" ? tr : en);

export const isLang = (v: unknown): v is Lang => v === "en" || v === "tr";
