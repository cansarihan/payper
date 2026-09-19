"use client";

import { useEffect, useState } from "react";

import { C, FONT } from "@/lib/design";
import { checkIban, maskIban, type BankAccount } from "@/lib/bank";
import { t, type Lang } from "@/lib/i18n/dictionary";
import { ScreenHead } from "./Shell";

/**
 * The payout destination.
 *
 * The IBAN is checked as it is typed rather than on submit, because the useful
 * moment to hear that a digit is wrong is while the wrong digit is still on
 * screen. The same checksum runs again on the server — this one is a courtesy,
 * not the guard.
 */
export function Bank({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/bank", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok: boolean; account: BankAccount | null }) => {
        if (j.ok && j.account) setAccount(j.account);
      })
      .catch(() => {});
  }, []);

  const check = iban.trim() ? checkIban(iban) : null;

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iban, holder }),
      });
      const json = (await res.json()) as { ok: boolean; account?: BankAccount; error?: string };
      if (!json.ok || !json.account) throw new Error(json.error ?? "The account was not saved");
      setAccount(json.account);
      setSaved(true);
      setIban("");
      setHolder("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    setError(null);
    try {
      await fetch("/api/bank", { method: "DELETE" });
      setAccount(null);
      setSaved(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={d.account} title={d.bankTitle} lead={d.bankLead} />

      <div className="anchor-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 18 }}>
          {account ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: C.mint,
                    color: C.ink,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  ₺
                </span>
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{account.holder}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.grey }}>
                    {account.bankName ?? "—"}
                  </span>
                </span>
              </div>

              <div
                style={{
                  padding: "15px 17px",
                  borderRadius: 16,
                  background: C.paper,
                  fontFamily: FONT.mono,
                  fontSize: 15,
                  letterSpacing: ".04em",
                }}
              >
                {maskIban(account.iban)}
              </div>

              {saved && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.green }}>{d.bankSaved}</div>
              )}

              <button
                onClick={() => void clear()}
                disabled={busy !== null}
                style={{
                  justifySelf: "start",
                  border: "1px solid rgba(10,10,10,.16)",
                  borderRadius: 999,
                  padding: "11px 22px",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {busy === "clear" ? "…" : d.bankClear}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <Label>{d.bankIban}</Label>
                <input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  spellCheck={false}
                  autoComplete="off"
                  style={{
                    border: `1px solid ${
                      check && !check.valid ? C.coral : "rgba(10,10,10,.14)"
                    }`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontFamily: FONT.mono,
                    fontSize: 15,
                    letterSpacing: ".04em",
                  }}
                />
                {check && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: check.valid ? C.green : C.coral,
                      lineHeight: 1.5,
                    }}
                  >
                    {check.valid
                      ? `${check.pretty}${check.bankCode ? ` · ${check.bankCode}` : ""}`
                      : check.error}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <Label>{d.bankHolder}</Label>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Anadolu Metal San. Tic. Ltd. Şti."
                  style={{
                    border: "1px solid rgba(10,10,10,.14)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                />
              </div>

              <button
                onClick={() => void save()}
                disabled={busy !== null || !check?.valid || holder.trim().length < 3}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "15px 26px",
                  background: check?.valid && holder.trim().length >= 3 ? C.ink : "rgba(10,10,10,.12)",
                  color: check?.valid && holder.trim().length >= 3 ? C.white : C.ink,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {busy === "save" ? `${d.loading}…` : d.bankSave}
              </button>
            </>
          )}

          {error && (
            <div
              style={{
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

        <div
          style={{
            background: C.ink,
            color: C.white,
            borderRadius: 28,
            padding: 26,
            display: "grid",
            gap: 14,
            alignContent: "start",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {account ? d.bankSaved : d.bankNone}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)" }}>
            {account ? d.bankWhy : d.bankNoneNote}
          </p>
          {!account && (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)" }}>
              {d.bankWhy}
            </p>
          )}
          <div
            style={{
              marginTop: 4,
              padding: "12px 14px",
              borderRadius: 14,
              background: C.panel,
              fontFamily: FONT.mono,
              fontSize: 10.5,
              color: C.mint,
              lineHeight: 1.6,
            }}
          >
            ISO 7064 mod-97 · SEP-6 withdraw dest · dest_extra
          </div>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }: { children: string }) => (
  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", opacity: 0.55 }}>
    {children.toUpperCase()}
  </span>
);
