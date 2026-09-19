/**
 * Round-trips the audio payment frame format.
 *
 * The audio path — microphone, FFT, symbol clock — can only be exercised with a
 * speaker in a room. The frame format can be tested here, and that is where a
 * bug would otherwise sit unnoticed: a payment request that decodes to the
 * wrong amount is far worse than one that fails to decode at all.
 */
import {
  CRC_SYMBOLS,
  FRAME_SYMBOLS,
  PAYLOAD_SYMBOLS,
  PREAMBLE,
  crc8,
  decodeChirpFrame,
  encodeChirp,
  symbolFrequency,
} from "@/lib/chirp";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

/** The symbols a receiver reads after locking onto the preamble. */
const afterPreamble = (symbols: number[]) => symbols.slice(PREAMBLE.length);

console.log("── frame format ───────────────────────────────────────────────");
{
  const frame = encodeChirp({ invoiceId: 481, amountMinor: 294000, memo: 88213 });
  check(frame.symbols.length === PREAMBLE.length + FRAME_SYMBOLS, "symbol count", String(frame.symbols.length));
  check(
    frame.symbols.slice(0, PREAMBLE.length).join(",") === PREAMBLE.join(","),
    "preamble leads the frame",
  );
  check(frame.symbols.every((s) => s >= 0 && s <= 15), "every symbol is within 0–15");
  check(frame.durationMs === frame.symbols.length * 90, "duration", `${frame.durationMs} ms`);
  check(frame.payload.length === 11, "payload is 11 bytes");
}

console.log("\n── round trip ─────────────────────────────────────────────────");
{
  const cases = [
    { invoiceId: 1, amountMinor: 5000, memo: 80001 },
    { invoiceId: 481, amountMinor: 294000, memo: 88213 },
    { invoiceId: 65535, amountMinor: 2_147_000_000, memo: 4_294_967_295 },
    { invoiceId: 0, amountMinor: 1, memo: 0 },
  ];
  for (const c of cases) {
    const frame = encodeChirp(c);
    const decoded = decodeChirpFrame(afterPreamble(frame.symbols));
    const same =
      decoded !== null &&
      decoded.invoiceId === c.invoiceId &&
      decoded.amountMinor === c.amountMinor &&
      decoded.memo === c.memo &&
      decoded.version === 1;
    check(same, `fatura #${c.invoiceId} · ${c.amountMinor} kuruş · memo ${c.memo}`,
      decoded ? `→ ${decoded.amountMinor}` : "did not decode");
  }
}

console.log("\n── 2000 random payloads ───────────────────────────────────────");
{
  let bad = 0;
  for (let i = 0; i < 2000; i++) {
    const c = {
      invoiceId: Math.floor(Math.random() * 65536),
      amountMinor: Math.floor(Math.random() * 2_000_000_000),
      memo: Math.floor(Math.random() * 4_000_000_000),
    };
    const d = decodeChirpFrame(afterPreamble(encodeChirp(c).symbols));
    if (!d || d.invoiceId !== c.invoiceId || d.amountMinor !== c.amountMinor || d.memo !== c.memo) bad++;
  }
  check(bad === 0, "all decoded back byte for byte", bad ? `${bad} failures` : "0 failures");
}

console.log("\n── corrupt frames are refused ──────────────────────────────────");
{
  const frame = encodeChirp({ invoiceId: 481, amountMinor: 294000, memo: 88213 });
  const clean = afterPreamble(frame.symbols);

  // A single flipped symbol must not survive the CRC.
  let survived = 0;
  for (let i = 0; i < PAYLOAD_SYMBOLS; i++) {
    for (let delta = 1; delta < 16; delta++) {
      const tampered = [...clean];
      tampered[i] = (tampered[i] + delta) % 16;
      if (decodeChirpFrame(tampered) !== null) survived++;
    }
  }
  check(survived === 0, "a single flipped symbol never passes the CRC", `${survived} leaks`);

  check(decodeChirpFrame(clean.slice(0, -1)) === null, "a short frame is refused");
  const holed = [...clean] as (number | null)[];
  holed[7] = null;
  check(decodeChirpFrame(holed) === null, "a frame with a hole is refused");
  const outOfRange = [...clean];
  outOfRange[3] = 16;
  check(decodeChirpFrame(outOfRange) === null, "an out-of-range symbol is refused");

  // A CRC that does not cover the payload it arrived with.
  const wrongCrc = [...clean];
  wrongCrc[PAYLOAD_SYMBOLS] = (wrongCrc[PAYLOAD_SYMBOLS] + 1) % 16;
  check(decodeChirpFrame(wrongCrc) === null, "a wrong CRC is refused");
}

console.log("\n── tone plan ──────────────────────────────────────────────────");
{
  const freqs = Array.from({ length: 16 }, (_, i) => symbolFrequency(i));
  check(freqs[0] === 1200 && freqs[15] === 3450, "range", `${freqs[0]}–${freqs[15]} Hz`);
  const gaps = freqs.slice(1).map((f, i) => f - freqs[i]);
  check(new Set(gaps).size === 1 && gaps[0] === 150, "tones are 150 Hz apart");
  // A 4096-point FFT at 48 kHz has ~11.7 Hz bins; 150 Hz is many bins apart.
  check(150 / (48000 / 4096) > 10, "they separate across FFT bins", `${(150 / (48000 / 4096)).toFixed(1)} bins`);
  // The preamble must not appear inside a payload by accident.
  const frame = encodeChirp({ invoiceId: 481, amountMinor: 294000, memo: 88213 });
  const body = afterPreamble(frame.symbols).join(",");
  check(!body.includes(PREAMBLE.join(",")), "the preamble never recurs inside a payload");
}

console.log("\n── CRC-8 ──────────────────────────────────────────────────────");
{
  check(crc8([]) === 0, "empty input is 0");
  check(crc8([0x00]) === 0, "a single zero byte is 0");
  const a = crc8([1, 2, 3]);
  const b = crc8([1, 2, 4]);
  check(a !== b, "different payloads give different CRCs", `${a} vs ${b}`);
  check(CRC_SYMBOLS === 2, "the CRC occupies two symbols");
}

console.log(
  failures === 0 ? "\n✅ The chirp codec is correct\n" : `\n❌ ${failures} kontrol başarısız\n`,
);
process.exit(failures === 0 ? 0 : 1);
