"use client";

import { CircleCheck } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { reasonText, type Lang, type UIStrings } from "@/lib/i18n";
import type { Reason } from "@/lib/model";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

/** Section 1: adverse-action reasons, ranked by score points lost. */
export function Reasons({ ui, lang, reasons }: { ui: UIStrings; lang: Lang; reasons: Reason[] }) {
  const maxPts = Math.max(1, ...reasons.map((x) => x.points));
  return (
    <section id="why" aria-labelledby="why-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="why-title" n={1} kicker={ui.why} title={ui.whyTitle} sub={ui.whySub} tone="blush" />
      {reasons.length === 0 ? (
        <p className="flex items-center gap-3 rounded-2xl bg-success-soft p-6 font-semibold text-success-foreground">
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          {ui.noReasons}
        </p>
      ) : (
        <Stagger>
          <ol className="grid gap-3">
            {reasons.map((x, i) => (
              <li key={x.key}>
                <StaggerItem className="grid gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-[3rem_1fr_15rem] sm:items-center">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-10 place-items-center rounded-xl text-sm font-extrabold",
                      i === 0 ? "bg-danger-soft text-danger-foreground" : "bg-pastel-peach text-deep-peach",
                    )}
                  >
                    R{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{ui.fields[x.key]}</p>
                    <p className="mt-0.5 text-[15px] text-pretty text-muted-foreground">{reasonText(lang, x.key, x.value)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", i === 0 ? "bg-chart-5" : "bg-chart-2")}
                        style={{ width: `${Math.max(4, (x.points / maxPts) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-bold text-foreground tabular-nums">
                      −{Math.round(x.points)} {ui.pts}
                    </span>
                  </div>
                </StaggerItem>
              </li>
            ))}
          </ol>
        </Stagger>
      )}
    </section>
  );
}
