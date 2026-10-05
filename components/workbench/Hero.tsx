"use client";

import type { UIStrings } from "@/lib/i18n";
import { SAMPLES, type Sample } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "./SectionHeading";

const SAMPLE_TONE: Record<Sample["id"], Tone> = {
  "clear-rejection": "blush",
  borderline: "butter",
  approved: "mint",
};

/** Headline, one-line explanation and the demo-applicant picker. Holds the page's only h1. */
export function HeroIntro({
  ui,
  sampleId,
  onSample,
}: {
  ui: UIStrings;
  sampleId: string | null;
  onSample: (id: Sample["id"]) => void;
}) {
  return (
    <div>
      <p className="eyebrow">{ui.kicker}</p>
      <h1 id="hero-title" className="mt-3 max-w-2xl text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
        {ui.tagline}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{ui.heroBody}</p>

      <div className="mt-8">
        <p id="demo-picker-label" className="text-sm font-semibold text-foreground">
          {ui.tryDemo}
        </p>
        <div role="group" aria-labelledby="demo-picker-label" className="mt-2 grid gap-2 sm:grid-cols-3">
          {SAMPLES.map((s) => {
            const active = sampleId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-sample={s.id}
                aria-pressed={active}
                onClick={() => onSample(s.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-md text-sm font-extrabold", TONE[SAMPLE_TONE[s.id]])}>
                  {s.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">{s.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{ui.samples[s.id]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
