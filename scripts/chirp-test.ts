/**
 * Round-trips the audio payment frame format.
 *
 * The audio path — microphone, FFT, burst detection — can only be exercised
 * with a speaker in a room. The frame format can be tested here, and that is
 * where a bug would otherwise sit unnoticed: a payment request that decodes to
 * the wrong amount is far worse than one that fails to decode at all.
 */
import {
  CHIRP_BASE,
  CHIRP_GAP_MS,
  CHIRP_MS,
  CHIRP_SLOT_MS,
  CHIRP_STEP,
  FRAME_SYMBOLS,
  MAX_AMOUNT_MINOR,
  MAX_INVOICE_ID,
  PREAMBLE,
  SYMBOL_COUNT,
  TOTAL_SYMBOLS,
  crc8,
  decodeChirpFrame,
  encodeChirp,
  symbolFrequency,
} from "@/lib/chirp";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) failures++;
  const mark = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ""}`);
};

console.log("── frame format ───────────────────────────────────────────────");
const frame = encodeChirp({ invoiceId: 4, amountMinor: 294_000 });
check(frame.symbols.length === TOTAL_SYMBOLS, "symbol count", `${frame.symbols.length}`);
check(
  PREAMBLE.every((p, i) => frame.symbols[i] === p),
  "preamble leads the frame",
);
check(
  frame.symbols.every((s) => Number.isInteger(s) && s >= 0 && s < SYMBOL_COUNT),
  `every symbol is within 0–${SYMBOL_COUNT - 1}`,
);
check(frame.payload.length === 5, "payload is 5 bytes");
check(
  frame.durationMs === TOTAL_SYMBOLS * CHIRP_SLOT_MS,
  "duration",
  `${(frame.durationMs / 1000).toFixed(2)}s`,
);

console.log("\n── round trip ─────────────────────────────────────────────────");
const back = decodeChirpFrame(frame.symbols.slice(PREAMBLE.length));
check(back !== null, "decoded");
check(back?.invoiceId === 4, "invoice id", String(back?.invoiceId));
check(back?.amountMinor === 294_000, "amount", String(back?.amountMinor));
check(back?.version === 1, "version", String(back?.version));

console.log("\n── 5000 random payloads ───────────────────────────────────────");
let mismatches = 0;
for (let i = 0; i < 5000; i++) {
  const id = Math.floor(Math.random() * (MAX_INVOICE_ID + 1));
  const amount = Math.floor(Math.random() * (MAX_AMOUNT_MINOR + 1));
  const f = encodeChirp({ invoiceId: id, amountMinor: amount });
  const d = decodeChirpFrame(f.symbols.slice(PREAMBLE.length));
  if (!d || d.invoiceId !== id || d.amountMinor !== amount) mismatches++;
}
check(mismatches === 0, "all decoded back exactly", `${mismatches} failures`);

console.log("\n── corrupt frames are refused ─────────────────────────────────");
let leaks = 0;
for (let i = 0; i < 2000; i++) {
  const f = encodeChirp({
    invoiceId: Math.floor(Math.random() * 4096),
    amountMinor: Math.floor(Math.random() * 1e6),
  });
  const data = f.symbols.slice(PREAMBLE.length);
  const at = Math.floor(Math.random() * data.length);
  const was = data[at];
  data[at] = (was + 1 + Math.floor(Math.random() * (SYMBOL_COUNT - 1))) % SYMBOL_COUNT;
  if (data[at] !== was && decodeChirpFrame(data) !== null) leaks++;
}
check(leaks === 0, "a single flipped symbol never passes the CRC", `${leaks} leaks`);

const short = encodeChirp({ invoiceId: 1, amountMinor: 100 }).symbols.slice(PREAMBLE.length, -1);
check(decodeChirpFrame(short) === null, "a short frame is refused");

const holed = encodeChirp({ invoiceId: 1, amountMinor: 100 }).symbols.slice(PREAMBLE.length);
const withHole: (number | null)[] = [...holed];
withHole[5] = null;
check(decodeChirpFrame(withHole) === null, "a frame with a hole is refused");

const wide: (number | null)[] = [...holed];
wide[2] = SYMBOL_COUNT + 3;
check(decodeChirpFrame(wide) === null, "an out-of-range symbol is refused");

console.log("\n── tone plan ──────────────────────────────────────────────────");
const lo = symbolFrequency(0);
const hi = symbolFrequency(SYMBOL_COUNT - 1);
check(lo === CHIRP_BASE && hi === CHIRP_BASE + CHIRP_STEP * (SYMBOL_COUNT - 1), "range", `${lo}–${hi} Hz`);
check(
  Array.from({ length: SYMBOL_COUNT - 1 }, (_, i) => symbolFrequency(i + 1) - symbolFrequency(i)).every(
    (d) => d === CHIRP_STEP,
  ),
  `tones are ${CHIRP_STEP} Hz apart`,
);
// A 4096-point FFT at 48 kHz has ~11.7 Hz bins.
const bins = CHIRP_STEP / (48_000 / 4096);
check(bins > 20, "they separate across FFT bins", `${bins.toFixed(1)} bins`);
check(CHIRP_GAP_MS >= 40, "the guard is long enough for a room's reverb tail", `${CHIRP_GAP_MS} ms`);

// The lead-in must not occur inside a payload, or a decoder could lock onto the
// middle of a frame and read rubbish that happens to pass the CRC.
let recurs = 0;
for (let i = 0; i < 4000; i++) {
  const data = encodeChirp({
    invoiceId: Math.floor(Math.random() * 4096),
    amountMinor: Math.floor(Math.random() * MAX_AMOUNT_MINOR),
  }).symbols.slice(PREAMBLE.length);
  for (let k = 0; k + PREAMBLE.length <= data.length; k++) {
    if (PREAMBLE.every((p, j) => data[k + j] === p)) recurs++;
  }
}
check(recurs === 0, "the preamble never recurs inside a payload", `${recurs} hits`);

console.log("\n── CRC-8 ──────────────────────────────────────────────────────");
check(crc8([]) === 0, "empty input is 0");
check(crc8([0]) === 0, "a single zero byte is 0");
check(crc8([1, 2, 3]) !== crc8([3, 2, 1]), "order matters");
check(FRAME_SYMBOLS === 16, "the frame is 16 data symbols", String(FRAME_SYMBOLS));
check(CHIRP_MS >= 100, "the tone is long enough to resolve", `${CHIRP_MS} ms`);

console.log(
  failures === 0
    ? "\n\x1b[32m\x1b[1m✅ The chirp codec is correct\x1b[0m\n"
    : `\n\x1b[31m\x1b[1m✗ ${failures} failure(s)\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
