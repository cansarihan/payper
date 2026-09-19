/**
 * The audio payment frame.
 *
 * A payment request is encoded as 4-bit symbols, each played as one of sixteen
 * tones (1200 Hz + 150 Hz × n) for 90 ms. A five-symbol preamble marks the
 * start and a CRC-8 closes the frame, so a listener can lock on and verify what
 * it heard. Deliberately narrowband and slow: it has to survive a room.
 *
 * Why this exists: a buyer paying an invoice at a counter has a phone that may
 * have no camera permission, no data, or a cracked screen. Sound reaches every
 * phone in earshot at once and needs nothing but a microphone. The QR beside it
 * carries the same request as a SEP-7 URI, so either route lands in the same
 * wallet.
 */

export const CHIRP_BASE = 1200;
export const CHIRP_STEP = 150;
export const CHIRP_MS = 90;
/** "beep-be-beep-beeep" — a pattern unlikely to occur inside a payload. */
export const PREAMBLE = [3, 11, 3, 11, 11];

export interface ChirpFrame {
  /** Preamble, payload and CRC as 4-bit symbols, in play order. */
  symbols: number[];
  /** The bytes the symbols carry. */
  payload: number[];
  crc: number;
  hex: string;
  durationMs: number;
}

/**
 * Frame layout: version, invoice id (2 bytes), amount in minor units
 * (4 bytes), memo (4 bytes). Fixed width, so a decoder needs no length field.
 */
export function encodeChirp(opts: {
  invoiceId: number;
  amountMinor: number;
  memo: number;
  version?: number;
}): ChirpFrame {
  const bytes = [
    opts.version ?? 1,
    (opts.invoiceId >> 8) & 0xff,
    opts.invoiceId & 0xff,
    (opts.amountMinor >>> 24) & 0xff,
    (opts.amountMinor >>> 16) & 0xff,
    (opts.amountMinor >>> 8) & 0xff,
    opts.amountMinor & 0xff,
    (opts.memo >>> 24) & 0xff,
    (opts.memo >>> 16) & 0xff,
    (opts.memo >>> 8) & 0xff,
    opts.memo & 0xff,
  ];

  const symbols = [...PREAMBLE];
  for (const b of bytes) symbols.push(b >> 4, b & 15);

  const crc = crc8(bytes);
  symbols.push(crc >> 4, crc & 15);

  return {
    symbols,
    payload: bytes,
    crc,
    hex: bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
    durationMs: symbols.length * CHIRP_MS,
  };
}

