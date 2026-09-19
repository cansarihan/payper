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

  nav: readonly string[];
  step: string;
  signOut: string;
  openPanel: string;
  loading: string;
  empty: string;

  uploadTitle: string;
  uploadLead: string;
  dropzone: string;
  dropzoneSub: string;
  demoFiles: string;
  files: string;
  checks: string;
  register: string;
  registered: string;
  rejected: string;
  documentTitle: string;
  ettn: string;
  docHash: string;
  issued: string;
  due: string;
  amount: string;
  seller: string;
  buyer: string;

  quoteTitle: string;
  quoteLead: string;
  components: string;
  observed: string;
  acceptQuote: string;
  accepted: string;
  payout: string;
  faceValue: string;
  discount: string;
  tenor: string;
  liveTag: string;
  paramTag: string;
  drift: string;
  range: string;
  window: string;
  vaultApy: string;

  buyerTitle: string;
  buyerLead: string;
  acknowledge: string;
  acknowledged: string;
  parties: string;
  awaiting: string;

  boardTitle: string;
  boardLead: string;
  fundedLabel: string;
  remaining: string;
  target: string;
  funders: string;
  fundIt: string;
  fundingClosed: string;
  expectedReturn: string;
  youFund: string;
  timeLeft: string;
  noFunders: string;
  yourShare: string;
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
  nav: ["Overview", "Upload", "Acknowledge", "Discount", "Anchor", "Board"],
  step: "STEP",
  signOut: "Sign out",
  openPanel: "Open dashboard",
  loading: "Loading",
  empty: "Nothing here yet.",

  uploadTitle: "Upload the invoice",
  uploadLead:
    "A UBL-TR e-invoice is checked for its mandatory fields, the structure of its XAdES signature block, and the hash of the document itself. The ETTN decides whether it can be financed at all.",
  dropzone: "Drop a UBL-TR XML file",
  dropzoneSub: "XAdES signed · 5 MB maximum",
  demoFiles: "SAMPLE INVOICES",
  files: "files",
  checks: "Checks",
  register: "Register on chain",
  registered: "Registered",
  rejected: "Refused",
  documentTitle: "Document",
  ettn: "ETTN",
  docHash: "Document hash",
  issued: "Issued",
  due: "Due",
  amount: "Amount",
  seller: "Supplier",
  buyer: "Buyer",

  quoteTitle: "The discount",
  quoteLead:
    "Four components. Two are read from chain on every call and labelled accordingly; the other two are parameters and say so.",
  components: "Components",
  observed: "Observed inputs",
  acceptQuote: "Accept and lock",
  accepted: "Locked",
  payout: "Supplier receives",
  faceValue: "Face value",
  discount: "Discount",
  tenor: "Tenor",
  liveTag: "LIVE",
  paramTag: "PARAM",
  drift: "Currency drift",
  range: "Observed range",
  window: "Sample window",
  vaultApy: "Treasury APY",
  buyerTitle: "Buyer acknowledgement",
  buyerLead:
    "Only the address written on the invoice can acknowledge it. Until that happens the receivable is a claim the supplier makes; afterwards it is one the buyer has confirmed, which is what a funder can price.",
  acknowledge: "Acknowledge on chain",
  acknowledged: "Acknowledged",
  parties: "Parties",
  awaiting: "Awaiting acknowledgement",

  boardTitle: "Funding board",
  boardLead: "Funders subscribe to a fixed payout. The contract takes only what the round still needs.",
  fundedLabel: "Funded",
  remaining: "Remaining",
  target: "Target",
  funders: "Funders",
  fundIt: "Fund this invoice",
  fundingClosed: "Funding closed",
  expectedReturn: "Expected return",
  youFund: "You fund",
  timeLeft: "Time left",
  noFunders: "No funders yet.",
  yourShare: "share",
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
  nav: ["Genel bakış", "Fatura yükle", "Alıcı onayı", "İskonto", "Anchor", "Fonlama"],
  step: "ADIM",
  signOut: "Çıkış yap",
  openPanel: "Paneli aç",
  loading: "Yükleniyor",
  empty: "Burada henüz bir şey yok.",

  uploadTitle: "Faturayı yükle",
  uploadLead:
    "UBL-TR e-faturasının zorunlu alanları, XAdES imza bloğunun yapısı ve belgenin kendi hash'i kontrol edilir. Finanse edilip edilemeyeceğine ETTN karar verir.",
  dropzone: "UBL-TR XML dosyasını sürükle",
  dropzoneSub: "XAdES imzalı · en fazla 5 MB",
  demoFiles: "ÖRNEK FATURALAR",
  files: "dosya",
  checks: "Kontroller",
  register: "Zincire kaydet",
  registered: "Kaydedildi",
  rejected: "Reddedildi",
  documentTitle: "Belge",
  ettn: "ETTN",
  docHash: "Belge hash'i",
  issued: "Düzenleme",
  due: "Vade",
  amount: "Tutar",
  seller: "Satıcı",
  buyer: "Alıcı",

  quoteTitle: "İskonto",
  quoteLead:
    "Dört bileşen. İkisi her çağrıda zincirden okunur ve öyle etiketlenir; diğer ikisi parametredir ve bunu söyler.",
  components: "Bileşenler",
  observed: "Gözlenen girdiler",
  acceptQuote: "Kabul et ve kilitle",
  accepted: "Kilitlendi",
  payout: "KOBİ alır",
  faceValue: "Nominal",
  discount: "İskonto",
  tenor: "Vade",
  liveTag: "CANLI",
  paramTag: "PARAM",
  drift: "Kur kayması",
  range: "Gözlenen aralık",
  window: "Örnek penceresi",
  vaultApy: "Hazine APY",
  buyerTitle: "Alıcı onayı",
  buyerLead:
    "Faturayı yalnızca üzerinde yazan adres onaylayabilir. O ana kadar alacak satıcının iddiasıdır; sonrasında alıcının teyit ettiği bir alacaktır — fonlayıcının fiyatlayabileceği şey budur.",
  acknowledge: "Zincirde onayla",
  acknowledged: "Onaylandı",
  parties: "Taraflar",
  awaiting: "Onay bekleniyor",

  boardTitle: "Fonlama panosu",
  boardLead: "Fonlayıcılar sabit bir ödemeye abone olur. Kontrat turun ihtiyacından fazlasını almaz.",
  fundedLabel: "Fonlanan",
  remaining: "Kalan",
  target: "Hedef",
  funders: "Fonlayıcılar",
  fundIt: "Bu faturayı fonla",
  fundingClosed: "Fonlama kapalı",
  expectedReturn: "Beklenen getiri",
  youFund: "Fonlarsın",
  timeLeft: "Kalan süre",
  noFunders: "Henüz fonlayıcı yok.",
  yourShare: "pay",
};

export const t = (lang: Lang) => (lang === "tr" ? tr : en);

export const isLang = (v: unknown): v is Lang => v === "en" || v === "tr";
