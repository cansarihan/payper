/**
 * The audio payment frame.
 *
 * Eight tones carry three bits each, 300 Hz apart, and every symbol is a tone
 * burst followed by silence. The silence is the point: a room's reverb tail
 * smears one symbol into the next, and a guard long enough to let it die is
 * what makes the difference between decoding on a laptop and decoding on a
 * phone held across a desk.
 *
 * Because every symbol has an edge, the receiver re-synchronises on each burst
 * instead of locking once and counting. Clock drift between two devices then
 * has nothing to accumulate into.
 *
 * What the sound is NOT: an authorisation. Anyone within earshot can record and
 * replay these tones, or synthesise their own. The frame carries a *request* —
 * which invoice and how much — and the server decides whether to act on it. The
 * CRC is there to reject a frame the room corrupted, not an attacker.
 */

/**
 * The band, chosen for the narrowest receiver we have to survive: a phone.
 *
 * A handset's audio chain is tuned for speech and rolls off above roughly
 * 3.4 kHz. The earlier plan put its highest tone at 3600 Hz — and that tone was
 * in the preamble, so the one part of the frame a decoder must recognise sat
 * exactly where a phone hears worst. Everything now lives inside the band a
 * telephone preserves.
 */
export const CHIRP_BASE = 1100;
/** Wide enough to survive reverb and a phone's spectral tilt. */
export const CHIRP_STEP = 280;
/** Tone length. */
export const CHIRP_MS = 110;
/** Silence after each tone, so the reverb tail dies before the next one. */
export const CHIRP_GAP_MS = 45;
/** One symbol occupies a tone plus its guard. */
export const CHIRP_SLOT_MS = CHIRP_MS + CHIRP_GAP_MS;

/** Three bits per symbol, eight tones. */
export const SYMBOL_BITS = 3;
export const SYMBOL_COUNT = 1 << SYMBOL_BITS;

/**
 * The lead-in.
 *
 * Chosen against the payloads the encoder actually produces rather than in the
 * abstract: it never occurs inside one, so a decoder cannot lock onto the
 * middle of a frame and read rubbish. It also does not overlap itself, so a
 * missed burst cannot leave a partial match that realigns by accident. The
 * large jumps between neighbours keep it cheap to spot in a spectrum.
 */
export const PREAMBLE = [7, 0, 7, 0, 7, 1];

/** version(4) · invoiceId(12) · amountMinor(24) · crc(8) = 48 bits = 16 symbols. */
export const PAYLOAD_BITS = 40;
export const CRC_BITS = 8;
export const FRAME_SYMBOLS = (PAYLOAD_BITS + CRC_BITS) / SYMBOL_BITS;
export const TOTAL_SYMBOLS = PREAMBLE.length + FRAME_SYMBOLS;

export interface ChirpFrame {
  /** Preamble and data as 3-bit symbols, in play order. */
  symbols: number[];
  /** The five bytes the symbols carry, CRC last. */
  payload: number[];
  crc: number;
  hex: string;
  durationMs: number;
}

export interface ChirpRequest {
  version: number;
  invoiceId: number;
  amountMinor: number;
  crc: number;
}

/** CRC-8, polynomial 0x07. */
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

/** The largest values the fixed-width fields hold. */
export const MAX_INVOICE_ID = 0xfff;
export const MAX_AMOUNT_MINOR = 0xff_ffff;

export function encodeChirp(opts: {
  invoiceId: number;
  amountMinor: number;
  version?: number;
}): ChirpFrame {
  const version = (opts.version ?? 1) & 0xf;
  const invoiceId = Math.min(MAX_INVOICE_ID, Math.max(0, Math.round(opts.invoiceId)));
  const amount = Math.min(MAX_AMOUNT_MINOR, Math.max(0, Math.round(opts.amountMinor)));

  // Five bytes, packed so no field straddles a byte for no reason:
  //   [ version<<4 | id>>8 ][ id & 0xff ][ amount >> 16 ][ >> 8 ][ & 0xff ]
  const bytes = [
    (version << 4) | ((invoiceId >> 8) & 0xf),
    invoiceId & 0xff,
    (amount >> 16) & 0xff,
    (amount >> 8) & 0xff,
    amount & 0xff,
  ];
  const crc = crc8(bytes);

  const symbols = [...PREAMBLE, ...toSymbols([...bytes, crc])];

  return {
    symbols,
    payload: bytes,
    crc,
    hex: [...bytes, crc].map((b) => b.toString(16).padStart(2, "0")).join(""),
    durationMs: symbols.length * CHIRP_SLOT_MS,
  };
}

