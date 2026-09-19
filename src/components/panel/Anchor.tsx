"use client";

import { useState } from "react";

import { C, FONT, shortKey, trNumber, usdc } from "@/lib/design";
import type { AnchorRunResult, AppState, SepLogView } from "@/lib/types";

const OFF_STEPS: [string, string, string][] = [
  ["stellar.toml keşfi", "SEP-1", "Uç noktalar ve imza anahtarı okunur"],
  ["Cüzdan kimliği", "SEP-10", "Challenge imzalanır, JWT alınır"],
  ["Kur kilidi", "SEP-38", "USDC→TRY sabit kur"],
  ["Çekim talebi", "SEP-6", "Hazine adresi ve memo döner"],
  ["Zincir üstü ödeme", "Soroban", "USDC memo ile hazineye gönderilir"],
  ["TL banka hesabına", "Banka", "status=completed · IBAN'a TL"],
];

const ON_STEPS: [string, string, string][] = [
  ["Cüzdan kimliği", "SEP-10", "Alıcı cüzdanı imzalar, JWT alır"],
  ["Kur kilidi", "SEP-38", "TRY→USDC sabit kur"],
  ["Yatırma talebi", "SEP-6", "IBAN ve açıklama referansı döner"],
  ["Banka havalesi", "Banka", "TL gönderilir, referans yazılır"],
  ["Anchor USDC öder", "SEP-6", "pending_anchor → completed"],
];

/**
 * The fiat rail, both directions, with the trace it produced.
 *
 * Nothing about the anchor is hard-coded here. The domain, asset, rate, limits
 * and treasury address on screen all come from its own stellar.toml and health
 * endpoint — which is the point: pointing at a different anchor changes one
 * environment variable, not this file. The terminal shows the actual requests
 * so a reader can follow SEP-1 → 10 → 38 → 6 rather than take it on trust.
 */
