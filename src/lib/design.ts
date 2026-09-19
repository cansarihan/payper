/** Tokens, so a colour is named once. */
export const C = {
  ink: "#0A0A0A",
  black: "#050505",
  panel: "#1C1C1E",
  white: "#FFFFFF",
  paper: "#F2F2F0",
  mint: "#3DE29C",
  lime: "#B9F03A",
  blue: "#1E7CFF",
  coral: "#FF5F57",
  amber: "#F5A524",
  green: "#1A8F63",
  grey: "#8A8A8A",
} as const;

export const FONT = {
  sans: "'Urbanist', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono',ui-monospace,Menlo,monospace",
} as const;

const tr = (n: number, digits = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const trNumber = (n: number, digits = 2) => tr(n, digits);

/** Fiat minor units in, lira out. */
export const trLira = (minor: bigint | string, digits = 2) =>
  `${tr(Number(minor) / 100, digits)} ₺`;

/** Stroops in, asset out. */
export const usdc = (stroops: bigint | string, digits = 2) =>
  `${tr(Number(stroops) / 1e7, digits)} USDC`;

export const trPct = (bps: number) => `%${tr(bps / 100, 2)}`;

export const shortKey = (key: string, head = 4, tail = 4) =>
  key.length > head + tail ? `${key.slice(0, head)}…${key.slice(-tail)}` : key;

/** Anchor mid rate, or null. No fallback: every fiat figure derives from it. */
export const liveRate = (anchor: { rates: { mid_rate: string } | null } | null): number | null => {
  const rate = Number(anchor?.rates?.mid_rate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};
