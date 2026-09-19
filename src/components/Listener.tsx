"use client";

import { useEffect, useRef, useState } from "react";

import { Lockup } from "@/components/Logo";
import { ChirpDecoder, canListen, type DecodedFrame, type DecoderStatus } from "@/lib/chirpDecoder";
import { C, FONT, liveRate, trNumber } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AnchorView } from "@/lib/types";

/**
 * A phone listening for a payment request.
 *
 * Deliberately one screen and one button: the microphone needs a user gesture
 * on every mobile browser, and anything else on the page is something to tap by
 * mistake while holding the phone towards a speaker.
 */
export function Listener({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [status, setStatus] = useState<DecoderStatus | null>(null);
  const [heard, setHeard] = useState<DecodedFrame | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decoder = useRef<ChirpDecoder | null>(null);

  useEffect(() => {
    void fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { anchor?: AnchorView | null }) => setRate(liveRate(j.anchor ?? null)))
      .catch(() => {});
    return () => decoder.current?.stop();
  }, []);

  function toggle() {
    if (decoder.current) {
      decoder.current.stop();
      decoder.current = null;
      setStatus(null);
      return;
    }
    setError(null);
    setResult(null);
    setHeard(null);
    const dec = new ChirpDecoder(setStatus, (f) => {
      setHeard(f);
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      dec.stop();
      decoder.current = null;
    });
    decoder.current = dec;
    void dec.start();
  }

  async function fund() {
    if (!heard || !rate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId: heard.invoiceId,
          role: "funder",
          amountUsdc: heard.amountMinor / 100 / rate,
        }),
      });
      const json = (await res.json()) as { ok: boolean; hash?: string; error?: string };
      if (!json.ok) throw new Error(json.error ?? "The payment did not complete");
      setResult(json.hash ?? "ok");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const listening = status !== null && status.state !== "idle";
  const level = status?.level ?? 0;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.black,
        color: C.white,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 20,
        padding: "26px 22px 34px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Lockup colour={C.mint} size={22} />
        <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>
          chirp v1
        </span>
      </div>

      <div style={{ display: "grid", alignContent: "center", justifyItems: "center", gap: 26 }}>
        <Pulse active={listening} level={level} locked={!!heard} />

        {heard ? (
          <div style={{ display: "grid", gap: 16, justifyItems: "center", width: "100%" }}>
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: ".1em",
                color: C.mint,
              }}
            >
              {d.payHeard.toUpperCase()}
            </span>
            <div style={{ fontSize: "clamp(40px,13vw,64px)", fontWeight: 600, letterSpacing: "-.04em", lineHeight: 1 }}>
              {trNumber(heard.amountMinor / 100, 2)} ₺
            </div>
            <div
              style={{
                display: "grid",
                gap: 8,
                width: "min(340px,100%)",
                fontFamily: FONT.mono,
                fontSize: 12,
              }}
            >
              <Row k="invoice" v={`#${heard.invoiceId}`} />
              <Row k="crc-8" v={`0x${heard.crc.toString(16).padStart(2, "0")} ✓`} />
              <Row k="confidence" v={`${Math.round(heard.confidence * 100)}%`} />
              {rate && <Row k="usdc" v={trNumber(heard.amountMinor / 100 / rate, 4)} />}
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              maxWidth: 340,
              textAlign: "center",
              fontSize: 15,
              lineHeight: 1.55,
              color: "rgba(255,255,255,.62)",
              fontWeight: 500,
            }}
          >
            {listening
              ? lang === "tr"
                ? "Telefonu hoparlöre doğru tut. Çerçeveyi duyup CRC'sini doğrulayınca duracak."
                : "Hold the phone towards the speaker. It stops once it hears a frame and its CRC checks out."
              : lang === "tr"
                ? "Panelde isteği çal, sonra burada dinlemeyi başlat. Kamera, eşleşme ve veri bağlantısı gerekmiyor."
                : "Play the request on the panel, then start listening here. No camera, no pairing, no data connection."}
          </p>
        )}

        {status?.message && !heard && (
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.amber, textAlign: "center" }}>
            {status.message}
          </span>
        )}

        {status?.diag && !heard && (
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 10.5,
              color: "rgba(255,255,255,.4)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {status.diag.sampleRate} Hz · {status.diag.contextState} · peak{" "}
            {status.diag.peakDb} dB · floor {status.diag.floorDb} dB
            <br />
            {status.state}
            {status.symbol !== null ? ` · symbol ${status.symbol}` : ""}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
        {result ? (
          <div
            style={{
              width: "min(420px,100%)",
              borderRadius: 20,
              padding: "16px 18px",
              background: "rgba(61,226,156,.14)",
              color: C.mint,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
              overflowWrap: "anywhere",
            }}
          >
            {result.slice(0, 18)}… ✓
          </div>
        ) : heard ? (
          <button
            onClick={() => void fund()}
            disabled={busy || !rate}
            style={{
              width: "min(420px,100%)",
              border: 0,
              borderRadius: 999,
              padding: "18px 26px",
              background: C.mint,
              color: C.ink,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {busy ? "…" : d.payConfirm}
          </button>
        ) : (
          <button
            onClick={toggle}
            disabled={!canListen()}
            style={{
              width: "min(420px,100%)",
              border: 0,
              borderRadius: 999,
              padding: "18px 26px",
              background: listening ? C.amber : C.mint,
              color: C.ink,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {!canListen()
              ? lang === "tr"
                ? "Bu tarayıcı mikrofona erişemiyor"
                : "This browser cannot reach a microphone"
              : listening
                ? d.payStop
                : d.payListen}
          </button>
        )}

        {heard && (
          <button
            onClick={toggle}
            style={{
              border: "1px solid rgba(255,255,255,.16)",
              background: "transparent",
              color: "rgba(255,255,255,.7)",
              borderRadius: 999,
              padding: "13px 24px",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {lang === "tr" ? "Yeniden dinle" : "Listen again"}
          </button>
        )}

        {error && (
          <div
            style={{
              width: "min(420px,100%)",
              borderRadius: 16,
              padding: "13px 15px",
              background: "rgba(255,95,87,.14)",
              color: C.coral,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <a
          href={lang === "en" ? "/app" : `/app?lang=${lang}`}
          style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", textDecoration: "none" }}
        >
          {d.openPanel} ↗
        </a>
      </div>
    </main>
  );
}

/** One ring that breathes with the input level and locks green on a frame. */
function Pulse({ active, level, locked }: { active: boolean; level: number; locked: boolean }) {
  const scale = locked ? 1 : active ? 1 + Math.min(40, level) / 130 : 1;
  return (
    <div style={{ position: "relative", width: 168, height: 168, display: "grid", placeItems: "center" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2px solid ${locked ? C.mint : active ? "rgba(61,226,156,.5)" : "rgba(255,255,255,.14)"}`,
          transform: `scale(${scale.toFixed(3)})`,
          transition: "transform .1s linear, border-color .3s",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 22,
          borderRadius: "50%",
          background: locked
            ? "radial-gradient(circle,rgba(61,226,156,.3),transparent 70%)"
            : active
              ? "radial-gradient(circle,rgba(61,226,156,.16),transparent 70%)"
              : "transparent",
          transition: "background .3s",
        }}
      />
      <span style={{ fontSize: 44 }} aria-hidden>
        {locked ? "✓" : active ? "◉" : "♪"}
      </span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 13px",
        borderRadius: 12,
        background: "rgba(255,255,255,.05)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,.5)" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
