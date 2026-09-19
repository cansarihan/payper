"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { QrCode } from "@/components/QrCode";
import {
  CHIRP_BASE,
  CHIRP_GAP_MS,
  CHIRP_MS,
  CHIRP_STEP,
  SYMBOL_COUNT,
  ChirpPlayer,
  PREAMBLE,
  encodeChirp,
  sep7PaymentUri,
  symbolFrequency,
} from "@/lib/chirp";
import { ChirpDecoder, canListen, type DecodedFrame, type DecoderStatus } from "@/lib/chirpDecoder";
import { C, FONT, liveRate, trNumber } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, SessionRole } from "@/lib/types";
import { RoleSwitch } from "@/components/RoleSwitch";
import { ScreenHead } from "./Shell";

/**
 * Pay by sound, or by QR.
 *
 * A buyer at a counter has a phone that may have no camera permission, no data
 * and a cracked screen. Sound reaches every phone in earshot at once and needs
 * nothing but a microphone. The QR carries the same request as a SEP-7 URI, so
 * a wallet can scan it instead — both paths end in the same `fund()` call.
 */
export function Pay({
  lang,
  state,
  onDone,
}: {
  lang: Lang;
  state: AppState;
  onDone: () => void;
}) {
  const d = t(lang);
  const [mode, setMode] = useState<"play" | "listen" | "qr">("play");
  const [amount, setAmount] = useState(500);
  const [symbolIndex, setSymbolIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRole, setNeedsRole] = useState<SessionRole | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [status, setStatus] = useState<DecoderStatus | null>(null);
  const [heard, setHeard] = useState<DecodedFrame | null>(null);
  const [origin, setOrigin] = useState("");

  const player = useRef<ChirpPlayer | null>(null);
  const decoder = useRef<ChirpDecoder | null>(null);

  const invoice =
    state.invoices.find((i) => i.status === "acknowledged" && i.lockedDiscountBps > 0) ??
    state.invoices.find((i) => i.status === "acknowledged") ??
    state.active;
  const rate = liveRate(state.anchor);
  const memo = invoice ? 80_000 + invoice.id : 88_213;

  const frame = useMemo(
    () => encodeChirp({ invoiceId: invoice?.id ?? 0, amountMinor: amount * 100 }),
    [invoice?.id, amount],
  );

  const uri = useMemo(
    () =>
      rate
        ? sep7PaymentUri({
            destination: state.contracts.invoice,
            amount: (amount / rate).toFixed(7),
            assetCode: state.anchor?.assetCode ?? "USDC",
            assetIssuer: state.anchor?.assetIssuer ?? "",
            memo: String(memo),
            message: `payper · invoice #${invoice?.id ?? "-"}`,
          })
        : "",
    [state.contracts.invoice, state.anchor, amount, rate, memo, invoice?.id],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    return () => {
      player.current?.stop();
      decoder.current?.stop();
    };
  }, []);

  // Changing the request invalidates whatever is already in the air.
  useEffect(() => {
    player.current?.stop();
    setPlaying(false);
    setSymbolIndex(-1);
  }, [amount, mode]);

  function togglePlay() {
    if (playing) {
      player.current?.stop();
      setPlaying(false);
      return;
    }
    setError(null);
    const p = new ChirpPlayer(frame, setSymbolIndex);
    player.current = p;
    if (!p.start()) {
      setError("Web Audio is not available in this browser.");
      return;
    }
    setPlaying(true);
  }

  async function toggleListen() {
    if (decoder.current) {
      decoder.current.stop();
      decoder.current = null;
      setStatus(null);
      return;
    }
    setError(null);
    setHeard(null);
    const dec = new ChirpDecoder(setStatus, (f) => {
      setHeard(f);
      dec.stop();
      decoder.current = null;
    });
    decoder.current = dec;
    await dec.start();
  }

  async function fund(invoiceId: number, amountMinor: number) {
    if (!rate) {
      setError("The anchor rate is unavailable, so the amount cannot be converted.");
      return;
    }
    setBusy(true);
    setError(null);
    setNeedsRole(null);
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          role: "funder",
          amountUsdc: amountMinor / 100 / rate,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        hash?: string;
        error?: string;
        needsRole?: SessionRole;
      };
      if (!json.ok) {
        setNeedsRole(json.needsRole ?? null);
        throw new Error(json.error ?? "The payment did not complete");
      }
      setHash(json.hash ?? null);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const current =
    playing && symbolIndex >= 0 && symbolIndex < frame.symbols.length
      ? frame.symbols[symbolIndex]
      : null;
  const dataIndex = Math.max(0, symbolIndex - PREAMBLE.length);
  const hexSoFar = frame.hex
    .slice(0, Math.min(frame.hex.length, dataIndex))
    .replace(/(.{2})/g, "$1 ");

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 5 · fund · chirp v1`} title={d.payTitle} lead={d.payLead} />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["play", "listen", "qr"] as const).map((m, i) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={m === "listen" && !canListen()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "9px 18px",
              fontSize: 12.5,
              fontWeight: 700,
              background: mode === m ? C.ink : "rgba(255,255,255,.55)",
              color: mode === m ? C.white : C.ink,
            }}
          >
            {d.payModes[i]}
          </button>
        ))}
      </div>

      <div className="pay-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", opacity: 0.55 }}>
              {d.payAmount.toUpperCase()}
            </label>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <input
                type="number"
                min={50}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                style={{
                  width: 160,
                  border: `1px solid rgba(10,10,10,.14)`,
                  borderRadius: 14,
                  padding: "13px 15px",
                  fontFamily: FONT.mono,
                  fontSize: 19,
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.5 }}>₺</span>
              {rate && (
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.grey }}>
                  ≈ {trNumber(amount / rate, 4)} USDC
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: 16,
              background: C.paper,
              display: "grid",
              gap: 8,
              fontFamily: FONT.mono,
              fontSize: 11.5,
            }}
          >
            <Line k={d.payFrame} v={`${frame.symbols.length} symbols · ${frame.durationMs} ms`} />
            <Line k="invoice" v={`#${invoice?.id ?? "-"} · memo ${memo}`} />
            <Line k="tones" v={`${CHIRP_BASE}–${CHIRP_BASE + CHIRP_STEP * 7} Hz · ${CHIRP_MS}+${CHIRP_GAP_MS} ms`} />
            <Line k="payload" v={frame.hex.replace(/(.{2})/g, "$1 ").trim()} />
            <Line k="crc-8" v={`0x${frame.crc.toString(16).padStart(2, "0")}`} />
          </div>

          {mode === "play" && origin && (
            <div
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 10,
                padding: 16,
                borderRadius: 20,
                background: C.paper,
              }}
            >
              <QrCode value={`${origin}/listen${lang === "en" ? "" : `?lang=${lang}`}`} size={148} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.grey, textAlign: "center" }}>
                {d.payScanToListen}
              </span>
            </div>
          )}

          {mode === "play" && (
            <button
              onClick={togglePlay}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: playing ? C.amber : C.ink,
                color: playing ? C.ink : C.white,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {playing ? d.payStop : d.payPlay}
            </button>
          )}

          {mode === "listen" && (
            <button
              onClick={() => void toggleListen()}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: decoder.current ? C.amber : C.ink,
                color: decoder.current ? C.ink : C.white,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {decoder.current ? d.payStop : d.payListen}
            </button>
          )}

          {mode === "qr" && invoice && rate && (
            <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
              <QrCode value={uri} size={230} />
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 10.5,
                  color: C.grey,
                  overflowWrap: "anywhere",
                  textAlign: "center",
                }}
              >
                {uri.slice(0, 96)}…
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: C.ink,
              color: C.white,
              borderRadius: 28,
              padding: 26,
              display: "grid",
              gap: 16,
              minHeight: 260,
              alignContent: "start",
            }}
          >
            <Spectrum active={current} />

            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
                {current === null
                  ? `${CHIRP_BASE}–${CHIRP_BASE + CHIRP_STEP * (SYMBOL_COUNT - 1)} Hz · ${PREAMBLE.length}-symbol preamble`
                  : `symbol ${current} · ${symbolFrequency(current)} Hz`}
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  color: C.mint,
                  minHeight: 18,
                  overflowWrap: "anywhere",
                }}
              >
                {hexSoFar}
              </span>
            </div>

            {status && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.12)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, status.level)}%`,
                      borderRadius: 999,
                      background: status.symbol === null ? "rgba(255,255,255,.3)" : C.mint,
                    }}
                  />
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                  {status.state} · {status.captured}/{frame.symbols.length - PREAMBLE.length}
                  {status.message ? ` · ${status.message}` : ""}
                </span>
              </div>
            )}
          </div>

          {heard && (
            <div style={{ background: C.mint, borderRadius: 28, padding: 26, display: "grid", gap: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{d.payHeard}</span>
              <div style={{ display: "grid", gap: 6, fontFamily: FONT.mono, fontSize: 12 }}>
                <Line k="invoice" v={`#${heard.invoiceId}`} dark />
                <Line k="amount" v={`${trNumber(heard.amountMinor / 100, 2)} ₺`} dark />
                <Line k="confidence" v={`${Math.round(heard.confidence * 100)}%`} dark />
              </div>
              <button
                onClick={() => void fund(heard.invoiceId, heard.amountMinor)}
                disabled={busy}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "14px 24px",
                  background: C.ink,
                  color: C.white,
                  fontSize: 14.5,
                  fontWeight: 700,
                }}
              >
                {busy ? "…" : d.payConfirm}
              </button>
            </div>
          )}

          {mode !== "listen" && invoice && (
            <button
              onClick={() => void fund(invoice.id, amount * 100)}
              disabled={busy || !rate}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: busy ? "rgba(10,10,10,.12)" : C.lime,
                color: C.ink,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {busy ? "…" : `${d.payConfirm} · #${invoice.id}`}
            </button>
          )}
        </div>
      </div>

      {hash && (
        <div style={{ marginTop: 14 }}>
          <a
            href={`https://stellar.expert/explorer/${
              state.network === "mainnet" ? "public" : "testnet"
            }/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.ink }}
          >
            {hash.slice(0, 16)}… ↗
          </a>
        </div>
      )}

      {needsRole && (
        <div style={{ marginTop: 14 }}>
          <RoleSwitch
            lang={lang}
            needsRole={needsRole}
            message={error ?? ""}
            onSwitched={() => {
              setNeedsRole(null);
              setError(null);
              onDone();
            }}
          />
        </div>
      )}

      {error && !needsRole && (
        <div
          style={{
            marginTop: 14,
            padding: "13px 15px",
            borderRadius: 16,
            background: "rgba(255,95,87,.12)",
            color: C.coral,
            fontSize: 13,
            fontWeight: 600,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

/** Sixteen bars, one per tone. The sounding one lights. */
function Spectrum({ active }: { active: number | null }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SYMBOL_COUNT},1fr)`,
        gap: 6,
        height: 96,
        alignItems: "end",
      }}
    >
      {Array.from({ length: SYMBOL_COUNT }, (_, i) => {
        const on = active === i;
        return (
          <div
            key={i}
            style={{
              height: on ? "100%" : `${18 + (i % 4) * 5}%`,
              borderRadius: "4px 4px 2px 2px",
              background: on ? C.mint : "rgba(255,255,255,.12)",
              transition: "height .08s linear, background .08s linear",
            }}
          />
        );
      })}
    </div>
  );
}

function Line({ k, v, dark }: { k: string; v: string; dark?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ opacity: dark ? 0.6 : 0.5 }}>{k}</span>
      <span style={{ overflowWrap: "anywhere", textAlign: "right" }}>{v}</span>
    </div>
  );
}
