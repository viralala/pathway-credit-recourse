"use client";

import { CalendarCheck, CircleCheck, TriangleAlert } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import type { GoalPlan } from "@/lib/goal";
import { displayScore, tf, type Lang } from "@/lib/i18n";
import { aprText, goalStrings } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";
import { fillNode } from "./fillNode";
import { GoalChart } from "./GoalChart";

/** "Reach your goal in N months": the headline, the score-by-month chart and its legend. */
export function GoalTimelineCard({ gp, lang }: { gp: GoalPlan; lang: Lang }) {
  const s = goalStrings(lang);
  const { timeline } = gp;
  const months = gp.status === "plan" ? (gp.targetMonth ?? gp.plan?.months ?? null) : null;
  const sameLine = timeline.targetScore === timeline.thresholdScore;
  const points = timeline.points;

  const headline =
    gp.status === "met-today"
      ? s.status.met
      : gp.status === "plan" && months !== null
        ? fillNode(months === 1 ? s.status.plan1 : s.status.plan, { n: <CountUp value={months} /> })
        : tf(s.status.infeasible, { n: gp.horizonMonths });
  const sub =
    gp.status === "met-today"
      ? tf(s.status.metSub, { apr: aprText(gp.currentApr ?? gp.targetApr) })
      : gp.status === "plan"
        ? s.status.planSub
        : tf(s.status.infeasibleSub, { score: gp.targetScore, best: displayScore(gp.scoreAfter) });
  const outcome =
    gp.status === "met-today"
      ? s.chart.outcomeMet
      : gp.targetMonth !== null
        ? tf(s.chart.outcomeGoal, { n: gp.targetMonth })
        : s.chart.outcomeNone;
  const aria = tf(s.chart.aria, {
    months: gp.horizonMonths,
    start: displayScore(points[0].score, points[0].approved),
    end: displayScore(points[points.length - 1].score, points[points.length - 1].approved),
    threshold: timeline.thresholdScore,
    goal: timeline.targetScore,
    outcome,
  });
  const Icon = gp.status === "met-today" ? CircleCheck : gp.status === "plan" ? CalendarCheck : TriangleAlert;

  return (
    <section aria-labelledby="goal-timeline-heading" className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            gp.status === "met-today"
              ? "bg-success-soft text-success-foreground"
              : gp.status === "plan"
                ? "bg-pastel-mint text-deep-mint"
                : "bg-warning-soft text-warning-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="goal-timeline-heading" className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl" aria-live="polite">
            {headline}
          </h2>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-sm font-semibold">{s.chart.heading}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{s.chart.sub}</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-6 rounded-full bg-chart-1" />
            {s.chart.score}
          </li>
          {!sameLine && (
            <li className="flex items-center gap-2">
              <span aria-hidden className="w-6 border-t-2 border-dashed border-chart-2" />
              {tf(s.chart.approval, { n: timeline.thresholdScore })}
            </li>
          )}
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-6 rounded-full bg-chart-3" />
            {tf(s.chart.goal, { n: timeline.targetScore })}
          </li>
        </ul>
        <figure role="img" aria-label={aria} className="mt-3">
          <GoalChart
            timeline={timeline}
            goalMonth={gp.status === "plan" ? gp.targetMonth : null}
            labels={{
              score: s.chart.score,
              month: s.chart.month,
              goal: tf(s.chart.goal, { n: timeline.targetScore }),
            }}
          />
        </figure>
      </div>
    </section>
  );
}
