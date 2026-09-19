"use client";

import {
  CHIRP_MS,
  CRC_SYMBOLS,
  PAYLOAD_SYMBOLS,
  PREAMBLE,
  decodeChirpFrame,
  symbolFrequency,
  type ChirpRequest,
} from "./chirp";

/**
 * The receiving half: a microphone, an FFT and a symbol clock.
 *
 * How it works, and why:
 *
 * 1. **Spectral reads.** An `AnalyserNode` gives a magnitude spectrum. For each
 *    read we take the loudest of the sixteen tone bins; tones are 150 Hz apart
 *    and a 4096-point FFT at 48 kHz has ~12 Hz bins, so they never collide.
 *
 * 2. **Oversampling.** Reads happen roughly six times per symbol. A symbol is
 *    90 ms, so a single badly-timed read cannot decide it.
 *
 * 3. **Preamble lock.** The frame opens with 3,11,3,11,11 — a pattern chosen to
 *    be unlikely inside a payload. We look for it with roughly correct timing,
 *    which also tells us where the symbol clock sits.
 *
 * 4. **Slot sampling, not run collapsing.** Once locked, each following symbol
 *    is read at the centre of its 90 ms slot. Collapsing repeated reads would
 *    be simpler and wrong: a payload byte like 0x33 is genuinely two identical
 *    symbols in a row, and collapsing would eat one.
 *
 * 5. **CRC-8.** The last byte checks the rest. A frame that fails is dropped
 *    silently and the search restarts, because acting on a half-heard payment
 *    request is worse than missing it.
 */

/** Sixteen tones, one per 4-bit symbol. */
const SYMBOLS = Array.from({ length: 16 }, (_, i) => i);
/** Reads per symbol. Six gives the lock enough timing resolution. */
const READS_PER_SYMBOL = 6;
const READ_INTERVAL_MS = CHIRP_MS / READS_PER_SYMBOL;
/**
 * How far above the noise floor a tone has to sit, in dB.
 *
 * A fixed magnitude gate works on a laptop and fails on a phone, where the
 * input chain lifts the whole spectrum and a quiet-but-clear tone still reads
 * as loud. The floor is measured from the bins between the tones on every read,
 * so the gate follows whatever the device is doing.
 */
const MIN_ABOVE_FLOOR = 6;
/** A tone must also beat the runner-up tone by this much, in dB. */
const MIN_CONTRAST_DB = 3;

export interface DecodedFrame extends ChirpRequest {
  /** Fraction of slots that produced a confident read. */
  confidence: number;
}

export interface DecoderStatus {
  state: "idle" | "listening" | "locked" | "decoding" | "done" | "error";
  /** Symbol heard on the most recent read, or null for silence. */
  symbol: number | null;
  level: number;
  /** Payload symbols captured so far, once locked. */
  captured: number;
  message?: string;
  /** What the audio chain is actually doing, so a silent failure is visible. */
  diag?: {
    sampleRate: number;
    contextState: string;
    /** Loudest tone bin and the measured floor, in dB. */
    peakDb: number;
    floorDb: number;
  };
}

interface Read {
  at: number;
  symbol: number | null;
  level: number;
}

