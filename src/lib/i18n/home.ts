import type { Lang } from "./dictionary";

/** Copy for the scroll-driven sections of the public site. */
const HOME = {
  en: {
    podTitle: "A sustainable yield premium",
    podSub: "Uncorrelated to crypto markets — it comes from real invoice flows",
    podNote: "Comparison figures: RWA.xyz and DefiLlama",
    pod: ["USDC lending", "Digital asset lending", "Basis trade", "U.S. Treasuries"],

    srcTitle: "Where the yield comes from",
    src: [
      [
        "Invoice discount",
        "The supplier sells a buyer-acknowledged invoice before maturity; the spread is the funder's yield.",
        "DISCOUNT YIELD",
      ],
      [
        "Treasury yield",
        "Idle USDC does not sit still; it earns while the round fills.",
        "TREASURY APY",
      ],
      [
        "Currency premium",
        "The TRY/USD feed measures the lira's observed move; the premium is added to the discount and protects the funder.",
        "FX PREMIUM",
      ],
    ],

    ledTitle: "Receivable financing, settled on chain",
    ledP:
      "Built at the Rise In x Stellar Pro Hackathon on Soroban, a yield-bearing treasury, a TRY/USD feed and a SEP-6 anchor.",

    stackLabel: "The payper stack",
    layers: [
      [
        "Settlement layer",
        "Stellar: finality in about five seconds at close to no fee. Every registration, acknowledgement and repayment is one Soroban call.",
      ],
      [
        "Money layer",
        "Funded in USDC, repaid in lira. The TRY/USD feed carries the rate and its observed move on chain.",
      ],
      [
        "Custody layer",
        "Passkey wallets: no seed phrase, a key that stays on the device. Funder and supplier each hold their own.",
      ],
      [
        "Compliance layer",
        "The UBL-TR e-invoice standard, an ETTN uniqueness check and a tax-number match. The same invoice cannot be financed twice.",
      ],
      [
        "Financing layer",
        "Treasury yield plus currency premium plus credit plus fee equals one discount rate. The formula is open, on chain, and recomputed on every call.",
      ],
      [
        "Application layer",
        "The panel: upload, buyer acknowledgement, a live quote, the funding board and a lira exit through the anchor.",
      ],
    ],

    modernTitle: "Modern payments need modern rails",
    ctaTitle: "The price is not a fixed number. It is computed from live on-chain yield.",
    ctaPool: "Join the pool",
    live: "live",
    fallback: "fallback",
  },
  tr: {
    podTitle: "Sürdürülebilir getiri primi",
    podSub: "Kripto piyasasıyla ilintisiz — gerçek fatura akışından geliyor",
    podNote: "Karşılaştırma verileri: RWA.xyz ve DefiLlama",
    pod: ["USDC borç verme", "Dijital varlık kredisi", "Basis trade", "ABD Hazine"],

    srcTitle: "Getiri nereden geliyor?",
    src: [
      [
        "Fatura iskontosu",
        "Tedarikçi, alıcı onaylı faturasını vadeden önce satar; fark fonlayıcıya getiri olur.",
        "İSKONTO GETİRİSİ",
      ],
      [
        "Hazine getirisi",
        "Bekleyen USDC boş durmaz; tur dolarken getiri kazanır.",
        "HAZİNE APY",
      ],
      [
        "Kur primi",
        "TRY/USD beslemesi liranın gözlenen hareketini ölçer; prim iskontoya eklenir ve fonlayıcıyı korur.",
        "KUR PRİMİ",
      ],
    ],

    ledTitle: "Alacak finansmanı, zincir üstünde kapanıyor",
    ledP:
      "Rise In x Stellar Pro Hackathon'da; Soroban, getiri üreten bir hazine, TRY/USD beslemesi ve SEP-6 anchor üzerine kuruldu.",

    stackLabel: "payper yığını",
    layers: [
      [
        "İşlem katmanı",
        "Stellar: yaklaşık beş saniyede kesinlik, sıfıra yakın ücret. Her kayıt, onay ve ödeme tek bir Soroban çağrısı.",
      ],
      [
        "Para katmanı",
        "USDC ile fonlanır, lira ile ödenir. TRY/USD beslemesi kuru ve gözlenen hareketini zincire taşır.",
      ],
      [
        "Saklama katmanı",
        "Passkey cüzdanlar: seed phrase yok, cihazda kalan anahtar. Fonlayıcı ve tedarikçi kendi anahtarını tutar.",
      ],
      [
        "Uyum katmanı",
        "UBL-TR e-fatura standardı, ETTN tekillik kontrolü ve VKN eşleşmesi. Aynı fatura iki kez finanse edilemez.",
      ],
      [
        "Finansman katmanı",
        "Hazine getirisi + kur primi + kredi + ücret = tek iskonto oranı. Formül açık, zincir üstünde ve her çağrıda yeniden hesaplanıyor.",
      ],
      [
        "Uygulama katmanı",
        "Panel: fatura yükleme, alıcı onayı, canlı teklif, fonlama panosu ve anchor üzerinden lira çıkışı.",
      ],
    ],

    modernTitle: "Modern ödemeler modern altyapı ister",
    ctaTitle: "Fiyat sabit bir sayı değil. Canlı zincir getirisinden hesaplanıyor.",
    ctaPool: "Havuza katıl",
    live: "canlı",
    fallback: "yedek",
  },
} as const;

export const home = (lang: Lang) => HOME[lang];
