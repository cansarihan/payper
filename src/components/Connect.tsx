"use client";

import { useEffect, useState } from "react";

import { Lockup } from "@/components/Logo";
import { C, FONT } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import { ROLE_LABEL, type Session, type SessionRole } from "@/lib/auth/roles";

const ROLES: { id: SessionRole; colour: string; en: string; tr: string }[] = [
  { id: "seller", colour: C.mint, en: "I issue invoices", tr: "Fatura kesiyorum" },
  { id: "buyer", colour: C.blue, en: "I pay invoices", tr: "Fatura ödüyorum" },
  { id: "funder", colour: C.lime, en: "I fund invoices", tr: "Fatura fonluyorum" },
];

/**
 * Sign in. Demo sign-in exists because one machine plays three parties on
 * stage; it is marked as such in the session and removable with DEMO_LOGIN=off.
 */
export function Connect({ lang, onSignedIn }: { lang: Lang; onSignedIn: (s: Session) => void }) {
  const d = t(lang);
  const [role, setRole] = useState<SessionRole>("seller");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoAllowed, setDemoAllowed] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { demoLogin?: boolean }) => setDemoAllowed(j.demoLogin !== false))
      .catch(() => {});
  }, []);

  async function withDemo() {
    setBusy("demo");
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, name }),
      });
      const json = (await res.json()) as { ok: boolean; session?: Session; error?: string };
      if (!json.ok || !json.session) throw new Error(json.error ?? "Sign-in failed");
      onSignedIn(json.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function withWallet() {
    setBusy("wallet");
    setError(null);
    try {
      const { connectWallet, signLoginMessage } = await import("@/lib/wallet/kit");
      const connected = await connectWallet();

      const ch = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: connected.address }),
      }).then((r) => r.json() as Promise<{ ok: boolean; nonce: string; message: string; error?: string }>);
      if (!ch.ok) throw new Error(ch.error ?? "Challenge could not be issued");

      const signed = await signLoginMessage(ch.message, connected.address);
      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: connected.address,
          nonce: ch.nonce,
          signature: signed.signature,
          payload: signed.payload,
          role,
          name,
          walletId: "swk",
          walletName: "Stellar Wallets Kit",
        }),
      });
      const json = (await res.json()) as { ok: boolean; session?: Session; error?: string };
      if (!json.ok || !json.session) throw new Error(json.error ?? "Signature rejected");
      onSignedIn(json.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.black,
        color: C.white,
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "min(560px,100%)", display: "grid", gap: 22, animation: "rise .4s both" }}>
        <div>
          <a href="/" style={{ textDecoration: "none", color: C.white }}>
            <div style={{ marginBottom: 20 }}>
              <Lockup colour={C.mint} size={28} />
            </div>
          </a>
          <h1
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 600,
              letterSpacing: "-.04em",
              margin: "0 0 10px",
            }}
          >
            {lang === "tr" ? "Panele gir" : "Sign in"}
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,.65)", margin: 0 }}>
            {lang === "tr"
              ? "Payper'da parola yok. Cüzdanın imzalar; imza yalnızca sahipliği kanıtlar, hiçbir varlık hareket etmez."
              : "Payper has no passwords. Your wallet signs, and the signature only proves ownership — nothing moves."}
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Label>{lang === "tr" ? "Adın ya da firman" : "Your name or company"}</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={48}
            placeholder={lang === "tr" ? "Anadolu Metal Ltd." : "Acme Manufacturing Ltd."}
            style={{
              width: "100%",
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.04)",
              color: C.white,
              borderRadius: 14,
              padding: "14px 16px",
              fontSize: 14.5,
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 11.5, opacity: 0.5, lineHeight: 1.5 }}>
            {lang === "tr"
              ? "Panelde bu isim görünür. Zincire yazılmaz, oturum çerezinde kalır."
              : "This is the name the dashboard shows. It is not written on chain."}
          </span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Label>{lang === "tr" ? "Hangi rolle giriyorsun?" : "Which role?"}</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
            {ROLES.map((r) => {
              const on = role === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 16,
                    padding: "14px 16px",
                    border: `1px solid ${on ? r.colour : "rgba(255,255,255,.1)"}`,
                    background: on ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.03)",
                    color: C.white,
                    display: "grid",
                    gap: 5,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.colour }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{d.roles[r.id]}</span>
                  </span>
                  <span style={{ fontSize: 11.5, opacity: 0.55 }}>{lang === "tr" ? r.tr : r.en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "13px 15px",
              borderRadius: 16,
              background: "rgba(255,95,87,.14)",
              color: "#FFB4AF",
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={() => void withWallet()}
            disabled={busy !== null}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "15px 24px",
              background: C.mint,
              color: C.ink,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {busy === "wallet" ? `${d.loading}…` : lang === "tr" ? "Cüzdan bağla" : "Connect a wallet"}
          </button>

          {demoAllowed && (
            <>
              <button
                onClick={() => void withDemo()}
                disabled={busy !== null}
                style={{
                  border: "1px solid rgba(255,255,255,.18)",
                  borderRadius: 999,
                  padding: "14px 24px",
                  background: "transparent",
                  color: C.white,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {busy === "demo" ? `${d.loading}…` : lang === "tr" ? "Demo ile devam et" : "Continue as a demo party"}
              </button>
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.45,
                  lineHeight: 1.5,
                  fontFamily: FONT.mono,
                  textAlign: "center",
                }}
              >
                {lang === "tr"
                  ? "Demo girişinde imzalayan anahtar sunucuda tutulur."
                  : "Demo sign-in uses a server-held key."}
              </span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      opacity: 0.55,
    }}
  >
    {children}
  </span>
);
