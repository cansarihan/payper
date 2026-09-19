"use client";

import { useEffect, useRef, useState } from "react";

import { Lockup } from "@/components/Logo";
import { C, FONT, shortKey } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState, Session, SessionRole } from "@/lib/types";

export type Screen = "overview" | "upload" | "buyer" | "quote" | "anchor" | "board" | "pay" | "settle" | "market" | "invoices" | "stats" | "wallet";
export const SCREENS: Screen[] = ["overview", "upload", "buyer", "quote", "anchor", "pay", "board", "settle"];

const DOTS = [C.mint, C.blue, C.coral, C.blue, C.amber, C.green, C.mint, C.lime];

/**
 * Which role acts on each screen.
 *
 * A screen outside the session's role is dimmed rather than disabled: the data
 * on it is still worth reading, and a judge should not have to sign in three
 * times to see the product. The gate that actually refuses is the route
 * handler, and the tooltip says which role it wants.
 */
const ACTS_AS: Partial<Record<Screen, SessionRole>> = {
  upload: "seller",
  buyer: "buyer",
  quote: "seller",
  anchor: "seller",
  pay: "funder",
  board: "funder",
  settle: "buyer",
};

export function PanelShell({
  lang,
  screen,
  setScreen,
  state,
  session,
  onSignOut,
  onTour,
  children,
}: {
  lang: Lang;
  screen: Screen;
  setScreen: (s: Screen) => void;
  state: AppState | null;
  session: Session | null;
  onSignOut: () => void;
  onTour: () => void;
  children: React.ReactNode;
}) {
  const d = t(lang);

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
          <a href="/" style={{ textDecoration: "none", color: C.ink, display: "flex" }}>
            <Lockup colour={C.ink} size={30} />
          </a>

          <nav className="panel-nav" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.nav.map((label, i) => {
              const target = SCREENS[i]!;
              const on = screen === target;
              const wants = ACTS_AS[target];
              const mine = !wants || !session || session.role === wants;
              return (
                <button
                  key={target}
                  onClick={() => {
                    setScreen(target);
                    window.scrollTo(0, 0);
                  }}
                  title={
                    mine ? undefined : d.needsRoleHint.replace("{role}", d.roles[wants!])
                  }
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
                    opacity: on || mine ? 1 : 0.42,
                    cursor: mine ? "pointer" : "not-allowed",
                    transition: "background .25s, opacity .25s",
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
            <button
              onClick={onTour}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                border: 0,
                borderRadius: 999,
                padding: "9px 15px",
                background: C.ink,
                color: C.white,
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.mint,
                  animation: "pulse 2s infinite",
                }}
              />
              {d.tour}
            </button>
            <LangPills lang={lang} />
            <LedgerCounter />
            <AccountMenu
              lang={lang}
              state={state}
              session={session}
              onSignOut={onSignOut}
              setScreen={setScreen}
            />
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

/** Shared heading for every screen. */
export function ScreenHead({
  step,
  title,
  lead,
  right,
}: {
  step: string;
  title: string;
  lead?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 22,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "start",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
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
      {right}
    </div>
  );
}

/** Language is a query parameter, so the panel link carries it like the site does. */
function LangPills({ lang }: { lang: Lang }) {
  return (
    <div style={{ display: "flex", padding: 3, borderRadius: 999, background: "rgba(255,255,255,.4)" }}>
      {(["tr", "en"] as const).map((l) => (
        <a
          key={l}
          href={l === "en" ? "/app" : `/app?lang=${l}`}
          style={{
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            color: lang === l ? C.white : C.ink,
            background: lang === l ? C.ink : "transparent",
          }}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );
}

/** The network's latest ledger, polled. A live number, not an animated one. */
function LedgerCounter() {
  const [ledger, setLedger] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const res = await fetch("/api/ledger", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; sequence?: number };
        if (alive && json.ok && json.sequence) setLedger(json.sequence);
      } catch {
        /* a missed tick leaves the previous number on screen */
      }
    };
    void read();
    const iv = setInterval(read, 6000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 700,
        padding: "8px 14px",
        borderRadius: 999,
        background: C.white,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: C.mint,
          animation: "pulse 2s infinite",
        }}
      />
      <span style={{ fontFamily: FONT.mono }}>
        #{ledger === null ? "……" : ledger.toLocaleString("en-US")}
      </span>
    </span>
  );
}

function AccountMenu({
  lang,
  state,
  session,
  onSignOut,
  setScreen,
}: {
  lang: Lang;
  state: AppState | null;
  session: Session | null;
  onSignOut: () => void;
  setScreen: (s: Screen) => void;
}) {
  const d = t(lang);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const name = session?.name ?? session?.role ?? "—";
  const initials =
    (name.match(/\p{L}+/gu) ?? [name])
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "P";

  const rows: {
    label: string;
    meta: string;
    icon: string;
    bg: string;
    fg: string;
    go?: Screen;
  }[] = [
    {
      label: d.acct[0][0],
      meta: session ? shortKey(session.address, 4, 4) : d.walletNone,
      icon: "◎",
      bg: session ? C.mint : "rgba(245,165,36,.25)",
      fg: C.ink,
      go: "wallet",
    },
    { label: d.acct[1][0], meta: d.acct[1][1], icon: "₺", bg: C.blue, fg: C.white },
    {
      label: d.acct[2][0],
      meta: `${state?.invoices.length ?? 0} ${d.acct[2][1]}`,
      icon: "#",
      bg: C.paper,
      fg: C.ink,
      go: "invoices",
    },
    {
      label: d.statsLabel,
      meta: `${state?.invoices.length ?? 0} ${d.acct[2][1]}`,
      icon: "▤",
      bg: C.lime,
      fg: C.ink,
      go: "stats",
    },
    {
      label: d.marketLabel,
      meta: lang === "tr" ? "rakamlar ve karşılaştırma" : "figures and the comparison",
      icon: "◈",
      bg: C.coral,
      fg: C.white,
      go: "market",
    },
    { label: d.acct[4][0], meta: state?.treasury.mode ?? "—", icon: "◉", bg: C.ink, fg: C.mint },
  ];

  return (
    <div style={{ position: "relative" }} ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: C.white,
          border: 0,
          borderRadius: 999,
          padding: "5px 5px 5px 6px",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#F5F3EE,#CFCBC2)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {initials}
        </span>
        {name}
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: C.paper,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: 290,
            background: C.white,
            borderRadius: 22,
            padding: 10,
            boxShadow: "0 30px 70px rgba(0,0,0,.28)",
            zIndex: 40,
            display: "grid",
            gap: 4,
          }}
        >
          {rows.map((r) => (
            <button
              key={r.label}
              onClick={() => {
                if (!r.go) return;
                setScreen(r.go);
                setOpen(false);
                window.scrollTo(0, 0);
              }}
              disabled={!r.go}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 10px",
                borderRadius: 14,
                border: 0,
                background: "transparent",
                textAlign: "left",
                width: "100%",
                opacity: 1,
                cursor: r.go ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: r.bg,
                  color: r.fg,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flex: "none",
                }}
              >
                {r.icon}
              </span>
              <span style={{ display: "grid", minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10.5,
                    color: C.grey,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.meta}
                </span>
              </span>
              {r.go && <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.4 }}>↗</span>}
            </button>
          ))}
          <button
            onClick={onSignOut}
            style={{
              marginTop: 4,
              border: 0,
              borderRadius: 14,
              padding: "12px 10px",
              background: C.ink,
              color: C.white,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {d.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
