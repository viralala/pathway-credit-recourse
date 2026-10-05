"use client";

import { CircleCheck, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { GoalPlan } from "@/lib/goal";
import { actionText, t, tf, type Lang } from "@/lib/i18n";
import type { PlanAction } from "@/lib/recourse";
import { goalStrings } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<PlanAction["kind"], string> = {
  actionable: "bg-pastel-peach text-deep-peach",
  "slow-moving": "bg-pastel-stone text-deep-stone",
  time: "bg-pastel-sky text-deep-sky",
  immutable: "bg-muted text-muted-foreground",
};

/** The lowest-effort plan to the goal score, step by step. */
export function PlanSteps({ gp, lang }: { gp: GoalPlan; lang: Lang }) {
  const s = goalStrings(lang);
  const ui = t(lang);
  const plan = gp.plan;

  return (
    <section aria-labelledby="goal-plan-heading" className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="goal-plan-heading" className="text-lg font-bold tracking-tight">
          {s.plan.heading}
        </h2>
        {gp.status === "infeasible" && (
          <span className="rounded-md bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">{s.plan.closest}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tf(s.plan.sub, { score: gp.targetScore })}</p>

      {!plan || plan.actions.length === 0 ? (
        <p className="mt-5 flex items-start gap-3 rounded-xl bg-success-soft p-4 text-sm font-medium text-success-foreground">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {s.plan.none}
        </p>
      ) : (
        <>
          <Reveal className="mt-5">
            <ol className="grid gap-3">
              {plan.actions.map((act, i) => (
                <li key={act.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl border border-border p-4">
                  <span
                    aria-hidden
                    className="row-span-2 grid size-8 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="sr-only">{tf(s.plan.step, { n: i + 1 })}: </span>
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", KIND_STYLE[act.kind])}>{ui.kinds[act.kind]}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tf(s.plan.doneBy, { n: act.months })} · {tf(s.plan.effort, { n: act.effort.toFixed(1) })}
                    </span>
                  </div>
                  <p className="text-[15px] leading-snug font-medium">{actionText(lang, act)}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <div className="mt-4 grid gap-2 text-sm">
            <p className="font-semibold tabular-nums">{tf(s.plan.scoreAfter, { n: Math.round(gp.scoreAfter) })}</p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium text-foreground">{ui.never}:</span> {ui.neverList}
              </span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
