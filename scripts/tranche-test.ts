/**
 * The splitter, against the anchor's real limits.
 *
 * Every part has to be payable on its own: at or below the cap, at or above
 * the floor, and the parts have to add back up to what was asked for.
 */
import { tranche } from "@/lib/anchor/settle";

const G = "\x1b[32m", R = "\x1b[31m", B = "\x1b[1m", O = "\x1b[0m";
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`   ${G}✓${O} ${name}`);
  else {
    failed++;
    console.log(`   ${R}✕${O} ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const MIN = 50, MAX = 3000, DEC = 2;
const sum = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;

console.log(`${B}Tranş bölücü · anchor limitleri ${MIN}–${MAX} TRY${O}\n`);

// The case that failed live: just over the cap.
const tight = tranche(3016, MIN, MAX, DEC);
check("3016 TRY bölünüyor", tight.length === 2, `parçalar: ${tight}`);
check("hiçbir parça tavanı aşmıyor", tight.every((p) => p <= MAX), `${tight}`);
check("hiçbir parça tabanın altında değil", tight.every((p) => p >= MIN), `${tight}`);
check("toplam korunuyor", sum(tight) === 3016, `${sum(tight)}`);

// A hundred thousand lira, the figure the README quotes.
const big = tranche(100_000, MIN, MAX, DEC);
check("100.000 TRY → 34 tranş", big.length === 34, `${big.length}`);
check("büyük tutarda tavan aşılmıyor", big.every((p) => p <= MAX));
check("büyük tutarda taban altına düşülmüyor", big.every((p) => p >= MIN));
check("büyük tutarda toplam korunuyor", sum(big) === 100_000, `${sum(big)}`);

// Anything that fits goes in one.
check("tavanın altı tek parça", tranche(2999.99, MIN, MAX, DEC).length === 1);
check("tam tavan tek parça", tranche(3000, MIN, MAX, DEC).length === 1);
check("sıfır boş döner", tranche(0, MIN, MAX, DEC).length === 0);

// Seven decimals, the asset side.
const asset = tranche(54.4450354, 1, 300, 7);
check("varlık tarafı ondalığı koruyor", sum2(asset) === 54.4450354, `${asset}`);
function sum2(a: number[]) {
  return Math.round(a.reduce((s, x) => s + x, 0) * 1e7) / 1e7;
}

// The property that matters, over a wide sweep.
let swept = 0;
for (let total = MIN; total <= 250_000; total += 137.13) {
  const parts = tranche(total, MIN, MAX, DEC);
  const floored = Math.floor(total * 100) / 100;
  if (!parts.every((p) => p <= MAX && p >= MIN) || sum(parts) !== floored) {
    check(`süpürme ${total}`, false, `${parts}`);
    break;
  }
  swept++;
}
check(`${swept} tutarda tavan/taban/toplam korunuyor`, swept > 1800, `${swept}`);

console.log(
  failed === 0 ? `\n${G}${B}✅ Tranş bölücü doğru${O}` : `\n${R}${B}❌ ${failed} kontrol düştü${O}`,
);
if (failed) process.exit(1);
