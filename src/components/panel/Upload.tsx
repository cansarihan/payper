"use client";

import { useRef, useState } from "react";

import { C, FONT, trLira } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import { signPrepared } from "@/lib/wallet/sign";
import { ScreenHead } from "./Shell";

const SAMPLES = [
  { variant: "video", file: "fatura-A.xml", note: "89 days · 50.000,00 ₺" },
  { variant: "video-copy", file: "fatura-A-kopya.xml", note: "same ETTN · 180.000,00 ₺" },
  { variant: "primary", file: "GIB2026000000481.xml", note: "90 days" },
  { variant: "secondary", file: "GIB2026000000512.xml", note: "60 days" },
  { variant: "duplicate", file: "GIB2026000000481-KOPYA.xml", note: "same ETTN" },
];

interface Check {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
}

interface Result {
  ok?: boolean;
  stage?: string;
  error?: string;
  heldBy?: number | null;
  checks?: Check[];
  registered?: { id: number; hash: string } | null;
  /** Present when the supplier asked to sign the registration themselves. */
  prepared?: { xdr: string; method: string; summary: string } | null;
  document?: {
    ettn: string;
    docHash: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    amountMinor: string;
    currency: string;
    seller: { taxId: string; name: string };
    buyer: { taxId: string; name: string };
  };
}

