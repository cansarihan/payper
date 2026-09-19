"use client";

import { C, FONT, shortKey } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { Session } from "@/lib/types";

export type Screen = "overview" | "upload" | "buyer" | "quote" | "anchor" | "board";
export const SCREENS: Screen[] = ["overview", "upload", "buyer", "quote", "anchor", "board"];

const DOTS = [C.mint, C.blue, C.coral, C.blue, C.amber, C.mint];

export function PanelShell({
  lang,
  screen,
  setScreen,
  session,
  onSignOut,
  children,
}: {
  lang: Lang;
  screen: Screen;
  setScreen: (s: Screen) => void;
  session: Session | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const d = t(lang);
  const name = session?.name ?? session?.role ?? "—";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.mint,
        color: C.ink,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn .4s both",
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          width: "100%",
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className="panel-head"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            padding: "22px 30px 0",
          }}
        >
          <a href="/" style={{ textDecoration: "none", color: C.ink }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em" }}>
              [ payper ]
            </span>
          </a>

          <nav className="panel-nav" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.nav.map((label, i) => {
              const target = SCREENS[i]!;
              const on = screen === target;
              return (
                <button
                  key={target}
                  onClick={() => {
                    setScreen(target);
                    window.scrollTo(0, 0);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    border: 0,
                    borderRadius: 999,
                    padding: "9px 15px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    background: on ? C.ink : "rgba(255,255,255,.55)",
                    color: on ? C.white : C.ink,
                    transition: "background .25s",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: DOTS[i],
                      flex: "none",
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: C.white,
                borderRadius: 999,
                padding: "7px 14px 7px 8px",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: C.ink,
                  color: C.mint,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
              {name}
              {session && (
                <span style={{ fontFamily: FONT.mono, fontSize: 10, opacity: 0.5 }}>
                  {shortKey(session.address, 4, 4)}
                </span>
              )}
            </span>
            <button
              onClick={onSignOut}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "9px 15px",
                background: "rgba(255,255,255,.55)",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {d.signOut}
            </button>
          </div>
        </header>

        <div className="panel-screen" style={{ padding: "24px 30px 40px", flex: 1 }}>
          {children}
        </div>
      </div>
    </main>
  );
}

/** Shared heading for every screen. */
export function ScreenHead({ step, title, lead }: { step: string; title: string; lead?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          opacity: 0.6,
          marginBottom: 8,
        }}
      >
        {step}
      </div>
      <h1
        style={{
          fontSize: "clamp(30px,3.6vw,44px)",
          fontWeight: 600,
          letterSpacing: "-.035em",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h1>
      {lead && (
        <p style={{ opacity: 0.7, margin: 0, maxWidth: 680, lineHeight: 1.55, fontWeight: 500 }}>
          {lead}
        </p>
      )}
    </div>
  );
}
