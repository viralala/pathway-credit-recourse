"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Decorative illustration: a loan screen whose fine print is under a magnifying glass that
 * reveals a percent sign. Purely decorative, hidden from assistive technology.
 */
export function HeroArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const float = reduce
    ? undefined
    : { animate: { y: [0, -6, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden focusable="false">
      <rect x="8" y="18" width="304" height="226" rx="36" fill="var(--pastel-lavender)" />
      <circle cx="268" cy="58" r="22" fill="var(--pastel-peach)" />
      <circle cx="42" cy="70" r="12" fill="var(--pastel-sky)" />

      {/* coins */}
      <g stroke="var(--deep-butter)" strokeWidth="2">
        <ellipse cx="58" cy="214" rx="28" ry="9" fill="var(--pastel-butter)" />
        <ellipse cx="58" cy="202" rx="28" ry="9" fill="var(--pastel-butter)" />
        <ellipse cx="58" cy="190" rx="28" ry="9" fill="var(--pastel-butter)" />
      </g>

      {/* phone with a loan offer */}
      <rect x="96" y="34" width="130" height="212" rx="22" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      <rect x="141" y="44" width="40" height="6" rx="3" fill="var(--muted)" />
      <rect x="114" y="68" width="94" height="16" rx="8" fill="var(--pastel-mint)" />
      <rect x="114" y="92" width="64" height="8" rx="4" fill="var(--muted)" />
      <rect x="114" y="108" width="80" height="8" rx="4" fill="var(--muted)" />
      <rect x="114" y="148" width="94" height="4" rx="2" fill="var(--border)" />
      <rect x="114" y="158" width="78" height="4" rx="2" fill="var(--border)" />
      <rect x="114" y="168" width="88" height="4" rx="2" fill="var(--border)" />
      <rect x="114" y="178" width="70" height="4" rx="2" fill="var(--border)" />
      <rect x="114" y="206" width="94" height="26" rx="13" fill="var(--pastel-periwinkle)" />

      {/* magnifier revealing the real rate */}
      <motion.g {...float}>
        <line x1="226" y1="190" x2="256" y2="220" stroke="var(--deep-periwinkle)" strokeWidth="11" strokeLinecap="round" />
        <circle cx="204" cy="166" r="34" fill="var(--card)" fillOpacity="0.92" stroke="var(--deep-periwinkle)" strokeWidth="6" />
        <circle cx="193" cy="155" r="6.5" fill="none" stroke="var(--deep-blush)" strokeWidth="3.5" />
        <circle cx="215" cy="177" r="6.5" fill="none" stroke="var(--deep-blush)" strokeWidth="3.5" />
        <line x1="217" y1="151" x2="191" y2="181" stroke="var(--deep-blush)" strokeWidth="3.5" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
