"use client";

import {
  CHIRP_GAP_MS,
  CHIRP_MS,
  CHIRP_SLOT_MS,
  FRAME_SYMBOLS,
  PREAMBLE,
  SYMBOL_COUNT,
  decodeChirpFrame,
  symbolFrequency,
  type ChirpRequest,
} from "./chirp";

/**
 * The receiving half: a microphone, an FFT and burst detection.
 *
 * The earlier version locked onto the preamble once and then read symbols at
 * fixed offsets. That works on one machine and fails across two, because the
 * two clocks drift and the error accumulates over the frame. Here every symbol
 * announces itself: each tone is followed by silence, so the decoder finds the
 * edges and reads each burst on its own terms. Nothing accumulates.
 *
 * 1. **Spectral reads.** An `AnalyserNode` gives a magnitude spectrum every
 *    ~14 ms. For each read we take the loudest of the eight tone bins and a
 *    noise floor measured from the bins between them.
 *
 * 2. **Bursts.** Consecutive reads above the floor form a burst. One shorter
 *    than half a tone is room noise; one longer than two tones is something
 *    else sounding, and both are discarded.
 *
 * 3. **Voting.** A burst's symbol is the weighted majority over its middle,
 *    where the tone is steady and the fades are not.
 *
 * 4. **Preamble and CRC.** The lead-in is found among the recent bursts, and
 *    the CRC decides. A frame that fails is dropped in silence and the search
 *    resumes, because acting on a half-heard payment request is worse than
 *    missing it.
 */

const SYMBOLS = Array.from({ length: SYMBOL_COUNT }, (_, i) => i);
/** Roughly eight reads inside a tone. */
const READ_INTERVAL_MS = Math.round(CHIRP_MS / 8);
/**
 * How far above the measured floor a tone must sit, in dB.
 *
 * Loose on purpose. A phone across a desk hears a weak, tilted version of what
 * the laptop played, and the CRC is what protects us from a wrong read — not
 * the gate. A gate tight enough to be safe on its own would simply never open.
 */
const MIN_ABOVE_FLOOR = 4.5;
/** And how far above the runner-up tone, in dB. */
const MIN_CONTRAST_DB = 2;
/** A burst shorter than this is noise. */
const MIN_BURST_MS = CHIRP_MS * 0.3;
/** Longer than this is not one of our tones. */
const MAX_BURST_MS = CHIRP_MS * 2.6;
/** Bursts kept in the window: two frames' worth. */
const HISTORY = (PREAMBLE.length + FRAME_SYMBOLS) * 2;

export interface DecodedFrame extends ChirpRequest {
  /** Fraction of the frame's bursts that were read confidently. */
  confidence: number;
}

export interface DecoderStatus {
  state: "idle" | "listening" | "locked" | "decoding" | "done" | "error";
  /** Symbol heard on the most recent read, or null for silence. */
  symbol: number | null;
  level: number;
  /** Bursts collected since the preamble was seen. */
  captured: number;
  message?: string;
  diag?: {
    sampleRate: number;
    contextState: string;
    peakDb: number;
    floorDb: number;
    bursts: number;
    /** The tail of what was actually heard, so a failure can be read. */
    heard: number[];
  };
}

interface Burst {
  symbol: number;
  startedAt: number;
  endedAt: number;
  /** Weighted agreement among the reads inside it, 0..1. */
  quality: number;
}

interface Read {
  at: number;
  symbol: number | null;
  aboveFloor: number;
}

