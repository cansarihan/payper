"use client";

import { useEffect, useState } from "react";

import { C } from "@/lib/design";

/**
 * QR for a SEP-7 payment URI.
 *
 * Encoded here rather than pulled from a service: a payment request should not
 * leave the machine to become a picture. A byte-mode symbol with error
 * correction level M holds the URI comfortably, and `badge` survives it because
 * level M tolerates the occlusion.
 */
export function QrCode({
  value,
  size = 232,
  radius = 14,
  badge,
}: {
  value: string;
  size?: number;
  radius?: number;
  /** Centre overlay, e.g. the wordmark. Kept small so the symbol stays readable. */
  badge?: React.ReactNode;
}) {
  const [matrix, setMatrix] = useState<boolean[][] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const mod = await import("qrcode");
      const qr = mod.create(value, { errorCorrectionLevel: "M" });
      const n = qr.modules.size;
      const data = qr.modules.data;
      const rows: boolean[][] = [];
      for (let y = 0; y < n; y++) {
        const row: boolean[] = [];
        for (let x = 0; x < n; x++) row.push(data[y * n + x] === 1);
        rows.push(row);
      }
      if (alive) setMatrix(rows);
    })();
    return () => {
      alive = false;
    };
  }, [value]);

  if (!matrix) {
    return <div style={{ width: size, height: size, borderRadius: radius, background: C.paper }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${matrix.length},1fr)`,
        width: size,
        height: size,
        padding: 12,
        borderRadius: radius,
        background: C.white,
      }}
    >
      {matrix.flatMap((row, y) =>
        row.map((on, x) => (
          <span key={`${x}-${y}`} style={{ background: on ? C.ink : C.white }} />
        )),
      )}
      {badge && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