/** CRC-8 with the 0x07 polynomial, the same one the prototype used. */
export function crc8(bytes: number[]): number {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export const symbolFrequency = (symbol: number) => CHIRP_BASE + CHIRP_STEP * symbol;

/** Payload width: version, invoice (2), amount (4), memo (4). */
export const PAYLOAD_BYTES = 11;
export const PAYLOAD_SYMBOLS = PAYLOAD_BYTES * 2;
export const CRC_SYMBOLS = 2;
/** Symbols after the preamble: payload plus CRC. */
export const FRAME_SYMBOLS = PAYLOAD_SYMBOLS + CRC_SYMBOLS;

export interface ChirpRequest {
  version: number;
  invoiceId: number;
  amountMinor: number;
  memo: number;
  crc: number;
}

/**
 * Parse the symbols that follow the preamble.
 *
 * Returns null on anything it cannot vouch for — a hole in the stream, a symbol
 * outside 0–15, or a CRC that does not match. Kept separate from the audio path
 * so the frame format can be tested without a microphone, which is where a bug
 * would otherwise sit unnoticed.
 */
export function decodeChirpFrame(symbols: (number | null)[]): ChirpRequest | null {
  if (symbols.length < FRAME_SYMBOLS) return null;
  const frame = symbols.slice(0, FRAME_SYMBOLS);
  if (frame.some((s) => s === null || s < 0 || s > 15 || !Number.isInteger(s))) return null;

  const nibbles = frame as number[];
  const bytes: number[] = [];
  for (let i = 0; i < PAYLOAD_BYTES; i++) {
    bytes.push((nibbles[i * 2] << 4) | nibbles[i * 2 + 1]);
  }
  const crc = (nibbles[PAYLOAD_SYMBOLS] << 4) | nibbles[PAYLOAD_SYMBOLS + 1];
  if (crc8(bytes) !== crc) return null;

  return {
    version: bytes[0],
    invoiceId: (bytes[1] << 8) | bytes[2],
    amountMinor: ((bytes[3] << 24) >>> 0) + (bytes[4] << 16) + (bytes[5] << 8) + bytes[6],
    memo: ((bytes[7] << 24) >>> 0) + (bytes[8] << 16) + (bytes[9] << 8) + bytes[10],
    crc,
  };
}

/**
 * Plays a frame through the Web Audio API, looping with a short gap, and
 * reports which symbol is sounding so the UI can follow along.
 *
 * Each symbol is two sine tones plus a quiet square sub-octave: a single sine
 * is hard to pick out of room noise, and the extra partials give a decoder more
 * to correlate against.
 */
export class ChirpPlayer {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private scheduler: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly frame: ChirpFrame,
    private readonly onSymbol: (index: number) => void,
    private readonly onFrameEnd?: () => void,
  ) {}

  /** Silent symbols between repeats, so a listener can find the preamble again. */
  private static readonly GAP = 6;

  start() {
    this.stop();
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;

    const ctx = new AC();
    this.ctx = ctx;

    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    lp.Q.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.055;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.18;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;

    gain.connect(lp);
    lp.connect(comp);
    comp.connect(ctx.destination);
    lp.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(comp);

    const D = CHIRP_MS / 1000;
    const schedule = (t0: number) => {
      // A rising sweep before the frame, like a modem handshake: it wakes the
      // listener's AGC before any data-bearing tone arrives.
      const sweep = ctx.createOscillator();
      sweep.type = "sine";
      sweep.frequency.setValueAtTime(700, t0 - 0.2);
      sweep.frequency.exponentialRampToValueAtTime(3800, t0 - 0.03);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0, t0 - 0.2);
      sg.gain.linearRampToValueAtTime(0.7, t0 - 0.18);
      sg.gain.setValueAtTime(0.7, t0 - 0.05);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 - 0.01);
      sweep.connect(sg);
      sg.connect(gain);
      sweep.start(t0 - 0.2);
      sweep.stop(t0);

      this.frame.symbols.forEach((s, i) => {
        const f = symbolFrequency(s);
        const partner = symbolFrequency((s * 7 + 5) % 16);
        const start = t0 + i * D;
        const end = start + D;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(1, start + 0.006);
        g.gain.setValueAtTime(1, end - 0.018);
        g.gain.exponentialRampToValueAtTime(0.001, end - 0.002);
        g.connect(gain);

        for (const [freq, level, type] of [
          [f, 1, "sine"],
          [partner, 0.55, "sine"],
          [f / 2, 0.04, "square"],
        ] as const) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.setValueAtTime(freq, start);
          const og = ctx.createGain();
          og.gain.value = level;
          o.connect(og);
          og.connect(g);
          o.start(start);
          o.stop(end + 0.01);
        }
      });
    };

    const period = ((this.frame.symbols.length + ChirpPlayer.GAP) * CHIRP_MS) / 1000;
    let next = ctx.currentTime + 0.28;
    schedule(next);
    this.scheduler = setInterval(() => {
      next += period;
      schedule(next);
    }, period * 1000);

    let index = 0;
    let pass = 0;
    this.onSymbol(0);
    this.timer = setInterval(() => {
      index += 1;
      if (index >= this.frame.symbols.length + ChirpPlayer.GAP) {
        index = 0;
        pass += 1;
      }
      if (index === this.frame.symbols.length && pass === 0) this.onFrameEnd?.();
      this.onSymbol(index);
    }, CHIRP_MS);

    return true;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.scheduler) clearInterval(this.scheduler);
    this.timer = null;
    this.scheduler = null;
    try {
      void this.ctx?.close();
    } catch {
      /* closing an already-closed context is not an error worth surfacing */
    }
    this.ctx = null;
  }
}

/**
 * SEP-7 payment URI. This is what the QR actually contains, so any
 * SEP-7 capable wallet can scan it — not a picture of a payment.
 */
export function sep7PaymentUri(opts: {
  destination: string;
  amount: string;
  assetCode: string;
  assetIssuer: string;
  memo?: string;
  message?: string;
}): string {
  const p = new URLSearchParams({
    destination: opts.destination,
    amount: opts.amount,
    asset_code: opts.assetCode,
    asset_issuer: opts.assetIssuer,
  });
  if (opts.memo) {
    p.set("memo", opts.memo);
    p.set("memo_type", "MEMO_ID");
  }
  if (opts.message) p.set("msg", opts.message);
  return `web+stellar:pay?${p.toString()}`;
}
