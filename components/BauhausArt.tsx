"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Shape = "q-tl" | "q-tr" | "q-bl" | "q-br" | "disc" | "star" | "half-b";
type Tile = { bg: string; shape: Shape; fg: string; accent?: boolean };

const PATHS: Record<Shape, (fg: string) => ReactNode> = {
  "q-tl": (fg) => <path d="M0 0 H100 A100 100 0 0 1 0 100 Z" fill={fg} />,
  "q-tr": (fg) => <path d="M0 0 A100 100 0 0 1 100 100 V0 Z" fill={fg} />,
  "q-bl": (fg) => <path d="M0 0 A100 100 0 0 0 100 100 H0 Z" fill={fg} />,
  "q-br": (fg) => <path d="M0 100 A100 100 0 0 1 100 0 V100 Z" fill={fg} />,
  disc: (fg) => <circle cx="50" cy="50" r="30" fill={fg} />,
  star: (fg) => <path d="M50 12 C54 40 60 46 88 50 C60 54 54 60 50 88 C46 60 40 54 12 50 C40 46 46 40 50 12 Z" fill={fg} />,
  "half-b": (fg) => <path d="M0 100 A50 50 0 0 1 100 100 Z" fill={fg} />,
};

/** One square tile drawn in a 100×100 box: a quarter circle anchored to a corner, a disc, a star or a half disc. */
function TileSvg({ bg, shape, fg }: Tile) {
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full" aria-hidden focusable="false">
      <rect width="100" height="100" fill={bg} />
      {PATHS[shape](fg)}
    </svg>
  );
}

const P = (name: string) => `var(--pastel-${name})`;

/**
 * Decorative pastel tile wall behind the score card. The accent tiles turn mint (success) when the
 * applicant is approved and blush (danger) when declined, with a small pop when the decision flips.
 */
export function BauhausArt({ approved, className }: { approved: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const accentBg = approved ? "var(--success-soft)" : "var(--danger-soft)";
  const accentFg = approved ? "var(--chart-3)" : "var(--chart-5)";
  const A = (shape: Shape): Tile => ({ bg: accentBg, shape, fg: accentFg, accent: true });
  const tiles: Tile[] = [
    { bg: P("butter"), shape: "q-br", fg: "var(--chart-2)" },
    { bg: P("periwinkle"), shape: "disc", fg: "var(--chart-1)" },
    A("q-bl"),
    { bg: P("lavender"), shape: "half-b", fg: "var(--card)" },
    { bg: P("peach"), shape: "q-tl", fg: "var(--chart-1)" },
    { bg: P("sky"), shape: "star", fg: "var(--card)" },
    { bg: P("mint"), shape: "q-tr", fg: "var(--card)" },
    A("disc"),
    { bg: P("periwinkle"), shape: "q-br", fg: "var(--chart-2)" },
    { bg: P("peach"), shape: "q-br", fg: "var(--card)" },
    A("q-bl"),
    { bg: P("blush"), shape: "q-tr", fg: "var(--chart-1)" },
    { bg: P("sky"), shape: "half-b", fg: "var(--chart-2)" },
    { bg: P("butter"), shape: "star", fg: "var(--chart-4)" },
    { bg: P("lavender"), shape: "q-tl", fg: "var(--chart-5)" },
    { bg: P("mint"), shape: "disc", fg: "var(--card)" },
    { bg: P("butter"), shape: "q-tr", fg: "var(--chart-4)" },
    A("star"),
    { bg: P("periwinkle"), shape: "half-b", fg: "var(--card)" },
    { bg: P("peach"), shape: "q-bl", fg: "var(--chart-3)" },
    { bg: P("sky"), shape: "q-br", fg: "var(--chart-1)" },
  ];
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div aria-hidden className={cn("grid h-full grid-cols-3 content-start overflow-hidden", className)}>
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.03, ease }}
        >
          {tile.accent ? (
            <motion.div
              key={approved ? "approved" : "declined"}
              initial={reduce ? false : { rotate: -90, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <TileSvg {...tile} />
            </motion.div>
          ) : (
            <TileSvg {...tile} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Hand-drawn underline flourish. Decorative. */
export function Scribble({ color = "var(--chart-2)", className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 18" className={cn("h-4 w-40", className)} aria-hidden focusable="false">
      <path
        d="M4 12 C40 4 110 3 156 9 M10 14 C60 8 120 8 150 13"
        fill="none"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
