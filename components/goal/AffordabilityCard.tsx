"use client";

import { CircleCheck, CircleX, Lightbulb } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { GOAL_LIMITS, type Affordability, type GoalPlan } from "@/lib/goal";
import { money, pct, tf, type Lang } from "@/lib/i18n";
import { PRICING } from "@/lib/pricing";
import { aprText, goalStrings } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";
import { fillNode } from "./fillNode";

/** Plain advice for one affordability check: what to change so the EMI fits. */
export function affordAdvice(f: Affordability, lang: Lang): string[] {
  const s = goalStrings(lang).afford;
  if (f.affordable) return [tf(s.spare, { amount: money(f.allowed - f.emi) })];
  const borrowable = Math.floor(f.maxAmount / 100) * 100;
  if (f.allowed <= 0 || borrowable < GOAL_LIMITS.amount.min) return [s.noRoom];
  return [
    tf(s.borrow, { amount: money(borrowable) }),
    f.fitTermMonths !== null && f.fitTermEmi !== null
      ? tf(s.term, { n: f.fitTermMonths, emi: money(f.fitTermEmi) })
      : tf(s.termNot, { n: f.longestTermMonths, emi: money(f.longestTermEmi) }),
  ];
}

function Column({ title, f, lang }: { title: string; f: Affordability; lang: Lang }) {
  const s = goalStrings(lang).afford;
  const budget = Math.max(1, f.budget);
  const existingW = Math.min(100, (f.existingPayments / budget) * 100);
  const emiW = Math.min(100 - existingW, (f.emi / budget) * 100);
  const over = f.existingPayments + f.emi > f.budget + 1e-9;

  return (
    <div className="grid content-start gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            f.affordable ? "bg-success-soft text-success-foreground" : "bg-danger-soft text-danger-foreground",
          )}
        >
          {f.affordable ? <CircleCheck aria-hidden className="size-3.5" /> : <CircleX aria-hidden className="size-3.5" />}
          {f.affordable ? s.fits : s.over}
        </span>
      </div>

      <dl className="grid gap-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{tf(s.emi, { apr: aprText(f.apr), n: f.termMonths })}</dt>
          <dd className="text-lg font-bold whitespace-nowrap tabular-nums">
            {fillNode(s.perMonth, { amount: <CountUp value={f.emi} format={money} /> })}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{s.existing}</dt>
          <dd className="font-semibold whitespace-nowrap tabular-nums">{tf(s.perMonth, { amount: money(f.existingPayments) })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{s.room}</dt>
          <dd className="font-semibold whitespace-nowrap tabular-nums">{tf(s.perMonth, { amount: money(f.allowed) })}</dd>
        </div>
      </dl>

      <div
        role="img"
        aria-label={tf(s.barAria, { budget: money(f.budget), existing: money(f.existingPayments), emi: money(f.emi) })}
        className="flex h-3 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/5"
      >
        <span className="h-full bg-pastel-blush" style={{ width: `${existingW}%` }} />
        <span
          className={cn("h-full transition-[width] duration-500", over ? "bg-danger/70" : "bg-chart-1")}
          style={{ width: `${Math.max(0, emiW)}%` }}
        />
      </div>

      <ul className="grid gap-1.5 text-[13px] leading-snug">
        {affordAdvice(f, lang).map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0 text-deep-butter" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** EMI against the budget lenders allow, today and after the plan, with plain advice when it does not fit. */
export function AffordabilityCard({ gp, lang }: { gp: GoalPlan; lang: Lang }) {
  const s = goalStrings(lang).afford;
  const { today, afterPlan } = gp.affordability;
  // A second column only when the plan changes the budget (income grows or debt payments fall).
  const showAfter =
    gp.status !== "met-today" &&
    (Math.abs(afterPlan.existingPayments - today.existingPayments) >= 1 || Math.abs(afterPlan.monthlyIncome - today.monthlyIncome) >= 1);
  return (
    <section aria-labelledby="goal-afford-heading" className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <h2 id="goal-afford-heading" className="text-lg font-bold tracking-tight">
        {s.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{tf(s.sub, { cap: pct(PRICING.maxEmiToIncome) })}</p>
      <div className={cn("mt-5 grid gap-3", showAfter && "2xl:grid-cols-2")}>
        <Column title={showAfter || gp.status === "met-today" ? s.today : s.both} f={today} lang={lang} />
        {showAfter && <Column title={s.afterPlan} f={afterPlan} lang={lang} />}
      </div>
    </section>
  );
}
