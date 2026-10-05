import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { TRACKED } from "@/components/pages/typography";
import { cn } from "@/lib/utils";

const TONES = {
  teal: { box: "bg-pastel-teal", eyebrow: "text-deep-teal", art: "var(--deep-teal)" },
  stone: { box: "bg-pastel-stone", eyebrow: "text-deep-stone", art: "var(--deep-stone)" },
  mint: { box: "bg-pastel-mint", eyebrow: "text-deep-mint", art: "var(--deep-mint)" },
  sky: { box: "bg-pastel-sky", eyebrow: "text-deep-sky", art: "var(--deep-sky)" },
} as const;

export type HeroTone = keyof typeof TONES;

/** Decorative pastel art: soft discs and a dotted path that climbs to a goal. Hidden from assistive tech. */
function HeroArt({ stroke }: { stroke: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 320 320"
      className="pointer-events-none absolute -right-20 -top-16 -z-10 size-72 sm:-right-10 sm:size-96"
    >
      <circle cx="190" cy="140" r="130" fill="var(--card)" opacity="0.45" />
      <circle cx="210" cy="120" r="78" fill="var(--card)" opacity="0.55" />
      <path
        d="M40 290 C 110 270, 120 200, 170 185 S 240 150, 250 80"
        fill="none"
        stroke={stroke}
        strokeOpacity="0.28"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <circle cx="250" cy="80" r="9" fill="var(--card)" stroke={stroke} strokeOpacity="0.35" strokeWidth="3" />
    </svg>
  );
}

/**
 * Page hero for the secondary pages: a soft pastel panel with eyebrow, the page's single h1 and an intro.
 *
 *   <PageHero eyebrow="Fairness audit" title="At the same risk…">Intro text</PageHero>
 */
export function PageHero({
  eyebrow,
  title,
  children,
  tone = "teal",
  className,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  tone?: HeroTone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <Reveal className={cn("relative isolate overflow-hidden rounded-3xl p-6 sm:p-10", t.box, className)}>
      <HeroArt stroke={t.art} />
      <p className={cn("text-xs font-bold", TRACKED, t.eyebrow)}>{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
        {title}
      </h1>
      {children ? <div className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">{children}</div> : null}
    </Reveal>
  );
}
