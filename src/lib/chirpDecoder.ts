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
/** A read this quiet is treated as silence rather than a symbol. */
const MIN_MAGNITUDE = 24;
/** A tone must beat the runner-up by this much to be trusted. */
const MIN_CONTRAST = 1.35;

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

    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    // Little smoothing: averaging across frames would blur symbol boundaries.
    analyser.smoothingTimeConstant = 0.1;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -10;
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

    // dB are negative; shift into a 0..100 level for both the gate and the UI.
    const level = Math.max(0, Math.min(100, bestDb + 100));
    const contrast = (bestDb + 100) / Math.max(1, secondDb + 100);
    const symbol = level >= MIN_MAGNITUDE && contrast >= MIN_CONTRAST ? best : null;

    const at = performance.now();
    this.reads.push({ at, symbol, level });
    // Keep a little over one frame's worth of history.
    const horizon = at - (PREAMBLE.length + PAYLOAD_SYMBOLS + CRC_SYMBOLS + 4) * CHIRP_MS;
    while (this.reads.length && this.reads[0].at < horizon) this.reads.shift();

    if (this.lockedAt === null) {
      const lock = this.findPreamble();
      if (lock !== null) {
        this.lockedAt = lock;
        this.onStatus({ state: "locked", symbol, level, captured: 0 });
        return;
      }
      this.onStatus({ state: "listening", symbol, level, captured: 0 });
      return;
    }

    const needed = PAYLOAD_SYMBOLS + CRC_SYMBOLS;
    const elapsed = at - this.lockedAt;
    const captured = Math.min(needed, Math.floor(elapsed / CHIRP_MS));

    if (captured < needed) {
      this.onStatus({ state: "decoding", symbol, level, captured });
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
      });
      return;
    }
    this.onStatus({ state: "done", symbol, level, captured: needed });
    this.onFrame(frame);
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
