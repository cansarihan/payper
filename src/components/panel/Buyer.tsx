"use client";

import { useState } from "react";

import { C, FONT, shortKey, trLira } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, SessionRole } from "@/lib/types";
import { RoleSwitch } from "@/components/RoleSwitch";
import { ScreenHead } from "./Shell";

/**
 * The buyer confirms the receivable.
 *
 * This is the product's lock: without it a funder has only the supplier's word
 * that the invoice is real and will be paid.
 */
export function Buyer({
  lang,
  state,
  onDone,
}: {
  lang: Lang;
  state: AppState;
  onDone: () => void;
}) {
  const d = t(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRole, setNeedsRole] = useState<SessionRole | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const pending = state.invoices.filter((i) => i.status === "registered");
  const invoice =
    state.invoices.find((i) => i.id === picked) ?? pending[0] ?? state.active ?? null;

  async function acknowledge() {
    if (!invoice) return;
    setBusy(true);
    setError(null);
    setNeedsRole(null);
    try {
      const res = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        hash?: string;
        error?: string;
        needsRole?: SessionRole;
      };
      if (!json.ok) {
        setNeedsRole(json.needsRole ?? null);
        throw new Error(json.error ?? "Could not acknowledge");
      }
      setHash(json.hash ?? null);
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
        <ScreenHead step={`${d.step} 2 · acknowledge`} title={d.buyerTitle} lead={d.buyerLead} />
        <Empty>{d.empty}</Empty>
      </div>
    );
  }

  const done = invoice.status !== "registered";

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 2 · acknowledge`} title={d.buyerTitle} lead={d.buyerLead} />

      {pending.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {pending.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setPicked(c.id);
                setHash(null);
                setError(null);
              }}
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

      <div data-tour="bu-card" style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 22 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px,1fr) auto minmax(140px,1fr)",
            gap: 18,
            alignItems: "center",
          }}
        >
          <Party label={d.seller} value={shortKey(invoice.seller, 5, 4)} tax={invoice.sellerTaxId} />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                height: 2,
                background: `repeating-linear-gradient(90deg,${C.ink} 0 7px,transparent 7px 14px)`,
                opacity: done ? 0.9 : 0.3,
                marginBottom: 8,
              }}
            />
            <span style={{ fontFamily: FONT.mono, fontSize: 10.5, opacity: 0.55 }}>
              {done ? d.acknowledged : d.awaiting}
            </span>
          </div>
          <Party
            label={d.buyer}
            value={shortKey(invoice.buyer, 5, 4)}
            tax={invoice.buyerTaxId}
            align="right"
          />
        </div>

        <div
          style={{
            fontSize: "clamp(34px,4.2vw,56px)",
            fontWeight: 600,
            letterSpacing: "-.04em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {trLira(invoice.amountFiat)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          <Tile k={d.due} v={new Date(invoice.dueDate * 1000).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB")} />
          <Tile k="ETTN" v={`${invoice.ettnHash.slice(0, 10)}…`} mono />
          <Tile k={d.documentTitle} v={`${invoice.docHash.slice(0, 10)}…`} mono />
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
              onDone();
            }}
          />
        )}

        {done ? (
          <div
            style={{
              padding: "15px 18px",
              borderRadius: 20,
              background: C.lime,
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {d.acknowledged}
            {hash && (
              <>
                {" · "}
                <a
                  href={`https://stellar.expert/explorer/${
                    state.network === "mainnet" ? "public" : "testnet"
                  }/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.ink }}
                >
                  {hash.slice(0, 14)}… ↗
                </a>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => void acknowledge()}
            disabled={busy}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "15px 26px",
              background: busy ? "rgba(10,10,10,.12)" : C.ink,
              color: busy ? C.ink : C.white,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {busy ? `${d.loading}…` : d.acknowledge}
          </button>
        )}
      </div>
    </div>
  );
}

const Party = ({
  label,
  value,
  tax,
  align,
}: {
  label: string;
  value: string;
  tax: string;
  align?: "right";
}) => (
  <div style={{ textAlign: align ?? "left" }}>
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        opacity: 0.5,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div style={{ fontFamily: FONT.mono, fontSize: 13.5, fontWeight: 700 }}>{value}</div>
    <div style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.5, marginTop: 3 }}>{tax}</div>
  </div>
);

const Tile = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div style={{ padding: "12px 14px", borderRadius: 16, background: "#F7F7F5" }}>
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        opacity: 0.5,
        marginBottom: 5,
      }}
    >
      {k}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: mono ? FONT.mono : undefined }}>{v}</div>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: C.white,
      borderRadius: 28,
      padding: "56px 24px",
      textAlign: "center",
      color: C.grey,
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);