export class ChirpDecoder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private spectrum: Float32Array<ArrayBuffer> | null = null;

  private reads: Read[] = [];
  private lockedAt: number | null = null;
  private bins: number[] = [];

  constructor(
    private readonly onStatus: (s: DecoderStatus) => void,
    private readonly onFrame: (f: DecodedFrame) => void,
  ) {}

  async start(): Promise<void> {
    // The context is created and resumed here, before the first await: iOS
    // grants audio on a user gesture and does not carry that grant across a
    // promise, so a context built after getUserMedia stays suspended and every
    // spectrum read comes back as silence.
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      this.onStatus({
        state: "error",
        symbol: null,
        level: 0,
        captured: 0,
        message: "This browser has no Web Audio.",
      });
      return;
    }
    const ctx = new AC();
    this.ctx = ctx;
    void ctx.resume();

    if (!navigator.mediaDevices?.getUserMedia) {
      this.onStatus({
        state: "error",
        symbol: null,
        level: 0,
        captured: 0,
        message: "This browser cannot reach a microphone.",
      });
      return;
    }

    try {
      // Every one of these would normally be on: they are designed for speech
      // and they would chew the tones apart.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      this.onStatus({
        state: "error",
        symbol: null,
        level: 0,
        captured: 0,
        message:
          (e as Error).name === "NotAllowedError"
            ? "Microphone permission was refused."
            : `The microphone could not be opened: ${(e as Error).message}`,
      });
      return;
    }

    // Resuming again after the grant: Safari can leave the context suspended
    // while the permission sheet is up.
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        /* reported through the diagnostics line rather than thrown */
      }
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    // Little smoothing: averaging across frames would blur symbol boundaries.
    analyser.smoothingTimeConstant = 0.1;
    analyser.minDecibels = -120;
    analyser.maxDecibels = 0;
    this.analyser = analyser;
    this.spectrum = new Float32Array(new ArrayBuffer(analyser.frequencyBinCount * 4));

    ctx.createMediaStreamSource(this.stream).connect(analyser);

    // Which FFT bin each tone lands in, at this device's actual sample rate.
    const binWidth = ctx.sampleRate / analyser.fftSize;
    this.bins = SYMBOLS.map((s) => Math.round(symbolFrequency(s) / binWidth));

    this.reads = [];
    this.lockedAt = null;
    this.onStatus({ state: "listening", symbol: null, level: 0, captured: 0 });
    this.timer = setInterval(() => this.tick(), READ_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      void this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
    this.analyser = null;
    this.onStatus({ state: "idle", symbol: null, level: 0, captured: 0 });
  }

  private tick(): void {
    const analyser = this.analyser;
    const spectrum = this.spectrum;
    if (!analyser || !spectrum) return;

    analyser.getFloatFrequencyData(spectrum);

    // Pick the loudest tone bin, and note the runner-up: a tone we cannot
    // separate from its neighbour is not a symbol, it is noise.
    let best = -1;
    let bestDb = -Infinity;
    let secondDb = -Infinity;
    for (const s of SYMBOLS) {
      const bin = this.bins[s];
      const db = Math.max(spectrum[bin - 1] ?? -Infinity, spectrum[bin], spectrum[bin + 1] ?? -Infinity);
      if (db > bestDb) {
        secondDb = bestDb;
        bestDb = db;
        best = s;
      } else if (db > secondDb) {
        secondDb = db;
      }
    }

    // The floor is read from the gaps between the tones, which carry no signal
    // by construction. Comparing against it rather than against a constant is
    // what lets the same code work on a laptop and on a phone whose input
    // chain lifts the whole spectrum.
    const floorDb = this.noiseFloor(spectrum);
    const aboveFloor = bestDb - floorDb;
    const contrast = bestDb - secondDb;
    const symbol =
      Number.isFinite(bestDb) && aboveFloor >= MIN_ABOVE_FLOOR && contrast >= MIN_CONTRAST_DB
        ? best
        : null;

    // A 0..100 reading for the meter, scaled to how far above the floor the
    // loudest tone sits rather than to an absolute level.
    const level = Math.max(0, Math.min(100, aboveFloor * 4));
    const diag = {
      sampleRate: Math.round(this.ctx?.sampleRate ?? 0),
      contextState: this.ctx?.state ?? "none",
      peakDb: Math.round(bestDb),
      floorDb: Math.round(floorDb),
    };

    const at = performance.now();
    this.reads.push({ at, symbol, level });
    // Keep a little over one frame's worth of history.
    const horizon = at - (PREAMBLE.length + PAYLOAD_SYMBOLS + CRC_SYMBOLS + 4) * CHIRP_MS;
    while (this.reads.length && this.reads[0].at < horizon) this.reads.shift();

    if (this.lockedAt === null) {
      const lock = this.findPreamble();
      if (lock !== null) {
        this.lockedAt = lock;
        this.onStatus({ state: "locked", symbol, level, captured: 0, diag });
        return;
      }
      this.onStatus({ state: "listening", symbol, level, captured: 0, diag });
      return;
    }

    const needed = PAYLOAD_SYMBOLS + CRC_SYMBOLS;
    const elapsed = at - this.lockedAt;
    const captured = Math.min(needed, Math.floor(elapsed / CHIRP_MS));

    if (captured < needed) {
      this.onStatus({ state: "decoding", symbol, level, captured, diag });
      return;
    }

    const frame = this.readFrame(this.lockedAt);
    this.lockedAt = null;
    if (!frame) {
      // CRC failed or too many slots were unreadable: go back to listening
      // rather than surface a payment request we are not sure about.
      this.onStatus({
        state: "listening",
        symbol,
        level,
        captured: 0,
        message: "The frame did not verify — still listening",
        diag,
      });
      return;
    }
    this.onStatus({ state: "done", symbol, level, captured: needed, diag });
    this.onFrame(frame);
  }

  /**
   * The median of the bins that sit between the tones.
   *
   * Tones are 150 Hz apart, so the midpoints carry nothing we transmit. The
   * median rather than the mean, because a stray peak from the room should not
   * drag the floor up and mute a real symbol.
   */
  private noiseFloor(spectrum: Float32Array): number {
    const gaps: number[] = [];
    for (let i = 0; i < this.bins.length - 1; i++) {
      const mid = Math.round((this.bins[i] + this.bins[i + 1]) / 2);
      const db = spectrum[mid];
      if (Number.isFinite(db)) gaps.push(db);
    }
    if (gaps.length === 0) return -120;
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  }

  /**
   * Find the preamble and return the time its last symbol ends.
   *
   * Each expected symbol is checked against the reads inside its own slot,
   * walking backwards from the newest, so the lock lands on the most recent
   * frame rather than a stale one.
   */
  private findPreamble(): number | null {
    const span = PREAMBLE.length * CHIRP_MS;
    const newest = this.reads.at(-1);
    if (!newest) return null;

    for (let endOffset = 0; endOffset <= CHIRP_MS; endOffset += READ_INTERVAL_MS) {
      const end = newest.at - endOffset;
      const start = end - span;
      if (this.reads.length === 0 || start < this.reads[0].at) break;

      let matched = true;
      for (let i = 0; i < PREAMBLE.length && matched; i++) {
        const centre = start + i * CHIRP_MS + CHIRP_MS / 2;
        if (this.symbolAt(centre) !== PREAMBLE[i]) matched = false;
      }
      if (matched) return end;
    }
    return null;
  }

  /** Read the payload and CRC from the slots following `lockEnd`. */
  private readFrame(lockEnd: number): DecodedFrame | null {
    const symbols: (number | null)[] = [];
    for (let i = 0; i < PAYLOAD_SYMBOLS + CRC_SYMBOLS; i++) {
      symbols.push(this.symbolAt(lockEnd + i * CHIRP_MS + CHIRP_MS / 2));
    }

    const confidence = symbols.filter((s) => s !== null).length / symbols.length;
    const request = decodeChirpFrame(symbols);
    if (!request) return null;
    return { ...request, confidence };
  }

  /**
   * The symbol sounding at `time`: a majority vote over the reads inside that
   * slot, so one stray read cannot decide a symbol.
   */
  private symbolAt(time: number): number | null {
    const half = CHIRP_MS / 2;
    const votes = new Map<number, number>();
    for (const r of this.reads) {
      if (r.at < time - half || r.at > time + half) continue;
      if (r.symbol === null) continue;
      // Weight by how close the read is to the slot centre.
      const weight = 1 - Math.abs(r.at - time) / half;
      votes.set(r.symbol, (votes.get(r.symbol) ?? 0) + weight);
    }
    let winner: number | null = null;
    let bestScore = 0;
    for (const [symbol, score] of votes) {
      if (score > bestScore) {
        bestScore = score;
        winner = symbol;
      }
    }
    // Demand at least one whole read's worth of agreement.
    return bestScore >= 1 ? winner : null;
  }
}

/** True when this browser can actually be a receiver. */
export const canListen = () =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== "undefined" &&
  !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
