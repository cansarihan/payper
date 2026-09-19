"use client";

import { useState } from "react";

import { C, FONT, shortKey } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, Session } from "@/lib/types";
import { ScreenHead } from "./Shell";

/**
 * The identity behind the session, and the wallet attached to it.
 *
 * Signing in with a wallet fills both at once. Signing in with a passkey leaves
 * the wallet empty, and the honest thing is to say so rather than print the
 * derived address under a heading that reads "wallet" — so this screen
 * separates the two and lets a wallet be proved afterwards.
 */
export function Wallet({
  lang,
  state,
  session,
  onSession,
}: {
  lang: Lang;
  state: AppState;
  session: Session | null;
  onSession: (s: Session | null) => void;
}) {
  const d = t(lang);
  const [busy, setBusy] = useState<"link" | "unlink" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linked = session?.wallet ?? null;
  const method = session?.method ?? "demo";

  async function link() {
    setBusy("link");
    setError(null);
    try {
      const { connectWallet, signLoginMessage } = await import("@/lib/wallet/kit");
      const wallet = await connectWallet();

      const challengeRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      const challenge = (await challengeRes.json()) as {
        ok: boolean;
        nonce?: string;
        message?: string;
        error?: string;
      };
      if (!challenge.ok || !challenge.nonce || !challenge.message) {
        throw new Error(challenge.error ?? "The challenge could not be issued");
      }

      const signed = await signLoginMessage(challenge.message, wallet.address);
      const res = await fetch("/api/auth/link-wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          nonce: challenge.nonce,
          signature: signed.signature,
          payload: signed.payload,
          walletId: "swk",
          walletName: "Stellar Wallets Kit",
        }),
      });
      const json = (await res.json()) as { ok: boolean; session?: Session; error?: string };
      if (!json.ok || !json.session) throw new Error(json.error ?? "The wallet could not be linked");
      onSession(json.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function unlink() {
    setBusy("unlink");
    setError(null);
    try {
      const res = await fetch("/api/auth/link-wallet", { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; session?: Session; error?: string };
      if (!json.ok || !json.session) throw new Error(json.error ?? "The wallet could not be detached");
      onSession(json.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={d.account} title={d.walletTitle} lead={d.walletLead} />

      <div className="anchor-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: METHOD_COLOUR[method],
                color: method === "wallet" ? C.ink : C.white,
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {METHOD_ICON[method]}
            </span>
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{d.signerLabel}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.grey }}>
                {d.methods[method]}
              </span>
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Row k={d.sessionAddress} v={session ? shortKey(session.address, 8, 6) : "—"} />
            <Row k={d.roleLabel} v={session ? d.roles[session.role] : "—"} />
            {session?.credentialId && (
              <Row k="credential" v={shortKey(session.credentialId, 8, 6)} />
            )}
          </div>

          {method === "passkey" && (
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: C.grey,
                borderLeft: `2px solid ${C.amber}`,
                paddingLeft: 12,
              }}
            >
              {d.passkeyNote}
            </p>
          )}
        </div>

        <div
          style={{
            background: linked ? C.ink : C.white,
            color: linked ? C.white : C.ink,
            borderRadius: 28,
            padding: 26,
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{d.linkedWallet}</div>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: linked ? "rgba(255,255,255,.62)" : C.grey,
              }}
            >
              {d.linkLead}
            </p>
          </div>

          {linked ? (
            <>
              <div style={{ display: "grid", gap: 10 }}>
                <Row k={d.walletName} v={linked.walletName} dark />
                <Row k={d.address} v={shortKey(linked.address, 8, 6)} dark />
                <Row
                  k={d.linkedAt}
                  v={new Date(linked.linkedAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB")}
                  dark
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={`https://stellar.expert/explorer/${
                    state.network === "mainnet" ? "public" : "testnet"
                  }/account/${linked.address}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 11.5,
                    color: C.mint,
                    alignSelf: "center",
                  }}
                >
                  stellar.expert ↗
                </a>
                <button
                  onClick={() => void unlink()}
                  disabled={busy !== null}
                  style={{
                    marginLeft: "auto",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 999,
                    padding: "11px 20px",
                    background: "transparent",
                    color: C.white,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {busy === "unlink" ? "…" : d.unlinkCta}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => void link()}
              disabled={busy !== null}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "15px 26px",
                background: C.ink,
                color: C.white,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {busy === "link" ? `${d.loading}…` : d.linkCta}
            </button>
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
      </div>
    </div>
  );
}

const METHOD_COLOUR: Record<string, string> = {
  wallet: C.mint,
  passkey: C.blue,
  demo: C.amber,
};

const METHOD_ICON: Record<string, string> = {
  wallet: "◎",
  passkey: "⌘",
  demo: "▷",
};

function Row({ k, v, dark }: { k: string; v: string; dark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 13px",
        borderRadius: 13,
        background: dark ? C.panel : C.paper,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.6 }}>{k}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 12.5, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}
