"use client";

import { useCallback, useEffect, useState } from "react";

import { RoleSwitch } from "@/components/RoleSwitch";
import { C, FONT, liveRate, shortKey, trLira, trNumber, trPct, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, FunderView, SessionRole } from "@/lib/types";
import { ScreenHead } from "./Shell";

/** Who backed this invoice, and what the round still needs. */
export function Board({
  lang,
  state,
  onDone,
}: {
  lang: Lang;
  state: AppState;
  onDone: () => void;
}) {
  const d = t(lang);
  const [funders, setFunders] = useState<FunderView[]>(state.activeFunders);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRole, setNeedsRole] = useState<SessionRole | null>(null);
  const [amountFiat, setAmountFiat] = useState(500);
  const [receipt, setReceipt] = useState<{ moved: string; payer: string; steps: { step: string; detail: string }[] } | null>(null);

  const candidates = state.invoices.filter((i) => i.lockedDiscountBps > 0);
  const invoice =
    state.invoices.find((i) => i.id === picked) ??
    candidates.find((i) => i.status === "acknowledged") ??
    candidates[0] ??
    state.active;

  const loadFunders = useCallback(async (id: number) => {
    const res = await fetch(`/api/funders?invoiceId=${id}`, { cache: "no-store" });
    const json = (await res.json()) as { ok: boolean; funders?: FunderView[] };
    if (json.ok && json.funders) setFunders(json.funders);
  }, []);

  useEffect(() => {
    if (invoice) void loadFunders(invoice.id);
  }, [invoice?.id, state.invoices, loadFunders]);

  const rate = liveRate(state.anchor);
  const target = invoice ? BigInt(invoice.lockedPayoutUsdc) : 0n;
  const raised = invoice ? BigInt(invoice.fundedAmount) : 0n;
  const remaining = target > raised ? target - raised : 0n;
  const pct = target > 0n ? Math.min(100, Number((raised * 100n) / target)) : 0;
  const days = invoice ? Math.max(0, Math.round((invoice.dueDate * 1000 - Date.now()) / 86_400_000)) : 0;
  const discountBps = invoice?.lockedDiscountBps ?? 0;

  async function fund() {
    if (!invoice || !rate) return;
    setBusy(true);
    setError(null);
    setNeedsRole(null);
    setReceipt(null);
    try {
      const role = funders.length % 2 === 0 ? "funder" : "funderB";
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, role, amountUsdc: amountFiat / rate }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        needsRole?: SessionRole;
        amountUsdc?: string;
        payer?: string;
        steps?: { step: string; detail: string }[];
      };
      if (!json.ok) {
        setNeedsRole(json.needsRole ?? null);
        throw new Error(json.error ?? "Funding failed");
      }
      setReceipt({
        moved: json.amountUsdc ?? "0",
        payer: json.payer ?? "",
        steps: json.steps ?? [],
      });
      await loadFunders(invoice.id);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <div style={{ animation: "rise .4s both" }}>
        <ScreenHead step={`${d.step} 4 · fund`} title={d.boardTitle} lead={d.boardLead} />
        <div style={{ background: C.white, borderRadius: 28, padding: "56px 24px", textAlign: "center", color: C.grey, fontWeight: 600 }}>
          {d.empty}
        </div>
      </div>
    );
  }

  const canFund = invoice.status === "acknowledged" && remaining > 0n && rate !== null;
  const cols = [C.mint, C.blue, C.coral, C.lime];

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 4 · fund`} title={d.boardTitle} lead={d.boardLead} />

      {candidates.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {candidates.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => setPicked(c.id)}
              style={{
                border: `1px solid ${c.id === invoice.id ? C.ink : "rgba(10,10,10,.16)"}`,
                background: c.id === invoice.id ? C.ink : "transparent",
                color: c.id === invoice.id ? C.white : C.ink,
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: FONT.mono,
              }}
            >
              #{c.id}
            </button>
          ))}
        </div>
      )}

      {/* headline: how many people backed it */}
      <h2
        style={{
          fontSize: "clamp(30px,4.6vw,64px)",
          fontWeight: 600,
          letterSpacing: "-.045em",
          lineHeight: 1,
          margin: "0 0 18px",
        }}
      >
        {lang === "tr" ? (
          <>
            Bu faturayı <b style={{ fontWeight: 800 }}>{funders.length}</b> kişi fonladı
          </>
        ) : (
          <>
            <b style={{ fontWeight: 800 }}>{funders.length}</b>{" "}
            {funders.length === 1 ? "funder backed" : "funders backed"} this invoice
          </>
        )}
      </h2>

      {/* progress */}
      <div style={{ background: C.white, borderRadius: 28, padding: "22px 26px", marginBottom: 16, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{d.fundedLabel}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 13 }}>
            <b style={{ fontSize: 21 }}>{usdc(raised)}</b> / {usdc(target)}{" "}
            <span style={{ color: C.green }}>%{pct}</span>
          </span>
        </div>

        <div style={{ position: "relative", height: 20, borderRadius: 999, background: C.paper, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              right: "auto",
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg,${C.blue},${C.mint},${C.lime})`,
              transition: "width .8s cubic-bezier(.2,.8,.2,1)",
            }}
          />
          {[25, 50, 75].map((m) => (
            <span key={m} style={{ position: "absolute", left: `${m}%`, top: 0, bottom: 0, width: 2, background: "rgba(10,10,10,.16)" }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          <Stat k={d.fundedLabel} v={usdc(raised)} />
          <Stat k={d.remaining} v={usdc(remaining)} />
          <Stat k={d.target} v={trLira(invoice.amountFiat)} />
          <Stat k={d.timeLeft} v={`${days} ${d.days}`} colour={C.green} />
        </div>
      </div>

      <div className="quote-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        {/* the crowd */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 28, padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{d.funders}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
              {funders.length}
            </span>
          </div>

          {funders.length === 0 ? (
            <div style={{ padding: "34px 12px", textAlign: "center", color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>
              {d.noFunders}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {[...funders].reverse().map((f, i) => {
                const share = target > 0n ? Number((BigInt(f.amount) * 100n) / target) : 0;
                return (
                  <div
                    key={`${f.funder}-${f.at}-${i}`}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      display: "grid",
                      gridTemplateColumns: "38px minmax(0,1fr) auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "11px 13px",
                      borderRadius: 14,
                      background: C.panel,
                      animation: "blurInA .45s both",
                      animationDelay: `${i * 0.06}s`,
                    }}
                  >
                    <span style={{ position: "absolute", inset: 0, right: "auto", width: `${share}%`, background: cols[i % 4], opacity: 0.12 }} />
                    <span
                      style={{
                        position: "relative",
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg,${cols[i % 4]},${cols[(i + 1) % 4]})`,
                        color: C.ink,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      {f.funder.slice(1, 3)}
                    </span>
                    <span style={{ position: "relative", display: "grid", gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 12.5, fontWeight: 600 }}>
                        {shortKey(f.funder, 6, 4)}
                      </span>
                      <span style={{ fontSize: 10.5, opacity: 0.5 }}>
                        {new Date(f.at * 1000).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB")} · {share}% {d.yourShare}
                      </span>
                    </span>
                    <span style={{ position: "relative", fontFamily: FONT.mono, fontSize: 14, fontWeight: 700 }}>
                      {usdc(f.amount, 4)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* fund it */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.white, borderRadius: 28, padding: 24, display: "grid", gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{d.fundIt}</div>

            <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 999, background: C.paper, width: "fit-content" }}>
              {[250, 500, 1000].map((a) => (
                <button
                  key={a}
                  onClick={() => setAmountFiat(a)}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "9px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: amountFiat === a ? C.ink : "transparent",
                    color: amountFiat === a ? C.white : C.ink,
                  }}
                >
                  {trNumber(a, 0)}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "#F7F7F5" }}>
                <Micro>{d.youFund}</Micro>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>
                  {trNumber(amountFiat, 0)} ₺
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.55 }}>
                  {rate ? `${(amountFiat / rate).toFixed(4)} USDC` : "—"}
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: C.mint }}>
                <Micro>{d.expectedReturn}</Micro>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>
                  +{trNumber((amountFiat * discountBps) / 10000, 0)} ₺
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.6 }}>
                  {trPct(discountBps)}
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: 16,
                  background: "rgba(255,95,87,.12)",
                  color: C.coral,
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  overflowWrap: "anywhere",
                  maxHeight: 130,
                  overflowY: "auto",
                }}
              >
                {error}
              </div>
            )}

            {needsRole && error && (
              <RoleSwitch
                lang={lang}
                needsRole={needsRole}
                message={error}
                onSwitched={() => {
                  setNeedsRole(null);
                  setError(null);
                  void fund();
                }}
              />
            )}

            <button
              onClick={() => void fund()}
              disabled={busy || !canFund}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: busy || !canFund ? "rgba(10,10,10,.12)" : C.ink,
                color: busy || !canFund ? C.ink : C.white,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {busy ? `${d.loading}…` : canFund ? d.fundIt : d.fundingClosed}
            </button>
          </div>

          {receipt && (
            <div style={{ background: C.ink, color: C.white, borderRadius: 24, padding: 22, display: "grid", gap: 10, animation: "rise .4s both" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.mint }}>
                {usdc(receipt.moved, 4)}
              </div>
              <div style={{ display: "grid", gap: 5, fontFamily: FONT.mono, fontSize: 11 }}>
                <Line k="payer" v={shortKey(receipt.payer, 4, 4)} />
                {receipt.steps
                  .filter((s) => s.step !== "fund")
                  .map((s) => (
                    <Line key={s.step} k={s.step} v={s.detail} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ k, v, colour }: { k: string; v: string; colour?: string }) => (
  <div style={{ padding: "12px 14px", borderRadius: 16, background: "#F7F7F5" }}>
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", opacity: 0.5, marginBottom: 4 }}>
      {k}
    </div>
    <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em", fontFamily: FONT.mono, color: colour }}>
      {v}
    </div>
  </div>
);

const Micro = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.55, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
    {children}
  </div>
);

const Line = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
    <span style={{ opacity: 0.5 }}>{k}</span>
    <span style={{ textAlign: "right", wordBreak: "break-word" }}>{v}</span>
  </div>
);
