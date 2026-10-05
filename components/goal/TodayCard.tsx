"use client";

import { HandCoins, Landmark } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { GOAL_LIMITS, type GoalPlan } from "@/lib/goal";
import { money, tf, type Lang } from "@/lib/i18n";
import { aprText, goalStrings } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";

/** "What you can get today": today's tier (or a decline), the largest loan that fits, and the interest gap. */
export function TodayCard({ gp, lang }: { gp: GoalPlan; lang: Lang }) {
  const s = goalStrings(lang).today;
  const tiers = goalStrings(lang).tiers;
  const { today, goal } = gp;
  const max = Math.floor(today.affordability.maxAmount / 100) * 100;
  const fitsAny = max >= GOAL_LIMITS.amount.min;
  const sameRate = today.effectiveApr <= gp.targetApr + 1e-12;

  return (
    <section aria-labelledby="goal-today-heading" className="flex flex-col rounded-xl bg-card p-5 border border-border sm:p-6">
      <h2 id="goal-today-heading" className="text-lg font-bold tracking-tight">
        {s.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{s.sub}</p>

      <p
        className={cn(
          "mt-5 flex items-start gap-3 rounded-xl p-4 text-sm font-medium",
          today.declined ? "bg-warning-soft text-warning-foreground" : "bg-pastel-sky text-deep-sky",
        )}
      >
        <Landmark aria-hidden className="mt-0.5 size-4 shrink-0" />
        {today.declined || !today.tier
          ? tf(s.declined, { apr: aprText(today.effectiveApr) })
          : tf(s.tier, { apr: aprText(today.effectiveApr), tier: tiers[today.tier.id] })}
      </p>

      <div className="mt-5 grid gap-1">
        <p className="text-[13px] font-medium text-muted-foreground">{s.maxLoan}</p>
        {fitsAny ? (
          <>
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              <CountUp value={max} format={money} />
            </p>
            <p className="text-xs text-muted-foreground">{tf(s.maxLoanAt, { n: goal.termMonths, apr: aprText(today.effectiveApr) })}</p>
          </>
        ) : (
          <p className="text-sm font-medium">{s.none}</p>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[13px] font-medium text-muted-foreground">
          {tf(s.interest, { amount: money(goal.amount), n: goal.termMonths })}
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{tf(s.interestToday, { apr: aprText(today.effectiveApr) })}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">{money(today.interest)}</dd>
          </div>
          <div className="rounded-xl bg-money-soft p-3">
            <dt className="text-xs text-money-foreground">{tf(s.interestGoal, { apr: aprText(gp.targetApr) })}</dt>
            <dd className="mt-1 text-lg font-bold text-money-foreground tabular-nums">{money(gp.totalInterest)}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug">
          <HandCoins aria-hidden className="mt-0.5 size-4 shrink-0 text-money" />
          {sameRate || gp.interestSaved < 1 ? s.same : tf(s.saved, { amount: money(gp.interestSaved) })}
        </p>
      </div>
    </section>
  );
}
