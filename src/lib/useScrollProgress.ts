"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Progress of a tall section through the viewport, 0 → 1.
 *
 * Mirrors the prototype scroll handler: a `lead` of ¾ of the viewport means a
 * section starts animating before its top reaches the fold, so the first frame
 * a reader sees is already in motion rather than snapping.
 *
 * Values are quantised to 1/100 so a scroll only re-renders when something
 * would actually look different.
 */
export function useScrollProgress<T extends HTMLElement>(
  leadFactor = 0.75,
): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const lead = window.innerHeight * leadFactor;
      const total = r.height - window.innerHeight;
      const p = Math.max(0, Math.min(1, (lead - r.top) / Math.max(1, total + lead)));
      const q = Math.round(p * 100) / 100;
      setProgress((prev) => (prev === q ? prev : q));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [leadFactor]);

  return [ref, progress];
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Cubic ease-out, the growth curve for the podium bars. */
export const easeOut = (v: number) => 1 - Math.pow(1 - v, 3);
