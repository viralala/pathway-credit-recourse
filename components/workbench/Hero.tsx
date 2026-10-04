"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UIStrings } from "@/lib/i18n";
import { SAMPLES, type Sample } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { Scribble } from "../BauhausArt";
import { TONE, type Tone } from "./SectionHeading";

const SAMPLE_TONE: Record<Sample["id"], Tone> = {
  "clear-rejection": "blush",
  borderline: "butter",
  approved: "mint",
};

/** Soft pastel shapes behind the hero. Decorative only. */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 size-80 rounded-full bg-pastel-lavender opacity-70 blur-3xl" />
      <div className="absolute top-10 right-[-6rem] size-96 rounded-full bg-pastel-peach opacity-60 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-1/3 size-80 rounded-full bg-pastel-sky opacity-60 blur-3xl" />
      <div className="dot-grid absolute top-0 right-0 hidden h-40 w-72 opacity-60 lg:block" />
    </div>
  );
}

/** Headline, one-line pitch and the demo-applicant picker. Holds the page's only h1. */
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
      <Badge className="h-auto gap-1.5 rounded-full bg-pastel-lavender px-3 py-1 text-xs font-semibold whitespace-normal text-deep-lavender">
        <Sparkles aria-hidden />
        {ui.kicker}
      </Badge>
      <h1 id="hero-title" className="mt-4 max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {ui.tagline}
      </h1>
      <Scribble className="mt-3" />
      <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">{ui.heroBody}</p>

      <div className="mt-8">
        <p id="demo-picker-label" className="text-sm font-medium text-muted-foreground">
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
                  "group flex items-start gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "border-primary/40 bg-secondary ring-2 ring-primary/25" : "border-border bg-card/80 hover:bg-card",
                )}
              >
                <span
                  aria-hidden
                  className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold", TONE[SAMPLE_TONE[s.id]])}
                >
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
