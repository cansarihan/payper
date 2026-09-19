"use client";

import { useState } from "react";

import { RoleSwitch } from "@/components/RoleSwitch";
import { C, FONT, trLira, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, InvoiceView, SessionRole } from "@/lib/types";
import { ScreenHead } from "./Shell";

interface DefaultOutcome {
  invoiceId: number;
  fromFirstLoss: string;
  sellerRecourse: string;
}

/**
 * The end of the lifecycle, both ways it can go.
 *
 * Repayment is the path everyone plans for; the default waterfall is the one
 * that decides whether a funder was ever really protected. Both run in the same
 * contract, so both belong on the same screen — showing only the happy path
 * would be the more flattering choice and the less honest one.
 */
export function Settle({
  lang,
  state,
  onDone,
}: {
  lang: Lang;
  state: AppState;
  onDone: () => void;
}) {
  const d = t(lang);
  const [busy, setBusy] = useState<"repay" | "buffer" | "default" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsRole, setNeedsRole] = useState<SessionRole | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DefaultOutcome | null>(null);
  const [topUp, setTopUp] = useState(5);
  const [picked, setPicked] = useState<number | null>(null);

  const outstanding = state.invoices.filter((i) => i.status === "funded");
  const invoice: InvoiceView | null =
    state.invoices.find((i) => i.id === picked) ?? outstanding[0] ?? null;

  const buffer = BigInt(state.treasury.firstLoss);
  const grace = state.limits.gracePeriodDays;
  const now = Date.now() / 1000;

  // The contract's own condition, mirrored so the button can explain itself
  // before the call rather than only after it is refused.
  const defaultableAt = invoice ? invoice.dueDate + grace * 86_400 : 0;
  const daysLeft = invoice ? (defaultableAt - now) / 86_400 : 0;
  const eligible = invoice !== null && daysLeft <= 0;

  const shortfall = invoice ? BigInt(invoice.fundedAmount) : 0n;
  const absorbed = buffer >= shortfall ? shortfall : buffer;
  const recourse = shortfall - absorbed;
  const coverPct = shortfall > 0n ? Number((absorbed * 100n) / shortfall) : 0;

  async function call(
    which: "repay" | "buffer" | "default",
    url: string,
    body: Record<string, unknown>,
  ) {
    setBusy(which);
    setError(null);
    setNeedsRole(null);
    if (which === "default") setOutcome(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        ok: boolean;
        hash?: string;
        error?: string;
        needsRole?: SessionRole;
        outcome?: DefaultOutcome;
      };
      if (!json.ok) {
        setNeedsRole(json.needsRole ?? null);
        throw new Error(json.error ?? "Call failed");
      }
      setHash(json.hash ?? null);
      if (json.outcome) setOutcome(json.outcome);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 7 · repay`} title={d.settleTitle} lead={d.settleLead} />

      {outstanding.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {outstanding.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setPicked(c.id);
                setHash(null);
                setError(null);
                setOutcome(null);
              }}
              style={{
                border: `1px solid ${c.id === invoice?.id ? C.ink : "rgba(10,10,10,.16)"}`,
                background: c.id === invoice?.id ? C.ink : "transparent",
                color: c.id === invoice?.id ? C.white : C.ink,
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

      <div data-tour="se-split" className="anchor-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 18 }}>
            {!invoice ? (
              <div style={{ color: C.grey, fontWeight: 600, padding: "28px 0", textAlign: "center" }}>
                {d.nothingAtRisk}
              </div>
            ) : (
              <>
                <Row k={`#${invoice.id} · ${d.amount}`} v={trLira(invoice.amountFiat)} big />
                <Row
                  k={d.due}
                  v={new Date(invoice.dueDate * 1000).toLocaleDateString(
                    lang === "tr" ? "tr-TR" : "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                />
                <Row k={d.discount} v={`%${(invoice.lockedDiscountBps / 100).toFixed(2)}`} />
                <Row k="payout" v={usdc(invoice.lockedPayoutUsdc)} />

                <button
                  onClick={() => void call("repay", "/api/repay", { invoiceId: invoice.id })}
                  disabled={busy !== null}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "15px 26px",
                    background: busy === "repay" ? "rgba(10,10,10,.12)" : C.ink,
                    color: busy === "repay" ? C.ink : C.white,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {busy === "repay" ? "…" : `${d.repayCta} · ${trLira(invoice.amountFiat)}`}
                </button>
              </>
            )}
          </div>

          <div
            style={{
              background: C.ink,
              color: C.white,
              borderRadius: 28,
              padding: 26,
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{d.bufferTitle}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,.62)" }}>
                {d.bufferLead}
              </p>
            </div>

            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-.035em" }}>
              {usdc(state.treasury.firstLoss)}
            </div>

            {invoice && shortfall > 0n && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.12)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, coverPct)}%`,
                      borderRadius: 999,
                      background: coverPct >= 100 ? C.mint : C.amber,
                      transition: "width .5s cubic-bezier(.2,.8,.2,1)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    color: "rgba(255,255,255,.55)",
                  }}
                >
                  <span>
                    {d.absorbed} {usdc(absorbed)}
                  </span>
                  <span>
                    {d.recourseOwed} {usdc(recourse)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="number"
                min={1}
                value={topUp}
                onChange={(e) => setTopUp(Number(e.target.value))}
                style={{
                  width: 96,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 12,
                  padding: "11px 13px",
                  color: C.white,
                  fontFamily: FONT.mono,
                  fontSize: 14,
                }}
              />
              <button
                onClick={() => void call("buffer", "/api/first-loss", { amountUsdc: topUp })}
                disabled={busy !== null || topUp <= 0}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "12px 20px",
                  background: C.mint,
                  color: C.ink,
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                {busy === "buffer" ? "…" : `${d.bufferTopUp} · ${topUp} USDC`}
              </button>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{d.operatorOnly}</span>
            </div>
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{d.defaultTitle}</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.grey }}>{d.defaultLead}</p>
          </div>

          {invoice && (
            <div
              style={{
                borderRadius: 18,
                padding: 18,
                background: eligible ? "rgba(255,95,87,.08)" : C.paper,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {d.due} + {grace} {d.days}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: eligible ? C.coral : C.grey }}>
                  {new Date(defaultableAt * 1000).toLocaleDateString(
                    lang === "tr" ? "tr-TR" : "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </span>
              </div>
              {!eligible && (
                <div style={{ fontSize: 12.5, color: C.grey, fontWeight: 600 }}>
                  {Math.ceil(daysLeft)} {d.days} {d.graceLeft}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() =>
              invoice && void call("default", "/api/default", { invoiceId: invoice.id })
            }
            disabled={busy !== null || !invoice}
            style={{
              border: `1px solid ${eligible ? C.coral : "rgba(10,10,10,.16)"}`,
              borderRadius: 999,
              padding: "14px 24px",
              background: eligible ? C.coral : "transparent",
              color: eligible ? C.white : C.grey,
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            {busy === "default" ? "…" : d.defaultCta}
          </button>

          {outcome && (
            <div style={{ display: "grid", gap: 10 }}>
              <Row k={d.absorbed} v={usdc(outcome.fromFirstLoss)} />
              <Row k={d.recourseOwed} v={usdc(outcome.sellerRecourse)} />
            </div>
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

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.6 }}>{k}</span>
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: big ? 24 : 13.5,
          fontWeight: big ? 700 : 600,
          letterSpacing: big ? "-.02em" : 0,
        }}
      >
        {v}
      </span>
    </div>
  );
}
