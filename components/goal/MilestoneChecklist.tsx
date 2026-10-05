"use client";

import { Check, CircleCheck } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useId, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { Milestone } from "@/lib/goal";
import { tf, type Lang } from "@/lib/i18n";
import { goalStrings, milestoneText } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";

const DOT: Record<Milestone["kind"], string> = {
  utilization: "bg-pastel-peach",
  debt: "bg-pastel-peach",
  lines: "bg-pastel-peach",
  income: "bg-pastel-stone",
  late: "bg-pastel-sky",
  approval: "bg-pastel-butter",
  tier: "bg-pastel-butter",
  goal: "bg-pastel-mint",
};

/**
 * Chronological checklist of milestones. Ticks live in component state only: nothing is stored or
 * sent. The parent remounts it (via `key`) whenever the milestones change, which clears the ticks.
 */
export function MilestoneChecklist({ milestones, lang }: { milestones: Milestone[]; lang: Lang }) {
  const s = goalStrings(lang);
  const id = useId();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const count = milestones.filter((m) => done[m.key]).length;

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col rounded-xl bg-card p-5 border border-border sm:p-6">
      <h2 id={`${id}-heading`} className="text-lg font-bold tracking-tight">
        {s.milestones.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{s.milestones.sub}</p>

      {milestones.length === 0 ? (
        <p className="mt-5 flex items-start gap-3 rounded-xl bg-success-soft p-4 text-sm font-medium text-success-foreground">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {s.milestones.none}
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground tabular-nums" aria-live="polite">
              {tf(s.milestones.progress, { done: count, total: milestones.length })}
            </p>
            <Progress value={(count / milestones.length) * 100} aria-hidden className="h-1.5" />
          </div>
          <ol className="relative mt-4 grid gap-1">
            {milestones.map((m) => {
              const checked = !!done[m.key];
              const boxId = `${id}-${m.key}`;
              return (
                <li key={m.key} className={cn("flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors", checked && "bg-muted/60")}>
                  <CheckboxPrimitive.Root
                    id={boxId}
                    checked={checked}
                    onCheckedChange={(v) => setDone((d) => ({ ...d, [m.key]: v === true }))}
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-input bg-card transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  >
                    <CheckboxPrimitive.Indicator>
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  <label htmlFor={boxId} className="grid min-w-0 cursor-pointer gap-0.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tabular-nums">
                      <span aria-hidden className={cn("size-2 rounded-full ring-1 ring-foreground/10", DOT[m.kind])} />
                      {tf(s.milestones.monthN, { n: m.month })}
                    </span>
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        m.kind === "goal" ? "font-semibold" : "font-medium",
                        checked && "text-muted-foreground line-through decoration-foreground/30",
                      )}
                    >
                      {milestoneText(lang, m)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