/** Six bytes into sixteen 3-bit symbols, most significant bit first. */
function toSymbols(bytes: number[]): number[] {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += SYMBOL_BITS) {
    out.push(parseInt(bits.slice(i, i + SYMBOL_BITS).padEnd(SYMBOL_BITS, "0"), 2));
  }
  return out;
}

/**
 * Parse the symbols that follow the preamble.
 *
 * Returns null on anything it cannot vouch for — a hole in the stream, a symbol
 * outside range, or a CRC that does not match. Kept apart from the audio path
 * so the frame format can be tested without a microphone, which is where a bug
 * would otherwise sit unnoticed.
 */
export function decodeChirpFrame(symbols: (number | null)[]): ChirpRequest | null {
  if (symbols.length < FRAME_SYMBOLS) return null;
  const frame = symbols.slice(0, FRAME_SYMBOLS);
  if (frame.some((s) => s === null || s < 0 || s >= SYMBOL_COUNT || !Number.isInteger(s))) {
    return null;
  }

  let bits = "";
  for (const s of frame as number[]) bits += s.toString(2).padStart(SYMBOL_BITS, "0");

  const bytes: number[] = [];
  for (let i = 0; i < 6; i++) bytes.push(parseInt(bits.slice(i * 8, i * 8 + 8), 2));

  const carried = bytes.slice(0, 5);
  const crc = bytes[5];
  if (crc8(carried) !== crc) return null;

  return {
    version: carried[0] >> 4,
    invoiceId: ((carried[0] & 0xf) << 8) | carried[1],
    amountMinor: (carried[2] << 16) | (carried[3] << 8) | carried[4],
    crc,
  };
}

/**
 * Plays a frame through the Web Audio API, looping with a gap, and reports
 * which symbol is sounding so the interface can follow along.
 *
 * Each tone is a sine with a short raised-cosine fade at both ends. The fade
 * matters: a hard edge splatters energy across the whole band and lands in the
 * neighbouring tone's bin, which is exactly what the wide spacing was meant to
 * avoid.
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

  /** Silent slots between repeats, so a listener can find the preamble again. */
  private static readonly REST = 4;
  /**
   * How many times the frame is played before stopping.
   *
   * Not a loop: a request that sounds for ever is a request nobody can tell
   * has been heard. Three passes is the compromise — a listener that missed
   * the first preamble gets two more chances, and the sound still ends.
   */
  private static readonly PASSES = 3;

  start() {
    this.stop();
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;

    const ctx = new AC();
    this.ctx = ctx;
    void ctx.resume();

    const out = ctx.createGain();
    out.gain.value = 0.45;
    out.connect(ctx.destination);

    const tone = CHIRP_MS / 1000;
    const slot = CHIRP_SLOT_MS / 1000;
    const fade = 0.008;

    const schedule = (t0: number) => {
      this.frame.symbols.forEach((s, i) => {
        const start = t0 + i * slot;
        const end = start + tone;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(1, start + fade);
        g.gain.setValueAtTime(1, end - fade);
        g.gain.linearRampToValueAtTime(0, end);
        g.connect(out);

        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(symbolFrequency(s), start);
        o.connect(g);
        o.start(start);
        o.stop(end + 0.01);
      });
    };

    const period = (this.frame.symbols.length + ChirpPlayer.REST) * slot;
    let next = ctx.currentTime + 0.25;
    let played = 1;
    schedule(next);
    this.scheduler = setInterval(() => {
      if (played >= ChirpPlayer.PASSES) {
        this.stop();
        this.onFrameEnd?.();
        return;
      }
      next += period;
      schedule(next);
      played += 1;
    }, period * 1000);

    let index = 0;
    let pass = 0;
    this.onSymbol(0);
    this.timer = setInterval(() => {
      index += 1;
      if (index >= this.frame.symbols.length + ChirpPlayer.REST) {
        index = 0;
        pass += 1;
      }
      if (index === this.frame.symbols.length && pass === 0) this.onFrameEnd?.();
      this.onSymbol(index);
    }, CHIRP_SLOT_MS);

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
 * SEP-7 payment URI. This is what the QR actually contains, so any SEP-7
 * capable wallet can scan it — not a picture of a payment.
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
