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

  roles: Readonly<Record<"seller" | "buyer" | "funder", string>>;
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
  switchRole: string;
  switchRoleTitle: string;
  switchRoleLead: string;
  switchRoleDemo: string;
  cancel: string;
  anchorTopUp: string;
  anchorTopUpNote: string;
  anchorNoInvoice: string;
  anchorSandbox: string;
  anchorSold: string;
  anchorSent: string;
  anchorTranches: string;
  anchorElapsed: string;
  anchorLegs: string;
  needsRoleHint: string;
  anchorTitle: string;
  anchorLead: string;
  anchorTabs: readonly [string, string];
  anchorRun: readonly [string, string];
  anchorSteps: {
    off: readonly (readonly [string, string, string])[];
    on: readonly (readonly [string, string, string])[];
  };
  anchorStates: Readonly<Record<"idle" | "running" | "done", string>>;
  anchorSettledTo: readonly [string, string];
  anchorProof: string;
  anchorProofLead: string;
  anchorFailed: string;
  unreadable: string;
  walletTitle: string;
  walletLead: string;
  signerLabel: string;
  methods: Readonly<Record<"wallet" | "passkey" | "demo", string>>;
  sessionAddress: string;
  passkeyAccount: string;
  onChainYes: string;
  onChainNo: string;
  onChainFailed: string;
  onChainNoNote: string;
  activateCta: string;
  activatedNote: string;
  walletNotNeeded: string;
  noWalletLinked: string;
  walletCancelled: string;
  roleLabel: string;
  passkeyNote: string;
  linkedWallet: string;
  linkLead: string;
  linkCta: string;
  unlinkCta: string;
  walletName: string;
  address: string;
  linkedAt: string;
  statsLabel: string;
  statsTitle: string;
  statsLead: string;
  statsVolume: string;
  statsActive: string;
  statsAvgDiscount: string;
  statsSettled: string;
  statsDaily: string;
  statsBuyers: string;
  statsMix: string;
  account: string;
  invoicesTitle: string;
  invoicesLead: string;
  recordsLabel: string;
  totalFace: string;
  financedLabel: string;
  faceUsdcLabel: string;
  lockedPayout: string;
  raisedLabel: string;
  registeredAt: string;
  sellerVkn: string;
  buyerVkn: string;
  openContract: string;
  nextStep: readonly [string, string, string, string, string];
  tour: string;
  marketLabel: string;
  marketTitle: string;
  marketLead: string;
  segmentTitle: string;
  segmentRows: readonly (readonly [string, string])[];
  unitEconomics: string;
  vsFactoring: string;
  payTitle: string;
  payLead: string;
  payModes: readonly [string, string, string];
  payPlay: string;
  payStop: string;
  payListen: string;
  payHeard: string;
  payScanToListen: string;
  payConfirm: string;
  payAmount: string;
  payFrame: string;
  settleTitle: string;
  settleLead: string;
  repayCta: string;
  repaid: string;
  bufferTitle: string;
  bufferLead: string;
  bufferTopUp: string;
  defaultTitle: string;
  defaultLead: string;
  defaultCta: string;
  graceLeft: string;
  absorbed: string;
  recourseOwed: string;
  nothingAtRisk: string;
  operatorOnly: string;
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
  tagline: ["Turkish working capital,", "funded from anywhere."],
  lead:
    "A supplier in Bursa waits ninety days to be paid. The capital that could close that gap is locked inside Turkish bank balance sheets. Payper opens that door to anyone holding USDC — in seconds, from fifty dollars up.",
  leadEmphasis: "The supplier is paid the same day in lira. The funder never touches a Turkish bank.",
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
  roles: { seller: "Supplier", buyer: "Buyer", funder: "Funder" },
  nav: ["Overview", "Upload invoice", "Buyer approval", "Quote", "Anchor", "Pay by sound", "Funding board", "Settle"],
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
  switchRole: "Act as",
  switchRoleTitle: "Act as another party",
  switchRoleLead:
    "The panel reloads as the party you pick, and the canvas takes that party's colour. What each one may do is decided by the route handlers, not by this dialog.",
  switchRoleDemo:
    "Demo only. Fast role switching exists so one machine can play three parties on stage — it issues a demo session with a server-held key and will not exist in production, where each party signs in with its own wallet.",
  cancel: "Cancel",
  anchorTopUp: "Buy USDC for the supplier",
  anchorTopUpNote:
    "Runs the same SEP-6 on-ramp the buyer uses, crediting the supplier instead — so the withdrawal can be run again.",
  anchorNoInvoice: "No eligible invoice",
  anchorSandbox:
    "Sandbox · the bank and KYC legs are simulated; the Stellar leg is real testnet USDC. If a transfer exceeds the anchor's per-transaction limit the amount is split into tranches.",
  anchorSold: "USDC sold",
  anchorSent: "sent",
  anchorTranches: "tranche",
  anchorElapsed: "The flow runs real SEP requests against the anchor and usually takes 10 to 25 seconds",
  anchorLegs: "Transfers",
  needsRoleHint: "Acting here needs the {role} role — open it to look, switch to act",
  anchorTitle: "The lira bridge",
  anchorLead:
    "One standard door: discovery from stellar.toml, SEP-10 identity, a SEP-38 firm rate, SEP-6 deposit and withdrawal. Moving to another anchor is one domain change.",
  anchorTabs: ["Supplier withdrawal · USDC → TRY", "Buyer payment · TRY → USDC"],
  anchorRun: ["Run the USDC → TRY flow", "Run the TRY → USDC flow"],
  anchorSteps: {
    off: [
      ["stellar.toml discovery", "SEP-1", "Endpoints and the signing key are read"],
      ["Wallet identity", "SEP-10", "A challenge is signed, a JWT comes back"],
      ["Rate lock", "SEP-38", "A firm USDC→TRY rate"],
      ["Withdrawal request", "SEP-6", "The treasury address and memo come back"],
      ["On-chain payment", "Soroban", "USDC is sent to the treasury with the memo"],
      ["Lira to the bank", "Bank", "status=completed · lira to the IBAN"],
    ],
    on: [
      ["Wallet identity", "SEP-10", "The buyer's wallet signs and takes a JWT"],
      ["Rate lock", "SEP-38", "A firm TRY→USDC rate"],
      ["Deposit request", "SEP-6", "An IBAN and a reference come back"],
      ["Bank transfer", "Bank", "Lira is sent with the reference written on it"],
      ["The anchor pays USDC", "SEP-6", "pending_anchor → completed"],
    ],
  },
  anchorStates: { idle: "ready", running: "running", done: "complete" },
  anchorSettledTo: ["Reached the bank account", "USDC reached the contract"],
  anchorProof: "Check it yourself",
  anchorProofLead:
    "Nothing on this screen is written here. Open the endpoints, or run the same requests from a terminal and compare them with the trace above.",
  anchorFailed: "The anchor flow did not complete",
  unreadable: "unreadable",
  walletTitle: "Identity and wallet",
  walletLead:
    "Who this session signs as, and which browser wallet has been proved alongside it. The two are separate on purpose.",
  signerLabel: "How you signed in",
  methods: {
    wallet: "a browser wallet signed a message",
    passkey: "a passkey on this device",
    demo: "a server-held key, for the stage",
  },
  sessionAddress: "Session address",
  passkeyAccount: "Passkey account",
  onChainYes: "on the network",
  onChainNo: "being created…",
  onChainFailed: "not created",
  onChainNoNote:
    "Signing in started this: a Stellar account comes into existence with its first payment, so the address is being funded and given a USDC trustline. If it has not appeared after a moment, the button retries it.",
  activateCta: "Try again",
  activatedNote: "Created, with a USDC trustline. The explorer link now resolves.",
  walletNotNeeded: "Your passkey account is ready to use. Nothing needs linking.",
  noWalletLinked: "none linked — not needed",
  walletCancelled: "The wallet picker was closed.",
  roleLabel: "Role",
  passkeyNote:
    "Signing in with the passkey created this address — there is nothing you need to connect. A passkey proves who is asking; it cannot sign Soroban XDR on its own, so the key it derives lives on the server until a Soroban smart account can verify secp256r1 on chain. Linking a browser wallet below is optional, for signing with a key you already hold.",
  linkedWallet: "Linked wallet",
  linkLead:
    "Optional. You already have a working address; this is for signing with a key you hold yourself. The proof is the same challenge and signature as signing in, so a wallet cannot be attached by claiming an address.",
  linkCta: "Link a wallet",
  unlinkCta: "Detach",
  walletName: "Wallet",
  address: "Address",
  linkedAt: "Linked",
  statsLabel: "STATISTICS",
  statsTitle: "The book, measured",
  statsLead:
    "Counted from the invoices the contract holds, over the window you pick. Nothing is aggregated anywhere else — if a figure is here, it came off the ledger on this request.",
  statsVolume: "Volume",
  statsActive: "Open",
  statsAvgDiscount: "Average discount",
  statsSettled: "Settled",
  statsDaily: "Registered per day",
  statsBuyers: "Concentration by buyer",
  statsMix: "Status mix",
  account: "Account",
  invoicesTitle: "My invoices",
  invoicesLead:
    "Every registered invoice with its status, its ETTN, the document hash and how much of it is funded. Open a row to reach the step it is waiting on.",
  recordsLabel: "Records",
  totalFace: "Total",
  financedLabel: "Financed",
  faceUsdcLabel: "Face in USDC",
  lockedPayout: "Locked payout",
  raisedLabel: "Raised",
  registeredAt: "Registered",
  sellerVkn: "Supplier tax no",
  buyerVkn: "Buyer tax no",
  openContract: "open the contract ↗",
  nextStep: ["Acknowledge", "Price it", "Settle", "Funding board", "Settle"],
  tour: "Start tour",
  marketLabel: "MARKET",
  marketTitle: "Who pays, how much, and against what",
  marketLead:
    "Two questions decide whether this is a business: is the capital pool real, and is the price better than what the supplier pays today. The second one is arithmetic, so it runs live on the quote below — and every assumption about the incumbent is a slider you can move.",
  segmentTitle: "The segment, not the population",
  segmentRows: [
    ["Who", "Suppliers invoicing one large corporate buyer — retail, automotive tier-2, construction materials"],
    ["Invoice", "50,000 – 500,000 ₺ · 30 to 120 day terms"],
    ["Pain", "Cannot wait for maturity; needs cash now and goes to a factor"],
    ["Lock", "The buyer's on-chain acknowledgement — the one condition the product needs"],
    ["Capital", "USDC held anywhere. Not a Turkish bank balance sheet"],
    ["Distribution", "One buyer brings hundreds of suppliers; the sale happens once"],
  ],
  unitEconomics: "Platform economics",
  vsFactoring: "Against a factor, on this invoice",
  payTitle: "Pay by sound, or by QR",
  payLead:
    "The request is encoded as sixteen tones and played out loud. Any phone in the room hears it, checks the CRC and acts on it — no camera, no pairing, no data connection. The QR beside it carries the same request as a SEP-7 URI, so a wallet can scan it instead. Both end in the same fund() call.",
  payModes: ["Play", "Listen", "QR"],
  payPlay: "Play the request",
  payStop: "Stop",
  payListen: "Listen for a request",
  payHeard: "Heard and verified",
  payScanToListen: "Scan with a phone to open the listener",
  payConfirm: "Fund it",
  payAmount: "Amount",
  payFrame: "Frame",
  settleTitle: "Settlement, and what happens when it does not come",
  settleLead:
    "At maturity the buyer pays the face value in and the contract repays funders pro rata. When the buyer does not pay, the same contract runs the recourse waterfall instead.",
  repayCta: "Pay at maturity",
  repaid: "Repaid",
  bufferTitle: "First-loss buffer",
  bufferLead:
    "Platform capital that absorbs a shortfall before it reaches the supplier. An empty buffer passes the whole loss on, which is why the number is on screen.",
  bufferTopUp: "Top up",
  defaultTitle: "Declare a default",
  defaultLead:
    "The contract refuses until the due date plus the grace period has passed. The refusal is the proof that the window is enforced on chain and not in this interface.",
  defaultCta: "Declare default",
  graceLeft: "left before this can be declared",
  absorbed: "Absorbed by the buffer",
  recourseOwed: "Claimed from the supplier",
  nothingAtRisk: "No funded invoice is outstanding.",
  operatorOnly: "Platform operation. It needs the operator token.",
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
    "Three requirements. Each one is answered by something you can open and check, not by a claim on this page. The same ETTN cannot be financed twice either — the contract refuses it — but that is hygiene, not the headline.",
  track: [
    [
      "INTEGRATION",
      "Built on an eligible Stellar protocol",
      "The treasury is a DeFindex vault, created through their factory on testnet. A contribution is deposited for vault shares and a payout burns the shares it is worth, so the pooled capital genuinely sits inside DeFindex rather than beside it. Pricing reads its rate the same way, and a second integration runs alongside: the currency feed is read over Reflector's SEP-40 oracle interface at a configurable address.",
      "DeFindex vault CBXHELM6…ODCP · adapter CD4ZFOAZ…SDNF · SEP-40 OracleClient",
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
  tagline: ["Türkiye'nin işletme sermayesi,", "her yerden fonlanabilir."],
  lead:
    "Bursa'daki üretici parasını doksan gün bekliyor. O açığı kapatacak sermaye Türk bankalarının bilançosunda kilitli. Payper o kapıyı USDC tutan herkese açıyor — saniyeler içinde, elli dolardan başlayarak.",
  leadEmphasis: "Tedarikçiye aynı gün TL geçiyor. Fonlayıcı hiçbir Türk bankasına dokunmuyor.",
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
  roles: { seller: "KOBİ", buyer: "Alıcı", funder: "Fonlayıcı" },
  nav: ["Genel bakış", "Fatura yükle", "Alıcı onayı", "İskonto", "Anchor", "Sesle öde", "Fonlama panosu", "Kapanış"],
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
  switchRole: "Şu rolle davran",
  switchRoleTitle: "Başka bir tarafla davran",
  switchRoleLead:
    "Panel seçtiğin tarafla yeniden yükleniyor ve kanvas o tarafın rengini alıyor. Hangi tarafın ne yapabileceğine bu pencere değil, route handler'lar karar veriyor.",
  switchRoleDemo:
    "Yalnızca demo. Hızlı rol geçişi, tek makinenin sahnede üç tarafı oynayabilmesi için var — sunucuda tutulan anahtarla demo oturumu açıyor ve canlıda bulunmayacak; orada her taraf kendi cüzdanıyla giriş yapar.",
  cancel: "Vazgeç",
  anchorTopUp: "Tedarikçiye USDC al",
  anchorTopUpNote:
    "Alıcının kullandığı SEP-6 on-ramp'ini bu kez tedarikçiye işleterek çalıştırır — böylece çekim yeniden denenebilir.",
  anchorNoInvoice: "Uygun fatura yok",
  anchorSandbox:
    "Sandbox · banka ve KYC bacağı simüle; Stellar bacağı gerçek testnet USDC. Transfer anchor'ın işlem başına limitini aşarsa tutar tranşlara bölünür.",
  anchorSold: "USDC satıldı",
  anchorSent: "gönderildi",
  anchorTranches: "tranş",
  anchorElapsed: "Akış anchor'a gerçek SEP istekleri atıyor; genelde 10–25 saniye sürüyor",
  anchorLegs: "Transferler",
  needsRoleHint: "Burada işlem yapmak {role} rolünü gerektiriyor — bakmak için açabilirsin, işlem için rol değiştir",
  anchorTitle: "TL köprüsü",
  anchorLead:
    "Tek standart kapı: stellar.toml'dan keşif, SEP-10 kimlik, SEP-38 sabit kur, SEP-6 yatırma ve çekme. Anchor değişirse yalnızca alan adı değişir.",
  anchorTabs: ["Tedarikçi çekimi · USDC → TL", "Alıcı ödemesi · TL → USDC"],
  anchorRun: ["USDC → TL akışını çalıştır", "TL → USDC akışını çalıştır"],
  anchorSteps: {
    off: [
      ["stellar.toml keşfi", "SEP-1", "Uç noktalar ve imza anahtarı okunur"],
      ["Cüzdan kimliği", "SEP-10", "Challenge imzalanır, JWT alınır"],
      ["Kur kilidi", "SEP-38", "Sabit USDC→TRY kuru"],
      ["Çekim talebi", "SEP-6", "Hazine adresi ve memo döner"],
      ["Zincir üstü ödeme", "Soroban", "USDC memo ile hazineye gönderilir"],
      ["TL banka hesabına", "Banka", "status=completed · IBAN'a TL"],
    ],
    on: [
      ["Cüzdan kimliği", "SEP-10", "Alıcı cüzdanı imzalar, JWT alır"],
      ["Kur kilidi", "SEP-38", "Sabit TRY→USDC kuru"],
      ["Yatırma talebi", "SEP-6", "IBAN ve açıklama referansı döner"],
      ["Banka havalesi", "Banka", "TL gönderilir, referans yazılır"],
      ["Anchor USDC öder", "SEP-6", "pending_anchor → completed"],
    ],
  },
  anchorStates: { idle: "hazır", running: "çalışıyor", done: "tamamlandı" },
  anchorSettledTo: ["Banka hesabına geçti", "Kontrata USDC geçti"],
  anchorProof: "Kendin doğrula",
  anchorProofLead:
    "Bu ekrandaki hiçbir şey burada yazılı değil. Uç noktaları aç ya da aynı istekleri terminalden çalıştırıp yukarıdaki izle karşılaştır.",
  anchorFailed: "Anchor akışı tamamlanamadı",
  unreadable: "okunamadı",
  walletTitle: "Kimlik ve cüzdan",
  walletLead:
    "Bu oturumun kim olarak imzaladığı ve yanında hangi tarayıcı cüzdanının kanıtlandığı. İkisi bilerek ayrı.",
  signerLabel: "Nasıl giriş yaptın",
  methods: {
    wallet: "tarayıcı cüzdanı bir metin imzaladı",
    passkey: "bu cihazdaki passkey",
    demo: "sahne için sunucuda tutulan anahtar",
  },
  sessionAddress: "Oturum adresi",
  passkeyAccount: "Passkey hesabı",
  onChainYes: "ağda var",
  onChainNo: "oluşturuluyor…",
  onChainFailed: "oluşturulamadı",
  onChainNoNote:
    "Bunu giriş başlattı: Stellar hesabı ilk ödemeyle var olur, o yüzden adres fonlanıyor ve USDC trustline'ı açılıyor. Biraz bekleyince görünmediyse buton yeniden dener.",
  activateCta: "Yeniden dene",
  activatedNote: "Oluşturuldu, USDC trustline'ı ile. Gezgin linki artık açılıyor.",
  walletNotNeeded: "Passkey hesabın kullanıma hazır. Bağlanması gereken bir şey yok.",
  noWalletLinked: "bağlı değil — gerekmiyor",
  walletCancelled: "Cüzdan seçici kapatıldı.",
  roleLabel: "Rol",
  passkeyNote:
    "Bu adres passkey ile giriş yaptığın anda oluştu — bağlaman gereken bir şey yok. Passkey kimin sorduğunu kanıtlar; Soroban XDR'ı tek başına imzalayamaz, o yüzden türettiği anahtar, secp256r1'i zincirde doğrulayan bir Soroban akıllı hesabı gelene kadar sunucuda duruyor. Aşağıdaki cüzdan bağlama isteğe bağlı — zaten elinde olan bir anahtarla imzalamak istersen.",
  linkedWallet: "Bağlı cüzdan",
  linkLead:
    "İsteğe bağlı. Çalışan bir adresin zaten var; bu, kendi tuttuğun bir anahtarla imzalamak istersen. Kanıt girişteki ile aynı challenge ve imza, yani bir cüzdan adresi beyan ederek bağlanamıyor.",
  linkCta: "Cüzdan bağla",
  unlinkCta: "Bağlantıyı kes",
  walletName: "Cüzdan",
  address: "Adres",
  linkedAt: "Bağlandı",
  statsLabel: "İSTATİSTİK",
  statsTitle: "Defterin ölçümü",
  statsLead:
    "Seçtiğin pencerede, kontratın tuttuğu faturalardan sayıldı. Başka hiçbir yerde toplanmıyor — buradaki bir sayı varsa, bu istekte defterden geldi.",
  statsVolume: "Hacim",
  statsActive: "Açık",
  statsAvgDiscount: "Ortalama iskonto",
  statsSettled: "Kapanan",
  statsDaily: "Günlük kayıt",
  statsBuyers: "Alıcıya göre yoğunlaşma",
  statsMix: "Durum dağılımı",
  account: "Hesap",
  invoicesTitle: "Faturalarım",
  invoicesLead:
    "Kayıtlı her faturanın durumu, ETTN'i, belge hash'i ve ne kadarının fonlandığı. Bir satırı aç, beklediği adıma git.",
  recordsLabel: "Kayıt",
  totalFace: "Toplam",
  financedLabel: "Finanse",
  faceUsdcLabel: "USDC nominal",
  lockedPayout: "Kilitli ödeme",
  raisedLabel: "Toplanan",
  registeredAt: "Kayıt",
  sellerVkn: "Satıcı VKN",
  buyerVkn: "Alıcı VKN",
  openContract: "kontratı aç ↗",
  nextStep: ["Onayla", "Fiyatla", "Kapat", "Fonlama panosu", "Kapat"],
  tour: "Turu başlat",
  marketLabel: "PAZAR",
  marketTitle: "Kim ödüyor, ne kadar, neye karşı",
  marketLead:
    "Bunun bir iş olup olmadığına iki soru karar verir: sermaye havuzu gerçek mi, ve fiyat tedarikçinin bugün ödediğinden iyi mi. İkincisi aritmetik, o yüzden aşağıdaki teklif üzerinden canlı çalışıyor — ve mevcut oyuncuya dair her varsayım oynatabileceğin bir kaydırıcı.",
  segmentTitle: "Nüfus değil, segment",
  segmentRows: [
    ["Kim", "Tek bir büyük kurumsal alıcıya fatura kesen tedarikçiler — perakende, otomotiv yan sanayi, inşaat malzemesi"],
    ["Fatura", "50.000 – 500.000 ₺ · 30–120 gün vade"],
    ["Acı", "Vadeyi bekleyemiyor; bugün nakit lazım, faktoringe gidiyor"],
    ["Kilit", "Alıcının zincir üstündeki onayı — ürünün çalışması için tek şart"],
    ["Sermaye", "Her yerde tutulan USDC. Türk bankasının bilançosu değil"],
    ["Dağıtım", "Bir alıcı yüzlerce tedarikçi getirir; satış tek kapıdan"],
  ],
  unitEconomics: "Platform ekonomisi",
  vsFactoring: "Bu faturada, faktoringe karşı",
  payTitle: "Sesle öde, ya da QR ile",
  payLead:
    "İstek on altı tona kodlanıp yüksek sesle çalınıyor. Odadaki herhangi bir telefon duyuyor, CRC'sini doğruluyor ve işleme koyuyor — kamera yok, eşleşme yok, veri bağlantısı yok. Yanındaki QR aynı isteği SEP-7 URI olarak taşıyor; cüzdan onu okuyabiliyor. İkisi de aynı fund() çağrısında bitiyor.",
  payModes: ["Çal", "Dinle", "QR"],
  payPlay: "İsteği çal",
  payStop: "Durdur",
  payListen: "İstek dinle",
  payHeard: "Duyuldu ve doğrulandı",
  payScanToListen: "Dinleyiciyi açmak için telefonla okut",
  payConfirm: "Fonla",
  payAmount: "Tutar",
  payFrame: "Çerçeve",
  settleTitle: "Kapanış ve gelmediğinde ne olduğu",
  settleLead:
    "Vadede alıcı fatura tutarını yatırır ve kontrat fonlayıcılara oransal öder. Alıcı ödemediğinde aynı kontrat bu kez rücu şelalesini çalıştırır.",
  repayCta: "Vadede öde",
  repaid: "Ödendi",
  bufferTitle: "İlk zarar tamponu",
  bufferLead:
    "Açığı tedarikçiye ulaşmadan önce soğuran platform sermayesi. Boş bir tampon zararın tamamını devreder; sayının ekranda durmasının sebebi bu.",
  bufferTopUp: "Tampona ekle",
  defaultTitle: "Temerrüt ilan et",
  defaultLead:
    "Kontrat, vade artı ek süre dolmadan reddeder. Bu ret, sürenin bu arayüzde değil zincir üstünde uygulandığının kanıtıdır.",
  defaultCta: "Temerrüdü ilan et",
  graceLeft: "sonra ilan edilebilir",
  absorbed: "Tamponun soğurduğu",
  recourseOwed: "Tedarikçiden istenen",
  nothingAtRisk: "Açıkta fonlanmış fatura yok.",
  operatorOnly: "Platform işlemi. Operatör anahtarı gerekiyor.",
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
    "Üç şart. Her birinin karşılığı, bu sayfadaki bir iddia değil, açıp kontrol edebileceğin bir şey. Aynı ETTN ikinci kez de finanse edilemiyor — kontrat reddediyor — ama o manşet değil, hijyen.",
  track: [
    [
      "ENTEGRASYON",
      "Uygun bir Stellar protokolü üzerine kurulu",
      "Hazine, testnet'te kendi factory'leri üzerinden açılmış bir DeFindex vault'udur. Katkı vault payına dönüşür, ödeme de karşılık gelen payı yakar; yani havuzdaki sermaye DeFindex'in yanında değil, içindedir. Fiyatlama oranını aynı yerden okur ve yanında ikinci bir entegrasyon çalışır: kur beslemesi, yapılandırılabilir bir adresten Reflector'ün SEP-40 oracle arayüzüyle okunur.",
      "DeFindex vault CBXHELM6…ODCP · adaptör CD4ZFOAZ…SDNF · SEP-40 OracleClient",
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
