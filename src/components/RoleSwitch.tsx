"use client";

import { useState } from "react";

import { ROLE_LABEL, type SessionRole } from "@/lib/auth/roles";
import { C } from "@/lib/design";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Shown when an action belongs to a party the session is not signed in as.
 *
 * Three parties and one laptop, so hitting the wrong one is the normal case.
 * The server says which role it wanted; this turns that into the way out.
 */
export function RoleSwitch({
  lang,
  needsRole,
  message,
  onSwitched,
}: {
  lang: Lang;
  needsRole: SessionRole;
  message: string;
  onSwitched: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function become() {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: needsRole }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Could not switch role");
      onSwitched();
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(245,165,36,.16)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.55, color: "#8A5B00" }}>
        {message}
      </div>
      <button
        onClick={() => void become()}
        disabled={busy}
        style={{
          justifySelf: "start",
          border: 0,
          borderRadius: 999,
          padding: "10px 18px",
          background: C.ink,
          color: C.white,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {busy
          ? "…"
          : lang === "tr"
            ? `${ROLE_LABEL[needsRole]} olarak devam et →`
            : `Continue as ${ROLE_LABEL[needsRole]} →`}
      </button>
      {failed && <div style={{ fontSize: 11.5, color: C.coral, fontWeight: 600 }}>{failed}</div>}
    </div>
  );
}
