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
  acct: readonly (readonly [string, string])[];
  ledgerLabel: string;
  walletNone: string;
  kpiSettled: string;
  kpiPending: string;
  cashflow: string;
  last12: string;
  vault: string;
  deployed: string;
  idle: string;
  firstLossLabel: string;
  treasuryMode: string;
  invoicesLabel: string;
  all: string;
  noOffers: string;
  cardMenu: readonly [string, string];
  statuses: Readonly<Record<"registered" | "acknowledged" | "funded" | "repaid" | "defaulted", string>>;
  statusShort: Readonly<Record<"registered" | "acknowledged" | "funded" | "repaid" | "defaulted", string>>;
  cardTitles: readonly [string, string, string, string, string, string];
  scoreCaption: string;
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

  landingNav: readonly (readonly [string, string])[];
  uploadCta: string;
  exploreCta: string;
  statsLabels: readonly [string, string, string, string];

  howTitle: string;
  trackTitle: string;
  trackLead: string;
  track: readonly (readonly [string, string, string, string])[];
  howP: string;
  steps: readonly (readonly [string, string, string])[];
  waysTitle: string;
  ways: readonly (readonly [string, string, string])[];
  pillarsTitle: string;
  pillars: readonly (readonly [string, string, string])[];
  proofTitle: string;
  proofLead: string;
  closingTitle: string;
  closingLead: string;
  footerNote: string;
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
  nav: ["Overview", "Upload invoice", "Buyer approval", "Quote", "Anchor", "Funding board"],
  acct: [
    ["Wallet", "signing key"],
    ["Bank account", "payout destination"],
    ["Invoices", "records"],
    ["Language", "EN · TR"],
    ["Treasury", "mode"],
  ],
  ledgerLabel: "ledger",
  walletNone: "not linked",
  kpiSettled: "Settled to bank today",
  kpiPending: "Pending at maturity",
  cashflow: "Cash flow",
  last12: "last 12 months",
  vault: "Vault",
  deployed: "Deployed",
  idle: "Idle",
  firstLossLabel: "First loss",
  treasuryMode: "mode",
  invoicesLabel: "Invoices",
  all: "All",
  noOffers: "Nothing awaiting a decision.",
  cardMenu: ["Open screen", "Download CSV"],
  statuses: {
    registered: "Registered",
    acknowledged: "Acknowledged",
    funded: "Funded",
    repaid: "Repaid",
    defaulted: "Defaulted",
  },
  statusShort: {
    registered: "REGISTERED",
    acknowledged: "ACKNOWLEDGED",
    funded: "FUNDED",
    repaid: "REPAID",
    defaulted: "DEFAULTED",
  },
  cardTitles: [
    "Financed",
    "Average discount",
    "Active invoices",
    "Funder wallets",
    "Defaults",
    "ETTN blocked",
  ],
  scoreCaption: "Payper Score · on-chain",
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
  landingNav: [
    ["How it works", "#how"],
    ["Who it is for", "#who"],
    ["What is different", "#why"],
  ],
  uploadCta: "Upload an invoice",
  exploreCta: "How it works",
  statsLabels: ["Financed to date", "Invoices in the book", "Treasury yield", "Defaults"],

  howTitle: "Five steps, each one a contract call or a SEP flow",
  trackTitle: "What the Genesis track asks for, and where it is in the product",
  trackLead:
    "Three requirements. Each one is answered by something you can open and check, not by a claim on this page.",
  track: [
    [
      "INTEGRATION",
      "Built on an eligible Stellar protocol",
      "Pricing reads a SEP-40 price feed through the Reflector oracle interface — lastprice, prices, decimals, ReflectorAsset. The oracle address is configuration, so the same contract points at Reflector's published feed with one set_config call. The treasury sits behind a four-function adapter on the same principle; a DeFindex vault satisfies it unchanged.",
      "quote() → OracleClient::prices · Config.oracle · TreasuryClient",
    ],
    [
      "FIAT RAIL",
      "Real lira in and out through an anchor",
      "SEP-6 runs in both directions. The supplier's payout leaves as USDC and lands as lira in a bank account; at maturity the buyer pays lira in and it comes back as USDC. Authentication is SEP-10, the customer record is SEP-12, the rate is locked with a SEP-38 firm quote, and every endpoint is discovered from the anchor's stellar.toml at run time.",
      "SEP-1 · 10 · 12 · 38 · 6 · tr-mock-anchor.fly.dev",
    ],
    [
      "CORE FEATURE",
      "Remove either one and there is no product",
      "Every state change is a contract call: an invoice exists because register() wrote its ETTN, it is fundable because acknowledge() confirmed it, and its price exists because quote() read the chain. The money only reaches a bank through the anchor. There is no off-chain ledger behind this and no path that skips the rail.",
      "register · acknowledge · quote · accept_quote · fund · repay",
    ],
  ],
  howP:
    "No step in between decides off chain. The price is not a fixed number; it is computed live from treasury yield and the observed currency move.",
  steps: [
    [
      "Upload the UBL-TR XML",
      "The ETTN hash and the document SHA-256 are written on chain. A second upload of the same ETTN is refused before anything else runs.",
      "ETTN SHA-256 · document hash · XAdES structural check · DataKey::Ettn uniqueness",
    ],
    [
      "The buyer acknowledges",
      "The buyer named on the invoice signs; the debt becomes final on chain and the receivable becomes real to a funder.",
      "acknowledge() · only the address written on the invoice can call it",
    ],
    [
      "A live discount",
      "Four components, each returned with its provenance. Two of them are read from chain on every call.",
      "quote() · treasury APY · TRY/USD drift and range · credit · fee",
    ],
    [
      "Funded, then paid out in lira",
      "Contributions sit in the treasury while the round fills; on completion the contract draws the payout and the anchor converts it.",
      "accept_quote() → fund() → treasury.withdraw · SEP-38 rate lock · SEP-6 withdraw",
    ],
    [
      "Distribution at maturity",
      "The buyer pays lira in; the contract repays funders pro rata, each with their share of the discount.",
      "SEP-6 deposit → repay() → pro-rata distribution",
    ],
  ],
  waysTitle: "Three ways in",
  ways: [
    ["Fund an acknowledged receivable", "Subscribe to a payout backed by an invoice the buyer has confirmed on chain. The price comes from live treasury yield and the observed currency move.", "Open the board"],
    ["Take the money today", "Upload a term e-invoice and draw the discounted amount now instead of in ninety days. The ETTN is checked before anything else runs.", "Upload an invoice"],
    ["Settle in lira", "SEP-6 in both directions. The supplier is paid in lira the same day; at maturity the buyer settles in lira and the contract distributes.", "See the anchor"],
  ],
  pillarsTitle: "What makes it different",
  pillars: [
    ["ETTN", "One ETTN, one financing", "The identifier comes from the tax authority, so uniqueness is inherited rather than maintained by us. Selling the same receivable twice is refused by the contract, not by a policy."],
    ["PRICING", "A price you can check", "Two of the four components are read from chain on every call, and each says whether it was live. A number that fell back to a parameter cannot be presented as live."],
    ["SEP-6", "Money that reaches a bank", "SEP-6 in both directions: the supplier is paid in lira, the buyer settles in lira. Every endpoint is discovered from the anchor at run time."],
  ],
  proofTitle: "Everything here is checkable",
  proofLead: "The contracts are on testnet, the flow writes real transactions, and the figures on this page were read from chain when you loaded it.",
  closingTitle: "See it run",
  closingLead: "Upload an invoice, watch the discount come off chain, and try the duplicate.",
  footerNote: "Rise In x Stellar Pro Hackathon 2026",
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
  nav: ["Genel bakış", "Fatura yükle", "Alıcı onayı", "İskonto", "Anchor", "Fonlama panosu"],
  acct: [
    ["Cüzdan", "imza anahtarı"],
    ["Banka hesabı", "ödeme adresi"],
    ["Faturalar", "kayıt"],
    ["Dil", "TR · EN"],
    ["Hazine", "mod"],
  ],
  ledgerLabel: "defter",
  walletNone: "bağlı değil",
  kpiSettled: "Bugün bankaya geçen",
  kpiPending: "Vadede bekleyen",
  cashflow: "Nakit akışı",
  last12: "son 12 ay",
  vault: "Kasa",
  deployed: "Kullanımda",
  idle: "Atıl",
  firstLossLabel: "İlk zarar",
  treasuryMode: "mod",
  invoicesLabel: "Faturalar",
  all: "Tümü",
  noOffers: "Karar bekleyen yok.",
  cardMenu: ["Ekranı aç", "CSV indir"],
  statuses: {
    registered: "Kayıtlı",
    acknowledged: "Onaylandı",
    funded: "Fonlandı",
    repaid: "Ödendi",
    defaulted: "Temerrüt",
  },
  statusShort: {
    registered: "KAYITLI",
    acknowledged: "ONAYLANDI",
    funded: "FONLANDI",
    repaid: "ÖDENDİ",
    defaulted: "TEMERRÜT",
  },
  cardTitles: [
    "Finanse edilen",
    "Ortalama iskonto",
    "Aktif fatura",
    "Fonlayıcı cüzdan",
    "Temerrüt",
    "ETTN engeli",
  ],
  scoreCaption: "Payper Score · zincir üstü",
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
  landingNav: [
    ["Nasıl çalışır", "#how"],
    ["Kimlere uygun", "#who"],
    ["Farkı ne", "#why"],
  ],
  uploadCta: "Fatura yükle",
  exploreCta: "Nasıl çalışır",
  statsLabels: ["Toplam finanse edilen", "Defterdeki fatura", "Hazine getirisi", "Temerrüt"],

  howTitle: "Beş adım, her biri bir kontrat çağrısı ya da SEP akışı",
  trackTitle: "Genesis track'in istedikleri ve ürünün neresinde durdukları",
  trackLead:
    "Üç şart. Her birinin karşılığı, bu sayfadaki bir iddia değil, açıp kontrol edebileceğin bir şey.",
  track: [
    [
      "ENTEGRASYON",
      "Uygun bir Stellar protokolü üzerine kurulu",
      "Fiyatlama, Reflector oracle arayüzü üzerinden bir SEP-40 beslemesi okur — lastprice, prices, decimals, ReflectorAsset. Oracle adresi yapılandırmadır; aynı kontrat tek bir set_config çağrısıyla Reflector'ün yayımlanmış beslemesine bakar. Hazine de aynı ilkeyle dört fonksiyonluk bir adaptörün arkasındadır; bir DeFindex vault'u bunu değiştirmeden karşılar.",
      "quote() → OracleClient::prices · Config.oracle · TreasuryClient",
    ],
    [
      "FİAT KANALI",
      "Anchor üzerinden gerçek lira girişi ve çıkışı",
      "SEP-6 çift yönlü çalışır. Tedarikçinin ödemesi USDC olarak çıkar, banka hesabına lira olarak iner; vadede alıcı lirayı yatırır ve USDC olarak geri gelir. Kimlik SEP-10, müşteri kaydı SEP-12, kur SEP-38 kesin teklifiyle kilitlenir ve tüm uç noktalar anchor'ın stellar.toml'undan çalışma anında keşfedilir.",
      "SEP-1 · 10 · 12 · 38 · 6 · tr-mock-anchor.fly.dev",
    ],
    [
      "ÇEKİRDEK ÖZELLİK",
      "İkisinden birini çıkar, ürün kalmaz",
      "Her durum değişikliği bir kontrat çağrısıdır: fatura vardır çünkü register() ETTN'ini yazdı, fonlanabilir çünkü acknowledge() onayladı, fiyatı vardır çünkü quote() zinciri okudu. Para bankaya yalnızca anchor üzerinden ulaşır. Arkada zincir dışı bir defter ve kanalı atlayan bir yol yoktur.",
      "register · acknowledge · quote · accept_quote · fund · repay",
    ],
  ],
  howP:
    "Aradaki hiçbir adım zincir dışında karar vermez. Fiyat sabit bir sayı değil; hazine getirisinden ve gözlenen kur hareketinden canlı hesaplanır.",
  steps: [
    [
      "UBL-TR XML yükle",
      "ETTN hash'i ve belgenin SHA-256'sı zincire yazılır. Aynı ETTN'in ikinci kez yüklenmesi her şeyden önce reddedilir.",
      "ETTN SHA-256 · belge hash · XAdES yapısal kontrol · DataKey::Ettn tekillik",
    ],
    [
      "Alıcı onaylar",
      "Faturada yazılı alıcı imzalar; borç zincir üstünde kesinleşir ve alacak fonlayıcı için gerçek hâle gelir.",
      "acknowledge() · yalnız faturada yazılı adres çağırabilir",
    ],
    [
      "Canlı iskonto",
      "Dört bileşen, her biri kaynağıyla birlikte döner. İkisi her çağrıda zincirden okunur.",
      "quote() · hazine APY · TRY/USD sapma ve bant · kredi · ücret",
    ],
    [
      "Fonlanır, lira olarak ödenir",
      "Tur dolarken katkılar hazinede bekler; tamamlanınca kontrat ödemeyi çeker ve anchor çevirir.",
      "accept_quote() → fund() → treasury.withdraw · SEP-38 kur kilidi · SEP-6 withdraw",
    ],
    [
      "Vadede dağıtım",
      "Alıcı lirayı öder; kontrat fonlayıcılara oransal, her birine iskonto payıyla birlikte geri öder.",
      "SEP-6 deposit → repay() → oransal dağıtım",
    ],
  ],
  waysTitle: "Üç giriş yolu",
  ways: [
    ["Onaylı alacağı fonla", "Alıcının zincir üstünde onayladığı bir faturaya dayalı ödemeye abone ol. Fiyat canlı hazine getirisinden ve gözlenen kur hareketinden geliyor.", "Panoyu aç"],
    ["Parayı bugün al", "Vadeli e-faturanı yükle, iskontolu tutarı doksan gün sonra değil şimdi çek. ETTN her şeyden önce kontrol edilir.", "Fatura yükle"],
    ["Lira ile kapat", "Çift yönlü SEP-6. Tedarikçiye aynı gün lira geçer; vadede alıcı lira öder ve kontrat dağıtımı yapar.", "Anchor'ı gör"],
  ],
  pillarsTitle: "Farkı ne",
  pillars: [
    ["ETTN", "Bir ETTN, bir finansman", "Kimlik vergi idaresinden gelir; tekillik bizim tuttuğumuz bir kayıt değil, miras alınan bir özelliktir. Aynı alacağı ikinci kez satmayı politika değil kontrat reddeder."],
    ["FİYAT", "Doğrulayabileceğin bir fiyat", "Dört bileşenin ikisi her çağrıda zincirden okunur ve her biri canlı olup olmadığını söyler. Yedeğe düşen bir sayı canlı diye sunulamaz."],
    ["SEP-6", "Bankaya inen para", "Çift yönlü SEP-6: satıcı TL alır, alıcı TL öder. Tüm uç noktalar anchor'dan çalışma anında keşfedilir."],
  ],
  proofTitle: "Buradaki her şey doğrulanabilir",
  proofLead: "Kontratlar testnet'te, akış gerçek işlem yazıyor ve bu sayfadaki rakamlar sen açtığında zincirden okundu.",
  closingTitle: "Çalışırken gör",
  closingLead: "Bir fatura yükle, iskontonun zincirden gelişini izle, sonra kopyayı dene.",
  footerNote: "Rise In x Stellar Pro Hackathon 2026",
};

export const t = (lang: Lang) => (lang === "tr" ? tr : en);

export const isLang = (v: unknown): v is Lang => v === "en" || v === "tr";
