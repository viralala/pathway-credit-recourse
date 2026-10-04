"use client";

import { CircleCheck, CircleAlert, Lock, TriangleAlert } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { actionText, tf, type Lang, type UIStrings } from "@/lib/i18n";
import type { RecoursePlan } from "@/lib/recourse";
import { cn } from "@/lib/utils";
import { KICKER, SectionHeading } from "./SectionHeading";

const KIND_STYLE: Record<string, string> = {
  actionable: "bg-pastel-peach text-deep-peach",
  "slow-moving": "bg-pastel-lavender text-deep-lavender",
  time: "bg-pastel-sky text-deep-sky",
};

/** Section 2: the lowest-effort plan, step by step, from today's decline to re-applying. */
export function Plan({
  ui,
  lang,
  approved,
  feasible,
  plan,
  horizon,
}: {
  ui: UIStrings;
  lang: Lang;
  approved: boolean;
  feasible: boolean;
  plan: RecoursePlan | null;
  horizon: number;
}) {
  return (
    <section id="plan" aria-labelledby="plan-title" className="page-container scroll-mt-24">
      <div className="rounded-3xl bg-secondary/60 px-5 py-12 ring-1 ring-foreground/5 sm:px-10 sm:py-16">
        <SectionHeading id="plan-title" n={2} kicker={ui.what} title={ui.whatTitle} sub={ui.whatSub} tone="lavender" />

        {approved || !plan ? (
          <Reveal>
            <p className="flex items-center gap-3 rounded-2xl bg-success-soft p-6 font-semibold text-success-foreground">
              <CircleCheck aria-hidden className="size-5 shrink-0" />
              <span>
                <span className="block font-bold">{ui.approvedNow}</span>
                <span className="block font-medium">{ui.noReasons}</span>
              </span>
            </p>
          </Reveal>
        ) : (
          <>
            {!feasible && (
              <Reveal>
                <p role="note" className="mb-4 flex items-start gap-3 rounded-2xl bg-warning-soft p-4 font-semibold text-warning-foreground">
                  <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
                  <span>
                    <span className="block">{tf(ui.noPlan, { n: horizon })}</span>
                    <span className="block text-sm font-medium">{ui.closestPlan} <span aria-hidden>↓</span></span>
                  </span>
                </p>
              </Reveal>
            )}
            <Stagger>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]">
                <li>
                  <StaggerItem className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-danger-soft p-5 text-danger-foreground">
                    <span className={KICKER}>{ui.today}</span>
                    <span>
                      <span className="flex items-center gap-2 text-2xl font-extrabold">
                        <CircleAlert aria-hidden className="size-5" />
                        {ui.declined}
                      </span>
                      <span className="mt-1 block text-sm tabular-nums">
                        {Math.round(plan.scoreBefore)} {ui.pts}
                      </span>
                    </span>
                  </StaggerItem>
                </li>
                {plan.actions.map((act, i) => (
                  <li key={act.key}>
                    <StaggerItem className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={cn(KICKER, "text-muted-foreground")}>
                          {ui.step} {i + 1}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", KIND_STYLE[act.kind])}>{ui.kinds[act.kind]}</span>
                      </div>
                      <p className="mt-3 flex-1 leading-snug font-semibold text-foreground">{actionText(lang, act)}</p>
                      <p className="mt-4 text-xs text-muted-foreground tabular-nums">
                        {act.months} {ui.monthsShort} · {ui.effort} {act.effort.toFixed(1)}
                      </p>
                    </StaggerItem>
                  </li>
                ))}
                <li>
                  <StaggerItem
                    className={cn(
                      "flex h-full flex-col justify-between gap-6 rounded-2xl p-5",
                      feasible ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span className={KICKER}>{ui.reapply}</span>
                    <span>
                      <span className="flex items-center gap-2 text-2xl font-extrabold">
                        {feasible ? <CircleCheck aria-hidden className="size-5" /> : <CircleAlert aria-hidden className="size-5" />}
                        {feasible ? `${ui.approved}*` : ui.declined}
                      </span>
                      <span className="mt-1 block text-sm tabular-nums">
                        {ui.planScore}: {Math.round(plan.scoreAfter)}
                      </span>
                    </span>
                  </StaggerItem>
                </li>
              </ol>
            </Stagger>
            <Reveal className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-2.5 py-0.5 text-xs font-bold text-deep-lavender">
                  <Lock aria-hidden className="size-3" />
                  {ui.never}
                </span>
                <span className="text-sm text-muted-foreground">{ui.neverList}</span>
              </div>
              <div className="rounded-2xl bg-card/70 p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
                {ui.total} {ui.effort}: <strong className="text-foreground tabular-nums">{plan.effort.toFixed(1)}</strong> · *{ui.projected}
              </div>
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}
