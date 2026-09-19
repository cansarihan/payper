import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const DESCRIPTION =
  "A supplier uploads a term e-invoice, the buyer acknowledges it on chain, and the money arrives the same day as fiat in a bank account. Built on Soroban with a SEP-6 anchor.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "https://payper.live"),
  title: "Payper · on-chain receivable financing",
  description: DESCRIPTION,
  openGraph: {
    title: "Payper · on-chain receivable financing",
    description: DESCRIPTION,
    locale: "en",
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
    <html lang="en">
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