export class ChirpDecoder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private spectrum: Float32Array<ArrayBuffer> | null = null;

  private bins: number[] = [];
  private current: Read[] = [];
  private bursts: Burst[] = [];
  private lastDiag: DecoderStatus["diag"];

  constructor(
    private readonly onStatus: (s: DecoderStatus) => void,
    private readonly onFrame: (f: DecodedFrame) => void,
  ) {}

  async start(): Promise<void> {
    // The context is created and resumed before the first await: iOS grants
    // audio on a user gesture and does not carry that grant across a promise,
    // so a context built after getUserMedia stays suspended and every spectrum
    // read comes back as silence.
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      this.fail("This browser has no Web Audio.");
      return;
    }
    const ctx = new AC();
    this.ctx = ctx;
    void ctx.resume();

    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail("This browser cannot reach a microphone.");
      return;
    }

    try {
      // Every one of these would normally be on. They are tuned for speech and
      // would chew the tones apart.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      this.fail(
        (e as Error).name === "NotAllowedError"
          ? "Microphone permission was refused."
          : `The microphone could not be opened: ${(e as Error).message}`,
      );
      return;
    }

    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        /* surfaced through the diagnostics line rather than thrown */
      }
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    // Little smoothing: averaging across frames would blur the burst edges the
    // whole design depends on.
    analyser.smoothingTimeConstant = 0.04;
    analyser.minDecibels = -120;
    analyser.maxDecibels = 0;
    this.analyser = analyser;
    this.spectrum = new Float32Array(new ArrayBuffer(analyser.frequencyBinCount * 4));

    ctx.createMediaStreamSource(this.stream).connect(analyser);

    // Which FFT bin each tone lands in, at this device's actual sample rate.
    const binWidth = ctx.sampleRate / analyser.fftSize;
    this.bins = SYMBOLS.map((s) => Math.round(symbolFrequency(s) / binWidth));

    this.current = [];
    this.bursts = [];
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

  private fail(message: string) {
    this.onStatus({ state: "error", symbol: null, level: 0, captured: 0, message });
  }

  private tick(): void {
    const analyser = this.analyser;
    const spectrum = this.spectrum;
    if (!analyser || !spectrum) return;

    analyser.getFloatFrequencyData(spectrum);

    let best = -1;
    let bestDb = -Infinity;
    let secondDb = -Infinity;
    for (const s of SYMBOLS) {
      const bin = this.bins[s];
      const db = Math.max(
        spectrum[bin - 1] ?? -Infinity,
        spectrum[bin],
        spectrum[bin + 1] ?? -Infinity,
      );
      if (db > bestDb) {
        secondDb = bestDb;
        bestDb = db;
        best = s;
      } else if (db > secondDb) {
        secondDb = db;
      }
    }

    const floorDb = this.noiseFloor(spectrum);
    const aboveFloor = bestDb - floorDb;
    const sounding =
      Number.isFinite(bestDb) && aboveFloor >= MIN_ABOVE_FLOOR && bestDb - secondDb >= MIN_CONTRAST_DB;

    const at = performance.now();
    this.lastDiag = {
      sampleRate: Math.round(this.ctx?.sampleRate ?? 0),
      contextState: this.ctx?.state ?? "none",
      peakDb: Math.round(bestDb),
      floorDb: Math.round(floorDb),
      bursts: this.bursts.length,
      heard: this.bursts.slice(-14).map((b) => b.symbol),
    };

    if (sounding) {
      this.current.push({ at, symbol: best, aboveFloor });
    } else if (this.current.length > 0) {
      this.closeBurst();
    }

    const level = Math.max(0, Math.min(100, aboveFloor * 4));
    this.onStatus({
      state: this.bursts.length > 0 ? "decoding" : "listening",
      symbol: sounding ? best : null,
      level,
      captured: Math.max(0, this.bursts.length - PREAMBLE.length),
      diag: this.lastDiag,
    });
  }

  /** Turn the reads just gathered into one burst, then try to decode. */
  private closeBurst(): void {
    const reads = this.current;
    this.current = [];
    if (reads.length === 0) return;

    const startedAt = reads[0].at;
    const endedAt = reads[reads.length - 1].at + READ_INTERVAL_MS;
    const span = endedAt - startedAt;
    if (span < MIN_BURST_MS || span > MAX_BURST_MS) return;

    // The middle of the burst, where the tone is steady and the fades are not.
    const from = Math.floor(reads.length * 0.2);
    const to = Math.ceil(reads.length * 0.8);
    const middle = reads.slice(from, Math.max(from + 1, to));

    const votes = new Map<number, number>();
    for (const r of middle) {
      if (r.symbol === null) continue;
      votes.set(r.symbol, (votes.get(r.symbol) ?? 0) + r.aboveFloor);
    }
    let symbol = -1;
    let bestScore = 0;
    let total = 0;
    for (const [s, score] of votes) {
      total += score;
      if (score > bestScore) {
        bestScore = score;
        symbol = s;
      }
    }
    if (symbol < 0 || total <= 0) return;

    this.bursts.push({ symbol, startedAt, endedAt, quality: bestScore / total });
    if (this.bursts.length > HISTORY) this.bursts.shift();

    this.tryDecode();
  }

  /**
   * Look for the preamble, then read the symbols that follow it.
   *
   * The bursts after the lead-in must arrive on the symbol clock; a gap wider
   * than a slot and a half means something was missed and the candidate is
   * abandoned rather than guessed at.
   */
  private tryDecode(): void {
    const need = PREAMBLE.length + FRAME_SYMBOLS;
    if (this.bursts.length < need) return;

    for (let start = this.bursts.length - need; start >= 0; start--) {
      const window = this.bursts.slice(start, start + need);

      let leadIn = true;
      for (let i = 0; i < PREAMBLE.length && leadIn; i++) {
        if (window[i].symbol !== PREAMBLE[i]) leadIn = false;
      }
      if (!leadIn) continue;

      let contiguous = true;
      for (let i = 1; i < window.length && contiguous; i++) {
        const step = window[i].startedAt - window[i - 1].startedAt;
        if (step < CHIRP_SLOT_MS * 0.5 || step > CHIRP_SLOT_MS * 1.9) contiguous = false;
      }
      if (!contiguous) continue;

      const data = window.slice(PREAMBLE.length);
      const request = decodeChirpFrame(data.map((b) => b.symbol));
      if (!request) continue;

      const confidence = data.reduce((s, b) => s + b.quality, 0) / data.length;
      this.bursts = [];
      this.onStatus({
        state: "done",
        symbol: null,
        level: 100,
        captured: FRAME_SYMBOLS,
        diag: this.lastDiag,
      });
      this.onFrame({ ...request, confidence });
      return;
    }
  }

  /**
   * The median of the bins that sit between the tones.
   *
   * Those midpoints carry nothing we transmit, so they measure the room. The
   * median rather than the mean, because one stray peak should not drag the
   * floor up and mute a real symbol.
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
}

/** True when this browser can actually be a receiver. */
export const canListen = () =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== "undefined" &&
  !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

export { CHIRP_GAP_MS };