/** Document verification, ending in the ETTN check the whole product rests on. */
export function Upload({
  lang,
  network,
  walletAddress,
  onRegistered,
}: {
  lang: Lang;
  network: string;
  /** Present when the session arrived with its own wallet. */
  walletAddress?: string;
  onRegistered: (id: number) => void;
}) {
  const d = t(lang);
  const input = useRef<HTMLInputElement>(null);
  const [buyerIsWallet, setBuyerIsWallet] = useState(false);
  const [sellerIsWallet, setSellerIsWallet] = useState(false);
  const [buyerAddress, setBuyerAddress] = useState("");
  const [session] = useState(() => `s${Date.now().toString(36)}`);
  const [busy, setBusy] = useState<"inspect" | "register" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function send(f: File, inspect: boolean) {
    setBusy(inspect ? "inspect" : "register");
    setFatal(null);
    try {
      const body = new FormData();
      body.append("file", f);
      if (inspect) body.append("inspect", "1");
      // Naming the connected wallet as the buyer is what lets that wallet
      // acknowledge the invoice itself, instead of a server key doing it.
      if (!inspect && buyerIsWallet) body.append("buyerIsWallet", "1");
      if (!inspect && sellerIsWallet) body.append("sellerIsWallet", "1");
      // A named buyer lets the acknowledgement come from a different wallet on a
      // different machine, which is what a two-party demo actually looks like.
      if (!inspect && buyerAddress.trim()) body.append("buyerAddress", buyerAddress.trim());
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as Result;
      // A refusal with nothing to render would otherwise leave the screen
      // unchanged, which reads as a dead click.
      if (!json.ok && !json.stage) {
        setFatal(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json);

      // The supplier asked to sign it themselves: the server prepared the call
      // and signed nothing, so the wallet is what puts it on the ledger.
      if (json.ok && json.prepared && walletAddress) {
        const signed = await signPrepared(json.prepared.xdr, walletAddress, network);
        const sent = await fetch("/api/tx/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signedXdr: signed, method: json.prepared.method }),
        });
        const out = (await sent.json()) as { ok: boolean; hash?: string; error?: string };
        if (!out.ok) throw new Error(out.error ?? "The registration was not accepted");
        setResult({ ...json, prepared: null, registered: { id: 0, hash: out.hash ?? "" } });
        onRegistered(0);
        return;
      }

      if (json.ok && json.registered) onRegistered(json.registered.id);
    } catch (e) {
      setFatal((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pickSample(variant: string, name: string) {
    setResult(null);
    setFatal(null);
    const res = await fetch(`/api/demo-invoice?variant=${variant}&session=${session}`);
    if (!res.ok) {
      setFatal(`Sample could not be generated: ${name}`);
      return;
    }
    const f = new File([await res.blob()], name, { type: "application/xml" });
    setFile(f);
    await send(f, true);
  }

  function take(f: File | undefined) {
    if (!f) return;
    setResult(null);
    setFile(f);
    void send(f, true);
  }

  const doc = result?.document;
  const duplicate = result?.stage === "ettn";
  const verified = result?.ok === true && !result.registered;
  const registered = result?.registered ?? null;
  const scanning = busy === "inspect";

  const border = duplicate
    ? C.coral
    : verified || registered
      ? C.lime
      : drag || scanning
        ? C.mint
        : "rgba(10,10,10,.22)";

  return (
    <div style={{ animation: "rise .4s both" }}>
      <ScreenHead step={`${d.step} 1 · register`} title={d.uploadTitle} lead={d.uploadLead} />

      {fatal && (
        <div
          style={{
            marginBottom: 16,
            padding: "13px 15px",
            borderRadius: 16,
            background: "rgba(255,95,87,.12)",
            color: C.coral,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.5,
            overflowWrap: "anywhere",
          }}
        >
          {fatal}
        </div>
      )}

      <div data-tour="up-split" className="up-split" style={{ display: "grid", gap: 20, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              take(e.dataTransfer.files?.[0]);
            }}
            onClick={() => input.current?.click()}
            style={{
              background: C.white,
              borderRadius: 28,
              border: `2px dashed ${border}`,
              padding: "44px 24px 38px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color .3s",
            }}
          >
            <input
              ref={input}
              type="file"
              accept=".xml,application/xml,text/xml"
              hidden
              onChange={(e) => take(e.target.files?.[0] ?? undefined)}
            />
            <div
              style={{
                width: 68,
                height: 68,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: duplicate ? C.coral : verified || registered ? C.lime : C.mint,
                color: C.ink,
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 800,
                animation: scanning ? "pulse 1.2s infinite" : undefined,
              }}
            >
              XML
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>
              {file ? file.name : d.dropzone}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.55, marginTop: 6 }}>{d.dropzoneSub}</div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".06em",
                opacity: 0.55,
                marginBottom: 10,
              }}
            >
              <span>{d.demoFiles}</span>
              <span>
                {SAMPLES.length} {d.files}
              </span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {SAMPLES.map((s) => {
                const active = file?.name === s.file;
                return (
                  <button
                    key={s.variant}
                    onClick={() => void pickSample(s.variant, s.file)}
                    disabled={busy !== null}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px minmax(0,1fr) auto",
                      alignItems: "center",
                      gap: 14,
                      textAlign: "left",
                      background: active ? C.ink : C.white,
                      color: active ? C.white : C.ink,
                      border: 0,
                      borderRadius: 18,
                      padding: "12px 14px",
                      transform: `translateX(${active ? 8 : 0}px)`,
                      transition: "transform .3s, background .3s",
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: s.variant === "duplicate" ? "rgba(255,95,87,.16)" : C.paper,
                        color: s.variant === "duplicate" ? C.coral : C.ink,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {s.variant === "duplicate" ? "!" : "XML"}
                    </span>
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 12.5, fontWeight: 600 }}>
                        {s.file}
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.55 }}>{s.note}</span>
                    </span>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: active ? C.mint : C.paper,
                        color: C.ink,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                      }}
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* what the document turned out to be */}
        <div style={{ display: "grid", gap: 16 }}>
          {!doc && !scanning && (
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
              {d.empty}
            </div>
          )}

          {scanning && (
            <div style={{ background: C.white, borderRadius: 28, padding: 26, display: "grid", gap: 12 }}>
              {[70, 45, 85, 60].map((w, i) => (
                <span
                  key={i}
                  style={{
                    height: 14,
                    width: `${w}%`,
                    borderRadius: 7,
                    background:
                      "linear-gradient(90deg,#EFEFEA,#E2E2DC,#EFEFEA)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s linear infinite",
                  }}
                />
              ))}
            </div>
          )}

          {doc && (
            <div style={{ background: C.white, borderRadius: 28, overflow: "hidden" }}>
              <div
                style={{
                  background: duplicate ? C.coral : C.ink,
                  color: C.white,
                  padding: "16px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 15 }}>{doc.invoiceNumber}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 11.5, opacity: 0.8 }}>
                  {duplicate ? d.rejected : registered ? `#${registered.id} · ${d.registered}` : d.documentTitle}
                </span>
              </div>

              <div style={{ padding: 22, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                  <Tile k={d.amount} v={trLira(doc.amountMinor)} big />
                  <Tile k={d.due} v={doc.dueDate} />
                  <Tile k={d.issued} v={doc.issueDate} />
                </div>

                <Row k={d.ettn} v={doc.ettn} mono />
                <Row k={d.docHash} v={`${doc.docHash.slice(0, 24)}…`} mono />
                <Row k={d.seller} v={`${doc.seller.name} · ${doc.seller.taxId}`} />
                <Row k={d.buyer} v={`${doc.buyer.name} · ${doc.buyer.taxId}`} />

                <div style={{ marginTop: 4, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", opacity: 0.55 }}>
                    {d.checks.toUpperCase()}
                  </div>
                  {result?.checks?.map((c, i) => (
                    <div
                      key={c.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "24px minmax(0,1fr)",
                        gap: 12,
                        alignItems: "start",
                        animation: "blurInA .4s both",
                        animationDelay: `${i * 0.08}s`,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: c.pass ? C.lime : C.coral,
                          color: c.pass ? C.ink : C.white,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {c.pass ? "✓" : "✕"}
                      </span>
                      <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                        <span
                          style={{
                            fontFamily: FONT.mono,
                            fontSize: 11,
                            opacity: 0.55,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {c.detail}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {duplicate && (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "rgba(255,95,87,.1)",
                      color: C.coral,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.55,
                    }}
                  >
                    {result?.error}
                    {result?.heldBy ? ` (#${result.heldBy})` : ""}
                  </div>
                )}

                {registered ? (
                  <a
                    href={`https://stellar.expert/explorer/${
                      network === "mainnet" ? "public" : "testnet"
                    }/tx/${registered.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      color: C.green,
                      textDecoration: "none",
                    }}
                  >
                    {registered.hash.slice(0, 16)}… ↗
                  </a>
                ) : (
                  !duplicate && (
                    <>
                    {walletAddress && (
                      <button
                        onClick={() => setSellerIsWallet((v) => !v)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: `1px solid ${sellerIsWallet ? C.ink : "rgba(10,10,10,.16)"}`,
                          background: sellerIsWallet ? C.mint : "transparent",
                          borderRadius: 16,
                          padding: "11px 14px",
                          marginBottom: 9,
                          fontSize: 12.5,
                          fontWeight: 600,
                          lineHeight: 1.45,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>
                          {sellerIsWallet ? "☑" : "☐"} {d.sellerIsWallet}
                        </span>
                        <br />
                        <span style={{ opacity: 0.7, fontWeight: 500 }}>{d.sellerIsWalletNote}</span>
                      </button>
                    )}
                    <input
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      placeholder={d.buyerAddressPlaceholder}
                      spellCheck={false}
                      style={{
                        width: "100%",
                        border: `1px solid ${buyerAddress.trim() ? C.ink : "rgba(10,10,10,.16)"}`,
                        borderRadius: 16,
                        padding: "11px 14px",
                        marginBottom: 9,
                        fontFamily: FONT.mono,
                        fontSize: 11.5,
                        background: "transparent",
                      }}
                    />
                    <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 9, lineHeight: 1.45 }}>
                      {d.buyerAddressNote}
                    </div>
                    {walletAddress && (
                      <button
                        onClick={() => setBuyerIsWallet((v) => !v)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: `1px solid ${buyerIsWallet ? C.ink : "rgba(10,10,10,.16)"}`,
                          background: buyerIsWallet ? C.mint : "transparent",
                          borderRadius: 16,
                          padding: "11px 14px",
                          marginBottom: 9,
                          fontSize: 12.5,
                          fontWeight: 600,
                          lineHeight: 1.45,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>
                          {buyerIsWallet ? "☑" : "☐"} {d.buyerIsWallet}
                        </span>
                        <br />
                        <span style={{ opacity: 0.7, fontWeight: 500 }}>{d.buyerIsWalletNote}</span>
                      </button>
                    )}
                    <button
                      onClick={() => file && void send(file, false)}
                      disabled={busy !== null}
                      style={{
                        width: "100%",
                        border: 0,
                        borderRadius: 999,
                        padding: "14px 24px",
                        background: busy ? "rgba(10,10,10,.12)" : C.ink,
                        color: busy ? C.ink : C.white,
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      {busy === "register" ? `${d.loading}…` : d.register}
                    </button>
                    </>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Tile = ({ k, v, big }: { k: string; v: string; big?: boolean }) => (
  <div style={{ padding: "13px 15px", borderRadius: 16, background: "#F7F7F5" }}>
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
    <div style={{ fontSize: big ? 21 : 15, fontWeight: 700, letterSpacing: "-.02em" }}>{v}</div>
  </div>
);

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 14,
      padding: "10px 12px",
      borderRadius: 12,
      background: "#F7F7F5",
      fontSize: 12.5,
    }}
  >
    <span style={{ opacity: 0.55, fontWeight: 600, whiteSpace: "nowrap" }}>{k}</span>
    <span
      style={{
        fontFamily: mono ? FONT.mono : undefined,
        fontWeight: 600,
        textAlign: "right",
        overflowWrap: "anywhere",
      }}
    >
      {v}
    </span>
  </div>
);
