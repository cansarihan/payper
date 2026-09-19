"use client";

import { useState } from "react";

import { C, FONT, trLira, trPct, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, InvoiceView } from "@/lib/types";
import { ScreenHead } from "./Shell";
import type { Screen } from "./Shell";

/**
 * The whole book, one row per invoice.
 *
 * Every screen before this one shows a single invoice at the step it is on.
 * This is the view that answers "what do I actually hold" — and opening a row
 * gives the hashes, so a claim about an invoice can be checked against the
 * document rather than believed.
 */

const STATUS_COLOUR: Record<InvoiceView["status"], string> = {
  registered: C.amber,
  acknowledged: C.blue,
  funded: C.mint,
  repaid: C.green,
  defaulted: C.coral,
};

const NEXT_SCREEN: Record<InvoiceView["status"], Screen> = {
  registered: "buyer",
  acknowledged: "quote",
  funded: "settle",
  repaid: "board",
  defaulted: "settle",
};

const NEXT_INDEX: Record<InvoiceView["status"], 0 | 1 | 2 | 3 | 4> = {
  registered: 0,
  acknowledged: 1,
  funded: 2,
  repaid: 3,
  defaulted: 4,
};

export function Invoices({
  lang,
  state,
  onGo,
}: {
  lang: Lang;
  state: AppState;
  onGo: (s: Screen) => void;
}) {
  const d = t(lang);
  const [filter, setFilter] = useState<"all" | InvoiceView["status"]>("all");
  const [open, setOpen] = useState<number | null>(null);

  const rows = state.invoices.filter((i) => filter === "all" || i.status === filter);
  const locale = lang === "tr" ? "tr-TR" : "en-GB";

  const face = state.invoices.reduce((s, i) => s + BigInt(i.amountFiat), 0n);
  const financed = state.invoices
    .filter((i) => i.status === "funded" || i.status === "repaid")
    .reduce((s, i) => s + BigInt(i.amountFiat), 0n);

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead
        step={d.account}
        title={d.invoicesTitle}
        lead={d.invoicesLead}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Stat k={d.recordsLabel} v={String(state.invoices.length)} />
            <Stat k={d.totalFace} v={trLira(face, 0)} />
            <Stat k={d.financedLabel} v={trLira(financed, 0)} />
          </div>
        }
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {(
          [
            ["all", d.all],
            ["registered", d.statuses.registered],
            ["acknowledged", d.statuses.acknowledged],
            ["funded", d.statuses.funded],
            ["repaid", d.statuses.repaid],
            ["defaulted", d.statuses.defaulted],
          ] as const
        ).map(([key, label]) => {
          const n =
            key === "all"
              ? state.invoices.length
              : state.invoices.filter((r) => r.status === key).length;
          if (key !== "all" && n === 0) return null;
          const on = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontFamily: FONT.mono,
                fontSize: 11.5,
                padding: "8px 14px",
                borderRadius: 999,
                background: on ? C.ink : "rgba(255,255,255,.45)",
                color: on ? C.white : C.ink,
                border: 0,
                fontWeight: 700,
              }}
            >
              {label} {n}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            background: C.white,
            borderRadius: 24,
            padding: "56px 24px",
            textAlign: "center",
            color: C.grey,
            fontWeight: 600,
          }}
        >
          {d.empty}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((inv) => {
            const isOpen = open === inv.id;
            const target = BigInt(inv.lockedPayoutUsdc);
            const raised = BigInt(inv.fundedAmount);
            const pct = target > 0n ? Number((raised * 100n) / target) : 0;
            return (
              <div
                key={inv.id}
                style={{
                  background: C.white,
                  borderRadius: 18,
                  overflow: "hidden",
                  borderLeft: `3px solid ${STATUS_COLOUR[inv.status]}`,
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : inv.id)}
                  className="inv-card-row"
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0,1.3fr) minmax(0,1fr) 120px 118px 40px",
                    gap: 14,
                    alignItems: "center",
                    padding: "16px 20px",
                    background: "transparent",
                    border: 0,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>
                    #{String(inv.id).padStart(4, "0")}
                  </span>
                  <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{trLira(inv.amountFiat)}</span>
                    <span style={{ fontSize: 11.5, color: C.grey, fontFamily: FONT.mono }}>
                      VKN {inv.buyerTaxId}
                    </span>
                  </span>
                  <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: C.grey }}>{d.due}</span>
                    <span style={{ fontSize: 13, fontFamily: FONT.mono }}>
                      {new Date(inv.dueDate * 1000).toLocaleDateString(locale)}
                    </span>
                  </span>
                  <span style={{ display: "grid", gap: 3 }}>
                    <span style={{ fontSize: 11, color: C.grey }}>{d.discount}</span>
                    <span style={{ fontSize: 13, fontFamily: FONT.mono, color: C.green }}>
                      {inv.lockedDiscountBps ? trPct(inv.lockedDiscountBps) : "—"}
                    </span>
                  </span>
                  <span
                    style={{
                      justifySelf: "start",
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: STATUS_COLOUR[inv.status],
                      color: C.ink,
                      fontWeight: 700,
                    }}
                  >
                    {d.statuses[inv.status]}
                  </span>
                  <span
                    style={{
                      justifySelf: "end",
                      fontSize: 18,
                      color: C.grey,
                      transform: `rotate(${isOpen ? 45 : 0}deg)`,
                      transition: "transform .3s",
                    }}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 20px",
                      display: "grid",
                      gap: 14,
                      animation: "blurInA .35s both",
                    }}
                  >
                    <div style={{ height: 1, background: "rgba(10,10,10,.07)" }} />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                        gap: 12,
                      }}
                    >
                      <Detail k={d.faceUsdcLabel} v={usdc(inv.faceUsdc)} mono />
                      <Detail k={d.lockedPayout} v={target > 0n ? usdc(target) : "—"} mono />
                      <Detail k={d.raisedLabel} v={`${usdc(raised)} (%${pct})`} mono />
                      <Detail
                        k={d.registeredAt}
                        v={new Date(inv.createdAt * 1000).toLocaleString(locale)}
                      />
                      <Detail k={d.sellerVkn} v={inv.sellerTaxId} mono />
                      <Detail k={d.buyerVkn} v={inv.buyerTaxId} mono />
                    </div>

                    {target > 0n && (
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          background: "rgba(10,10,10,.08)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            height: "100%",
                            background: `linear-gradient(90deg,${C.blue},${C.mint})`,
                          }}
                        />
                      </div>
                    )}

                    <Hash k="ETTN SHA-256" v={inv.ettnHash} />
                    <Hash k={`${lang === "tr" ? "Belge" : "Document"} SHA-256`} v={inv.docHash} />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => onGo(NEXT_SCREEN[inv.status])}
                        style={{
                          border: 0,
                          borderRadius: 999,
                          padding: "10px 20px",
                          background: C.ink,
                          color: C.white,
                          fontSize: 12.5,
                          fontWeight: 700,
                        }}
                      >
                        {d.nextStep[NEXT_INDEX[inv.status]]} →
                      </button>
                      <a
                        href={`https://stellar.expert/explorer/${
                          state.network === "mainnet" ? "public" : "testnet"
                        }/contract/${state.contracts.invoice}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.grey }}
                      >
                        {d.openContract}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 16,
        padding: "10px 16px",
        display: "grid",
        gap: 2,
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.5, letterSpacing: ".05em" }}>
        {k.toUpperCase()}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT.mono }}>{v}</span>
    </div>
  );
}

function Detail({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: C.grey, fontWeight: 600 }}>{k}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: mono ? FONT.mono : undefined,
          overflowWrap: "anywhere",
        }}
      >
        {v}
      </span>
    </div>
  );
}

function Hash({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "11px 13px",
        borderRadius: 13,
        background: C.paper,
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.grey, letterSpacing: ".05em" }}>
        {k}
      </span>
      <span style={{ fontFamily: FONT.mono, fontSize: 11.5, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}