export function Anchor({ state, onDone }: { state: AppState; onDone: () => void }) {
  const [tab, setTab] = useState<"off" | "on">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnchorRunResult | null>(null);

  const anchor = state.anchor;
  const invoice =
    state.invoices.find((i) => i.status === "funded") ??
    state.invoices.find((i) => i.status === "repaid") ??
    state.active;
  const steps = tab === "off" ? OFF_STEPS : ON_STEPS;
  const ran = result?.ok === true && result.flow === tab;
  const done = ran ? steps.length : 0;
  const status = busy ? "pending_user_transfer_start" : ran ? "completed" : "incomplete";

  async function run() {
    if (!invoice) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/anchor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flow: tab, invoiceId: invoice.id }),
      });
      const json = (await res.json()) as AnchorRunResult;
      if (!json.ok) throw new Error(json.error ?? "Anchor akışı tamamlanamadı");
      setResult(json);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const home = anchor?.homeDomain ?? "—";
  const rate = anchor?.rates;

  return (
    <div style={{ animation: "rise .4s both" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <Label>ADIM 5–6 · SEP-6 · {home}</Label>
          <h1
            style={{
              fontSize: "clamp(30px,3.6vw,44px)",
              fontWeight: 600,
              letterSpacing: "-.035em",
              margin: "0 0 8px",
            }}
          >
            TL köprüsü
          </h1>
          <p style={{ opacity: 0.7, margin: 0, maxWidth: 640, lineHeight: 1.5, fontWeight: 500 }}>
            Tek standart kapı: stellar.toml&apos;dan keşif, SEP-10 kimlik, SEP-38 sabit kur,
            SEP-6 yatırma ve çekme. Anchor değişirse yalnızca alan adı değişir.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,auto)", gap: 8 }}>
          <Fact k="HOME_DOMAIN" v={home} />
          <Fact k="ASSET" v={`${anchor?.assetCode ?? "—"} · ${shortKey(anchor?.assetIssuer ?? "", 4, 4)}`} />
          <Fact
            k={`${rate?.pair ?? "USD/TRY"} · SEP-38`}
            v={rate ? `alış ${trNumber(Number(rate.buy_rate), 4)} · satış ${trNumber(Number(rate.sell_rate), 4)}` : "—"}
          />
          <Fact
            k="TRANSFER_SERVER"
            v={anchor ? new URL(anchor.endpoints.transferServer).pathname : "okunamadı"}
            colour={anchor ? C.green : C.grey}
          />
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,.4)",
          marginBottom: 20,
        }}
      >
        {(["off", "on"] as const).map((k) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              setResult(null);
              setError(null);
            }}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              background: tab === k ? C.ink : "transparent",
              color: tab === k ? C.white : C.ink,
            }}
          >
            {k === "off" ? "KOBİ çekimi · USDC → TL" : "Alıcı ödemesi · TL → USDC"}
          </button>
        ))}
      </div>

      <div className="anchor-split" style={{ display: "grid", gap: 20, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: C.white, color: C.ink, borderRadius: 24, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {tab === "off" ? "KOBİ çekimi" : "Alıcı ödemesi"}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.55 }}>
                {done}/{steps.length} · {busy ? "çalışıyor" : ran ? "tamamlandı" : "hazır"}
              </span>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {steps.map(([title, sep, detail], i) => {
                const finished = i < done;
                return (
                  <div
                    key={title}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "30px minmax(0,1fr)",
                      gap: 14,
                      padding: 12,
                      borderRadius: 16,
                      background: finished ? "rgba(61,226,156,.12)" : "#F7F7F5",
                      transition: "all .4s",
                      animation: finished ? "blurInA .45s both" : undefined,
                      animationDelay: finished ? `${i * 0.09}s` : undefined,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: FONT.mono,
                        fontSize: 11,
                        fontWeight: 700,
                        background: finished ? C.ink : busy ? C.amber : "rgba(10,10,10,.08)",
                        color: finished ? C.mint : C.ink,
                        animation: busy && !finished ? "pulse 1.2s infinite" : undefined,
                      }}
                    >
                      {finished ? "✓" : i + 1}
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 10, opacity: 0.55 }}>
                          {sep}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: FONT.mono,
                          fontSize: 11,
                          opacity: 0.55,
                          marginTop: 3,
                        }}
                      >
                        {detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,95,87,.1)",
                  color: C.coral,
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  overflowWrap: "anywhere",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={() => void run()}
              disabled={busy || !invoice}
              style={{
                width: "100%",
                marginTop: 18,
                border: 0,
                borderRadius: 999,
                padding: "14px 26px",
                fontSize: 15,
                fontWeight: 700,
                background: busy || !invoice ? "rgba(10,10,10,.12)" : C.ink,
                color: busy || !invoice ? C.ink : C.white,
              }}
            >
              {!invoice
                ? "Uygun fatura yok"
                : busy
                  ? "Çalışıyor…"
                  : tab === "off"
                    ? "USDC → TL akışını çalıştır"
                    : "TL → USDC akışını çalıştır"}
            </button>
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: "16px 18px",
              background: C.lime,
              fontSize: 13,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            <b>Sandbox</b> · Banka ve KYC simüle; Stellar bacağı gerçek testnet USDC. İşlem
            başına limit aşılırsa tutar tranşlara bölünür.
          </div>
        </div>

        {/* the trace */}
        <div style={{ display: "grid", gap: 12 }}>
          {ran && (
            <div
              style={{
                borderRadius: 24,
                padding: 26,
                background: C.ink,
                color: C.white,
                animation: "rise .4s both",
              }}
            >
              <Label light>{tab === "off" ? "Banka hesabına geçti" : "Kontrata USDC geçti"}</Label>
              <div
                style={{
                  fontSize: "clamp(34px,3.6vw,50px)",
                  fontWeight: 600,
                  letterSpacing: "-.04em",
                  lineHeight: 1,
                  margin: "10px 0 6px",
                  color: C.mint,
                }}
              >
                {tab === "off"
                  ? `${trNumber(Number(result?.fiatOut ?? 0))} ₺`
                  : `${trNumber(Number(result?.usdcOut ?? 0), 4)} USDC`}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>
                {tab === "off"
                  ? `${trNumber(Number(result?.usdcIn ?? 0), 4)} USDC satıldı`
                  : `${trNumber(Number(result?.fiatIn ?? 0))} ₺ gönderildi`}
                {" · "}
                {result?.legs?.length ?? 0} tranş
              </div>
            </div>
          )}

          <div style={{ borderRadius: 24, background: C.ink, color: C.white, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,.08)",
              }}
            >
              {[C.coral, C.amber, C.mint].map((c) => (
                <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  color: "rgba(255,255,255,.55)",
                }}
              >
                anchor-client · kayıt
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  color: busy ? C.amber : ran ? C.mint : "rgba(255,255,255,.45)",
                }}
              >
                status: {status}
              </span>
            </div>
            <div
              style={{
                padding: 16,
                fontFamily: FONT.mono,
                fontSize: 12,
                lineHeight: 1.7,
                minHeight: 260,
                maxHeight: 460,
                overflowY: "auto",
                display: "grid",
                alignContent: "start",
                gap: 2,
              }}
            >
              {(result?.log ?? []).map((l, i) => (
                <LogLine key={i} line={l} />
              ))}
              {busy && (
                <span
                  style={{
                    width: 8,
                    height: 12,
                    background: C.mint,
                    animation: "pulse 1s infinite",
                    display: "block",
                  }}
                />
              )}
              {!busy && !result && (
                <span style={{ color: "rgba(255,255,255,.35)" }}>
                  # akışı çalıştırdığında gerçek istekler buraya düşer
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontFamily: FONT.mono, fontSize: 11 }}>
            <Pill href={`https://${home}/.well-known/stellar.toml`}>stellar.toml ↗</Pill>
            <Pill href={anchor?.endpoints.transferServer ?? `https://${home}`}>TRANSFER_SERVER ↗</Pill>
            <Pill href={anchor?.endpoints.webAuth ?? `https://${home}`}>WEB_AUTH ↗</Pill>
            {anchor?.treasury && (
              <Pill
                href={`https://stellar.expert/explorer/${
                  state.network === "mainnet" ? "public" : "testnet"
                }/account/${anchor.treasury.address}`}
              >
                hazine {shortKey(anchor.treasury.address, 4, 4)} ↗
              </Pill>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TAG_COLOUR: Record<string, string> = {
  GET: C.blue,
  POST: C.mint,
  SIGN: C.amber,
  SEP1: C.lime,
  SEP10: C.lime,
  SEP12: C.lime,
  "200": C.mint,
  "201": C.mint,
  BANK: C.lime,
};

function LogLine({ line }: { line: SepLogView }) {
  const ts = line.at ? new Date(line.at).toLocaleTimeString("tr-TR", { hour12: false }) : "··:··:··";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto auto minmax(0,1fr)",
        gap: 12,
        animation: "fadeIn .3s both",
      }}
    >
      <span style={{ color: "rgba(255,255,255,.35)" }}>{ts}</span>
      <span style={{ color: TAG_COLOUR[line.tag] ?? C.white, minWidth: 48 }}>{line.tag}</span>
      <span style={{ color: "#E8E8E8", wordBreak: "break-all" }}>{line.msg}</span>
    </div>
  );
}

const Label = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      opacity: light ? 1 : 0.6,
      color: light ? "rgba(255,255,255,.6)" : undefined,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

const Fact = ({ k, v, colour }: { k: string; v: string; colour?: string }) => (
  <div style={{ padding: "10px 14px", borderRadius: 16, background: C.white }}>
    <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: ".08em", opacity: 0.55 }}>{k}</div>
    <div style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, color: colour }}>{v}</div>
  </div>
);

const Pill = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    style={{ padding: "7px 12px", borderRadius: 999, background: C.white, textDecoration: "none", color: C.ink }}
  >
    {children}
  </a>
);
