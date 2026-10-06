"use client";

import { useMemo } from "react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { featureLabel, type Lang } from "@/lib/i18n";
import { whatIfStrings } from "@/lib/strings/whatif";
import type { Applicant } from "@/lib/types";
import { contributions } from "@/lib/whatif";
import { SectionHeading } from "./SectionHeading";

/** Below this many points a feature is not worth a row: it rounds to 0 on screen. */
const MIN_POINTS = 0.5;

/** Two-sided bars: what lifts the score and what pulls it down, in exact model points. */
export function ScoreBreakdown({ lang, applicant }: { lang: Lang; applicant: Applicant }) {
  const s = whatIfStrings(lang).breakdown;
  const { lifts, pulls, max } = useMemo(() => {
    const all = contributions(applicant).filter((c) => Math.abs(c.points) >= MIN_POINTS);
    return {
      lifts: all.filter((c) => c.points > 0).sort((p, q) => q.points - p.points),
      pulls: all.filter((c) => c.points < 0).sort((p, q) => p.points - q.points),
      max: Math.max(1, ...all.map((c) => Math.abs(c.points))),
    };
  }, [applicant]);

  const side = (rows: typeof lifts, heading: string, empty: string, bar: string, sign: string) => (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <h3 className="text-base font-extrabold text-foreground">{heading}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted-foreground">{empty}</p>
      ) : (
        <Stagger>
          <ul className="mt-4 grid gap-4">
            {rows.map((c) => (
              <li key={c.key}>
                <StaggerItem>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-foreground">{featureLabel(lang, c.key)}</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {sign}
                      {Math.round(Math.abs(c.points))} {s.pts}
                    </span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(3, (Math.abs(c.points) / max) * 100)}%` }} />
                  </div>
                </StaggerItem>
              </li>
            ))}
          </ul>
        </Stagger>
      )}
    </div>
  );

  return (
    <section id="breakdown" aria-labelledby="breakdown-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="breakdown-title" kicker={s.kicker} title={s.title} sub={s.sub} tone="mint" />
      <div className="grid gap-4 md:grid-cols-2">
        {side(lifts, s.lifts, s.nothingLifts, "bg-chart-3", "+")}
        {side(pulls, s.pulls, s.nothingPulls, "bg-chart-5", "\u2212")}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{s.note}</p>
    </section>
  );
}
