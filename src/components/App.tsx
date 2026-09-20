"use client";

import { useCallback, useEffect, useState } from "react";

import { Connect } from "@/components/Connect";
import { Anchor } from "@/components/panel/Anchor";
import { Bank } from "@/components/panel/Bank";
import { Board } from "@/components/panel/Board";
import { Invoices } from "@/components/panel/Invoices";
import { Market } from "@/components/panel/Market";
import { Overview } from "@/components/panel/Overview";
import { Buyer } from "@/components/panel/Buyer";
import { PanelShell, type Screen } from "@/components/panel/Shell";
import { Pay } from "@/components/panel/Pay";
import { Quote } from "@/components/panel/Quote";
import { Settle } from "@/components/panel/Settle";
import { Stats } from "@/components/panel/Stats";
import { Tour } from "@/components/panel/Tour";
import { Upload } from "@/components/panel/Upload";
import { Wallet } from "@/components/panel/Wallet";
import { C } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, Session } from "@/lib/types";

/** The dashboard. One state fetch feeds every screen; no screen talks to chain. */
export function App({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [screen, setScreen] = useState<Screen>("overview");
  const [tour, setTour] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = (await res.json()) as AppState | { ok: false; error: string };
      if (!("ok" in json) || json.ok !== true) throw new Error((json as { error: string }).error);
      setState(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { session?: Session | null }) => setSession(j.session ?? null))
      .catch(() => {})
      .finally(() => setSessionKnown(true));
  }, []);

  // Keep the book current while someone is looking at it.
  useEffect(() => {
    const iv = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(iv);
  }, [refresh]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
  }

  if (!sessionKnown) {
    return (
      <main style={{ minHeight: "100vh", background: C.black, color: C.white, display: "grid", placeItems: "center" }}>
        <span style={{ opacity: 0.5, fontWeight: 600 }}>{d.loading}…</span>
      </main>
    );
  }

  if (!session) {
    return <Connect lang={lang} onSignedIn={(s) => setSession(s)} />;
  }

  return (
    <PanelShell
      lang={lang}
      screen={screen}
      setScreen={setScreen}
      state={state}
      session={session}
      onSignOut={() => void signOut()}
      onTour={() => setTour(true)}
    >
      {error && (
        <div
          style={{
            margin: "16px 30px 0",
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

      {!state ? (
        <div style={{ padding: 80, textAlign: "center", fontWeight: 600, opacity: 0.6 }}>
          {d.loading}…
        </div>
      ) : screen === "overview" ? (
        <Overview lang={lang} state={state} onGo={setScreen} />
      ) : (
        <div className="panel-screen" style={{ padding: "24px 30px 40px", flex: 1 }}>
          {screen === "upload" ? (
            <Upload
              lang={lang}
              network={state.network}
              onRegistered={() => {
                void refresh();
                setScreen("buyer");
              }}
            />
          ) : screen === "buyer" ? (
            <Buyer lang={lang} state={state} session={session} onDone={refresh} />
          ) : screen === "board" ? (
            <Board lang={lang} state={state} session={session} onDone={refresh} />
          ) : screen === "quote" ? (
            <Quote lang={lang} state={state} onDone={refresh} />
          ) : screen === "bank" ? (
            <Bank lang={lang} />
          ) : screen === "wallet" ? (
            <Wallet lang={lang} state={state} session={session} onSession={setSession} />
          ) : screen === "stats" ? (
            <Stats lang={lang} state={state} onGo={setScreen} />
          ) : screen === "invoices" ? (
            <Invoices lang={lang} state={state} onGo={setScreen} />
          ) : screen === "market" ? (
            <Market lang={lang} state={state} onGo={setScreen} />
          ) : screen === "pay" ? (
            <Pay lang={lang} state={state} onDone={refresh} />
          ) : screen === "settle" ? (
            <Settle lang={lang} state={state} onDone={refresh} />
          ) : (
            <Anchor lang={lang} state={state} onDone={refresh} />
          )}
        </div>
      )}
      {tour && (
        <Tour lang={lang} state={state} onGo={setScreen} onClose={() => setTour(false)} />
      )}
    </PanelShell>
  );
}
