"use client";

import { LANGS, type Lang } from "@/lib/i18n/dictionary";
import { C, FONT } from "@/lib/design";

/** Language is a query parameter, so a link can carry it and a crawler sees both. */
export function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(255,255,255,.07)",
      }}
    >
      {LANGS.map((l) => (
        <a
          key={l}
          href={l === "en" ? "/" : `/?lang=${l}`}
          style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em",
            padding: "5px 11px",
            borderRadius: 999,
            textDecoration: "none",
            background: lang === l ? C.mint : "transparent",
            color: lang === l ? C.ink : "rgba(255,255,255,.6)",
          }}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
