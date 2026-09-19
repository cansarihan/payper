import { C } from "@/lib/design";

/**
 * The payper mark: two waves, the lower one at half opacity of the same
 * colour. One colour only — the brand rules forbid a gradient, a rotation or
 * a frame, so the drawing is fixed here and callers choose the colour.
 */
export function Mark({ colour = C.mint, size = 26 }: { colour?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 110 110"
      width={size}
      height={size}
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      <path
        d="M8 42 C26 22 38 62 56 42 C74 22 86 62 104 42"
        fill="none"
        stroke={colour}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M8 76 C26 56 38 96 56 76 C74 56 86 96 104 76"
        fill="none"
        stroke={colour}
        strokeWidth="13"
        strokeLinecap="round"
        strokeOpacity=".5"
      />
    </svg>
  );
}

/**
 * Mark and wordmark set together. The icon stands at twice the wordmark's
 * x-height and the gap is 32% of the icon width, as the brand rules specify.
 */
export function Lockup({ colour = C.mint, size = 26 }: { colour?: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 }}>
      <Mark colour={colour} size={size} />
      <span
        style={{
          fontWeight: 800,
          fontSize: size * 0.84,
          letterSpacing: "-.055em",
          textTransform: "lowercase",
          color: colour,
          lineHeight: 1,
        }}
      >
        payper
      </span>
    </span>
  );
}
