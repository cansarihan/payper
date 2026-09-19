import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const DESCRIPTION =
  "Türk KOBİ'si vadeli e-faturasını yükler, alıcı zincir üstünde onaylar, para bugün TL olarak banka hesabına geçer. Soroban ve SEP-6 anchor üzerine kurulu.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "https://payper.live"),
  title: "Payper · zincir üstü alacak finansmanı",
  description: DESCRIPTION,
  openGraph: {
    title: "Payper · zincir üstü alacak finansmanı",
    description: DESCRIPTION,
    locale: "tr_TR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
