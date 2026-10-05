import { ScanSearch, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { OfferStrings } from "@/lib/strings/offer";
import { HeroArt } from "./HeroArt";

/** Page hero: the question, a short explainer and the privacy promise. */
export function OfferHero({ s }: { s: OfferStrings }) {
  return (
    <Reveal as="section" className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-md bg-pastel-peach px-3 py-1 text-xs font-semibold text-deep-peach">
            <ScanSearch aria-hidden className="size-3.5" />
            {s.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">{s.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{s.intro}</p>
          <p className="mt-5 inline-flex items-start gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {s.privacy}
          </p>
        </div>
        <div className="mx-auto w-full max-w-[13rem] sm:max-w-xs lg:max-w-sm">
          <HeroArt className="h-auto w-full" />
        </div>
      </div>
    </Reveal>
  );
}
