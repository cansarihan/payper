import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const DESCRIPTION =
  "A supplier uploads a term e-invoice, the buyer acknowledges it on chain, and the money arrives the same day as fiat in a bank account. Built on Soroban with a SEP-6 anchor.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "https://payper.live"),
  title: "payper · on-chain receivable financing",
  description: DESCRIPTION,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-16.svg", type: "image/svg+xml" },
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/icon-256.png",
  },
  openGraph: {
    title: "payper · on-chain receivable financing",
    description: DESCRIPTION,
    locale: "en",
    type: "website",
    images: [{ url: "/brand/lockup-on-ink-1040.png", width: 1040, height: 1040, alt: "payper" }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/lockup-on-ink-1040.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
