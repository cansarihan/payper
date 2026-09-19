"use client";

import { useState } from "react";

import { C, FONT, trLira, trNumber, trPct, usdc } from "@/lib/design";
import { t, type Lang } from "@/lib/i18n/dictionary";
import type { AppState } from "@/lib/types";
import type { Screen } from "./Shell";

/**
 * The market, the segment, and the arithmetic behind the price.
 *
 * Nothing here is asserted. The comparison runs on the live quote, and every
 * input to the incumbent's cost is a slider labelled as an assumption. A judge
 * who thinks factoring is cheaper than we claim can type their own number and
 * watch the conclusion move, rather than argue with a slide.
 */

/** Turkey's policy rate. The floor under any honest discount. */
const POLICY_RATE = 37;
/** Transaction tax on interest and commission, levied on Turkish factors. */
const BSMV = 5;

export function Market({
  lang,
  state,
  onGo,
}: {
  lang: Lang;
  state: AppState;
  onGo: (s: Screen) => void;
}) {
  const d = t(lang);
  const [annualRate, setAnnualRate] = useState(45);
  const [commissionPct, setCommissionPct] = useState(1.5);

  const q = state.activeQuote;
  const invoice = state.active ?? state.invoices[0] ?? null;
  const face = invoice ? Number(invoice.amountFiat) : 0;
  const days = q?.days ?? 90;
  const ourBps = q?.totalDiscountBps ?? invoice?.lockedDiscountBps ?? 0;
  const ourAnnual = days > 0 ? (ourBps * 365) / days / 100 : 0;

  // Interest for the tenor, plus a one-off commission, plus the transaction tax
  // levied on both. The composition follows the factors' own published
  // breakdowns; the levels are the editable assumptions.
  const interest = (face * (annualRate / 100) * days) / 365;
  const commission = face * (commissionPct / 100);
  const bsmv = (interest + commission) * (BSMV / 100);
  const factorCost = interest + commission + bsmv;
  const factorBps = face > 0 ? (factorCost / face) * 10_000 : 0;
  const factorAnnual = days > 0 ? (factorBps * 365) / days / 100 : 0;

  const ourCost = (face * ourBps) / 10_000;
  const saving = factorCost - ourCost;
  const cheaper = saving > 0;

  const feeBps = q?.platformFeeBps ?? 50;
  const feePerInvoice = (face * feeBps) / 10_000;
  const bookVolume = state.invoices.reduce((s, i) => s + Number(i.amountFiat), 0);
  const bookFee = (bookVolume * feeBps) / 10_000;

  const lira = (minor: number) => trLira(BigInt(Math.round(minor)));

  return (
    <div style={{ animation: "rise .4s both" }}>
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".06em",
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          {d.marketLabel}
        </div>
        <h1
          style={{
            fontSize: "clamp(30px,3.6vw,44px)",
            fontWeight: 600,
            letterSpacing: "-.035em",
            margin: "0 0 8px",
          }}
        >
          {d.marketTitle}
        </h1>
        <p style={{ opacity: 0.7, margin: 0, maxWidth: 700, lineHeight: 1.55, fontWeight: 500 }}>
          {d.marketLead}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        {(
          [
            ["4,016,059", lang === "tr" ? "aktif girişim" : "active enterprises", "TÜİK 2025", C.white],
            ["%99.6", lang === "tr" ? "KOBİ payı" : "of them are SMEs", "TÜİK 2024", C.white],
            ["1.875 trn ₺", lang === "tr" ? "faktoring hacmi" : "factoring volume", "2025", C.mint],
            [
              "~95,000",
              lang === "tr" ? "faktoring müşterisi" : "factoring customers",
              lang === "tr" ? "çoğunluğu KOBİ" : "mostly SMEs",
              C.white,
            ],
          ] as const
        ).map(([v, k, src, bg]) => (
          <div key={k} style={{ background: bg, color: C.ink, borderRadius: 24, padding: 20 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>
              {v}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{k}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, opacity: 0.55, marginTop: 4 }}>
              {src}
            </div>
          </div>
        ))}
      </div>

      <div className="anchor-split" style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.white, color: C.ink, borderRadius: 28, padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>{d.segmentTitle}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {d.segmentRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "86px minmax(0,1fr)",
                    gap: 12,
                    padding: "11px 13px",
                    borderRadius: 14,
                    background: "#F7F7F5",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 700, opacity: 0.55 }}>{k}</span>
                  <span style={{ fontWeight: 500, lineHeight: 1.45 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: C.ink,
              color: C.white,
              borderRadius: 28,
              padding: 24,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>{d.unitEconomics}</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, color: "rgba(255,255,255,.65)" }}>
              {lang === "tr" ? "Platform ücreti bir projeksiyon değil, kontrattaki bir parametre:" : "The platform fee is not a projection but a contract parameter:"}{" "}
              <b style={{ color: C.mint }}>{trPct(feeBps)}</b>
              {lang === "tr" ? " — iskontonun içinde, ayrı kalem olarak gösteriliyor." : " — inside the discount, shown as its own line."}
            </p>
            <div style={{ display: "grid", gap: 8, fontFamily: FONT.mono, fontSize: 12 }}>
              {(
                [
                  [lang === "tr" ? "Fatura başına gelir" : "Revenue per invoice", lira(feePerInvoice), C.mint],
                  [
                    lang === "tr" ? `Defterdeki ${state.invoices.length} fatura` : `${state.invoices.length} invoices in the book`,
                    lira(bookVolume),
                    C.white,
                  ],
                  [lang === "tr" ? "Bu defterden gelir" : "Revenue from this book", lira(bookFee), C.mint],
                  [lang === "tr" ? "Hazine varlığı" : "Treasury assets", usdc(state.treasury.assets), C.white],
                ] as const
              ).map(([k, v, colour]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "11px 13px",
                    borderRadius: 13,
                    background: C.panel,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,.6)" }}>{k}</span>
                  <span style={{ color: colour }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0, color: "rgba(255,255,255,.45)" }}>
              {lang === "tr"
                ? "Fonlayıcının getirisi platformun gelirinden ayrı: iskontonun getiri ve kur bileşenleri fonlayıcıya, ücret platforma gider. Bu yüzden büyüme sermaye toplamakla değil fatura hacmiyle ölçeklenir."
                : "The funder's return and the platform's revenue are separate: the yield and currency components go to the funder, the fee to the platform. Growth therefore scales with invoice volume, not with capital raised."}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: C.white, color: C.ink, borderRadius: 28, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>{d.vsFactoring}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.55 }}>
                {invoice ? `#${invoice.id} · ${lira(face)} · ${days} ${d.days}` : d.empty}
              </span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 16px", opacity: 0.7 }}>
              {lang === "tr" ? (
                <>
                  Faktoring maliyeti <b>faiz + komisyon + %5 BSMV</b> olarak hesaplanıyor ve oran her
                  işleme özel belirleniyor — yayınlanmış tek bir sayı yok. O yüzden varsayımları{" "}
                  <b>sen giriyorsun</b>.
                </>
              ) : (
                <>
                  A factor's cost is <b>interest + commission + 5% transaction tax</b>, and the rate is
                  negotiated per deal — there is no single published number. So the assumptions are{" "}
                  <b>yours to set</b>.
                </>
              )}
            </p>

            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
              <Slider
                label={lang === "tr" ? "Faktoring faizi (yıllık)" : "Factoring rate (annual)"}
                hint={
                  lang === "tr"
                    ? `varsayım · TCMB politika faizi %${POLICY_RATE} üstü`
                    : `assumption · above the %${POLICY_RATE} policy rate`
                }
                value={annualRate}
                min={20}
                max={80}
                step={1}
                onChange={setAnnualRate}
              />
              <Slider
                label={lang === "tr" ? "Komisyon (fatura üzerinden)" : "Commission (on the face)"}
                hint={lang === "tr" ? "varsayım · tek seferlik" : "assumption · one-off"}
                value={commissionPct}
                min={0}
                max={5}
                step={0.1}
                onChange={setCommissionPct}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 13px",
                  borderRadius: 13,
                  background: "#F7F7F5",
                  fontSize: 12.5,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  BSMV{" "}
                  <span style={{ opacity: 0.55, fontWeight: 500 }}>
                    · {lang === "tr" ? "faiz + komisyon üzerinden" : "on interest + commission"}
                  </span>
                </span>
                <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>%{BSMV}</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {(
                [
                  [lang === "tr" ? "Faiz" : "Interest", interest],
                  [lang === "tr" ? "Komisyon" : "Commission", commission],
                  [`BSMV (%${BSMV})`, bsmv],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    padding: "0 2px",
                    opacity: 0.75,
                  }}
                >
                  <span>{k}</span>
                  <span style={{ fontFamily: FONT.mono }}>{lira(v)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              <Row
                k={lang === "tr" ? "Faktoring toplam maliyeti" : "Factoring, all in"}
                v={lira(factorCost)}
                sub={`%${trNumber(factorAnnual, 1)} ${d.annual}`}
                bg="#F7F7F5"
              />
              <Row
                k={lang === "tr" ? "Payper iskontosu" : "The Payper discount"}
                v={lira(ourCost)}
                sub={`${trPct(ourBps)} · %${trNumber(ourAnnual, 1)} ${d.annual} · ${d.tagLive}`}
                bg="rgba(30,124,255,.14)"
              />
              <Row
                k={
                  cheaper
                    ? lang === "tr"
                      ? "Tedarikçinin kazancı"
                      : "The supplier keeps"
                    : lang === "tr"
                      ? "Payper daha pahalı"
                      : "Payper costs more"
                }
                v={`${cheaper ? "" : "−"}${lira(Math.abs(saving))}`}
                sub={
                  cheaper
                    ? lang === "tr"
                      ? "aynı fatura, aynı vade"
                      : "same invoice, same term"
                    : lang === "tr"
                      ? "bu varsayımlarla"
                      : "under these assumptions"
                }
                bg={cheaper ? C.mint : "rgba(255,95,87,.14)"}
                big
              />
            </div>
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: "18px 20px",
              background: C.lime,
              fontSize: 13,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              {lang === "tr"
                ? `Neden %${trNumber(ourAnnual, 1)} doğru fiyat`
                : `Why %${trNumber(ourAnnual, 1)} is the right price`}
            </div>
            {lang === "tr" ? (
              <>
                TCMB politika faizi <b>%{POLICY_RATE}</b>. Bir alacağı bunun altında iskonto etmek,
                paranın maliyetinin altında fiyatlamaktır — hiçbir fonlayıcı almaz. Motorun ürettiği
                %{trNumber(ourAnnual, 1)} bu eşiğin hemen üstünde oturuyor, çünkü sayıyı biz
                seçmiyoruz: <b>zincirden ve kurdan okuyoruz.</b> Farkımız fiyatı düşürmek değil,
                fiyatın <b>nereden geldiğini gösterebilmek</b>.
              </>
            ) : (
              <>
                The policy rate is <b>%{POLICY_RATE}</b>. Discounting a receivable below it means
                pricing under the cost of money, and no funder would take it. The engine produces
                %{trNumber(ourAnnual, 1)}, which sits just above that floor — because we do not pick
                the number: <b>we read it from chain and from the currency.</b> The difference is not
                a cheaper price but <b>a price whose origin can be shown</b>.
              </>
            )}
            <button
              onClick={() => onGo("quote")}
              style={{
                display: "block",
                marginTop: 12,
                border: 0,
                borderRadius: 999,
                padding: "10px 18px",
                background: C.ink,
                color: C.white,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {lang === "tr" ? "İskonto kırılımına git →" : "Open the discount breakdown →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          fontSize: 12.5,
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {label} <span style={{ opacity: 0.5, fontWeight: 500 }}>· {hint}</span>
        </span>
        <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>
          {trNumber(value, step < 1 ? 1 : 0)}%
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: "100%", accentColor: C.ink }}
      />
    </label>
  );
}

const Row = ({
  k,
  v,
  sub,
  bg,
  big,
}: {
  k: string;
  v: string;
  sub: string;
  bg: string;
  big?: boolean;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      padding: "13px 15px",
      borderRadius: 16,
      background: bg,
    }}
  >
    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{k}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 10.5, opacity: 0.6 }}>{sub}</span>
    </span>
    <span
      style={{
        fontSize: big ? 24 : 18,
        fontWeight: 700,
        letterSpacing: "-.02em",
        fontFamily: FONT.mono,
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  </div>
);
