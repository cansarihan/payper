"use client";

/**
 * Where the pooled capital sits, and how the rate that prices it is arrived at.
 *
 * The hash comparison is the reason this screen exists. "We integrated
 * DeFindex" is a claim; two hashes that match, read from the ledger and from
 * their own manifest, is not. The same two reads are printed underneath so a
 * reader can repeat them without trusting the page.
 */
import { useEffect, useState } from "react";

import { C, FONT, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState } from "@/lib/types";
import { ScreenHead } from "./Shell";

interface Data {
  network: string;
  vault: {
    id: string;
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    totalSupply: string | null;
    ourShares: string | null;
  };
  adapter: { id: string };
  blend: { pool: string; bps: number | null };
  yield: { bps: number; source: string } | null;
  proof: { deployedWasm: string | null; publishedWasm: string | null; matches: boolean };
}

const short = (s: string, head = 6, tail = 4) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

export function Treasury({ lang, state }: { lang: Lang; state: AppState }) {
  const d = t(lang);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/treasury", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok: boolean; error?: string } & Data) =>
        j.ok ? setData(j) : setError(j.error ?? "could not read the treasury"),
      )
      .catch((e: Error) => setError(e.message));
  }, []);

  const link = (id: string) =>
    `https://stellar.expert/explorer/${data?.network ?? "testnet"}/contract/${id}`;

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={d.treasuryStep} title={d.treasuryTitle} lead={d.treasuryLead} />

      {error && (
        <div style={{ padding: "13px 15px", borderRadius: 16, background: "rgba(255,95,87,.12)",
          color: C.coral, fontSize: 12.5, fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {/* the position */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 24, padding: 22 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: ".06em",
            color: "rgba(255,255,255,.55)", marginBottom: 12 }}>{d.treasuryPosition}</div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.03em", color: C.mint }}>
            {usdc(state.treasury.assets, 2)} USDC
          </div>
          <div style={{ display: "grid", gap: 7, marginTop: 16, fontSize: 12.5 }}>
            <Row k={d.treasuryShares} v={data?.vault.ourShares ? usdc(data.vault.ourShares, 4) : "—"} dark />
            <Row k={d.treasurySupply} v={data?.vault.totalSupply ? usdc(data.vault.totalSupply, 4) : "—"} dark />
            <Row k={d.firstLossLabel} v={`${usdc(state.treasury.firstLoss, 2)} USDC`} dark />
          </div>
        </div>

        {/* the rate */}
        <div style={{ background: C.paper, borderRadius: 24, padding: 22 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: ".06em",
            color: "#6A6A6A", marginBottom: 12 }}>{d.treasuryRate}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.03em" }}>
              {data?.yield ? `%${(data.yield.bps / 100).toFixed(2)}` : "—"}
            </span>
            {data?.yield && (
              <span style={{ fontFamily: FONT.mono, fontSize: 10.5, fontWeight: 700,
                padding: "2px 8px", borderRadius: 999,
                background: data.yield.source === "live" ? C.mint : "rgba(10,10,10,.1)" }}>
                {data.yield.source}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3A4A42", margin: "12px 0 0" }}>
            {d.treasuryRateNote}
          </p>
          <div style={{ marginTop: 12, fontSize: 12.5 }}>
            <Row k={d.treasuryBlendPool} v={short(data?.blend.pool ?? "—")} href={data ? link(data.blend.pool) : undefined} />
          </div>
        </div>
      </div>

      {/* the proof */}
      <div style={{ marginTop: 14, borderRadius: 24, padding: 22,
        background: data?.proof.matches ? C.mint : C.paper }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>{data?.proof.matches ? "✓" : "·"}</span>
          <span style={{ fontSize: 15.5, fontWeight: 700 }}>
            {data?.proof.matches ? d.treasuryProofOk : d.treasuryProof}
          </span>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 12px", maxWidth: 620 }}>
          {d.treasuryProofNote}
        </p>
        <div style={{ display: "grid", gap: 7 }}>
          <Hash k={d.treasuryOnChain} v={data?.proof.deployedWasm} />
          <Hash k={d.treasuryPublished} v={data?.proof.publishedWasm} />
        </div>
      </div>

      {/* what it is */}
      <div style={{ marginTop: 14, background: C.white, borderRadius: 24, padding: 22 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 12 }}>{d.treasuryVault}</div>
        <div style={{ display: "grid", gap: 7, fontSize: 12.5 }}>
          <Row k={d.treasuryName} v={data?.vault.name ?? "—"} />
          <Row k={d.treasurySymbol} v={`${data?.vault.symbol ?? "—"} · ${data?.vault.decimals ?? "—"} decimals`} />
          <Row k={d.treasuryVaultId} v={short(data?.vault.id ?? "—", 8, 6)} href={data ? link(data.vault.id) : undefined} />
          <Row k={d.treasuryAdapter} v={short(data?.adapter.id ?? "—", 8, 6)} href={data ? link(data.adapter.id) : undefined} />
        </div>
      </div>

      {/* repeat it yourself */}
      <div style={{ marginTop: 14, background: C.ink, color: "#E8E8E8", borderRadius: 24,
        padding: "18px 20px", fontFamily: FONT.mono, fontSize: 10.5, lineHeight: 1.7,
        overflowX: "auto", whiteSpace: "pre" }}>
        <div style={{ color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{d.treasuryRepeat}</div>
{`curl -s https://api.stellar.expert/explorer/testnet/contract/${data?.vault.id ?? ""} | grep -o '"wasm":"[a-f0-9]*"'
curl -s https://raw.githubusercontent.com/paltalabs/defindex/main/public/testnet.contracts.json | grep -A3 hashes
stellar contract invoke --id ${data?.adapter.id ?? ""} --source payper-admin --network testnet -- blend_apy_bps`}
      </div>
    </div>
  );
}

function Row({ k, v, dark, href }: { k: string; v: string; dark?: boolean; href?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: dark ? "rgba(255,255,255,.6)" : "#6A6A6A" }}>{k}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer"
          style={{ fontFamily: FONT.mono, fontWeight: 600, color: dark ? C.mint : C.green, textDecoration: "none" }}>
          {v} ↗
        </a>
      ) : (
        <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{v}</span>
      )}
    </div>
  );
}

function Hash({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", opacity: 0.6 }}>{k}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 10.5, wordBreak: "break-all" }}>{v ?? "—"}</div>
    </div>
  );
}
