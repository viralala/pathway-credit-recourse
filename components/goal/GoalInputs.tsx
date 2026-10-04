"use client";

import { Link2, UserRound } from "lucide-react";
import { GOAL_LIMITS, type Goal } from "@/lib/goal";
import { t, tf, type Lang } from "@/lib/i18n";
import { PRICING, scoreForApr, tierFor } from "@/lib/pricing";
import { SAMPLES } from "@/lib/samples";
import { aprText, goalStrings } from "@/lib/strings/goal";
import type { Applicant, FeatureKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NumberField } from "./NumberField";
import { RangeField } from "./RangeField";

type Unit = "money" | "pct" | "count";
const PROFILE: { key: FeatureKey; unit: Unit; min?: number; max: number }[] = [
  { key: "monthlyIncome", unit: "money", max: 100000 },
  { key: "utilization", unit: "pct", max: 150 },
  { key: "debtRatio", unit: "pct", max: 300 },
  { key: "age", unit: "count", min: 18, max: 100 },
  { key: "openCreditLines", unit: "count", max: 30 },
  { key: "late30", unit: "count", max: 10 },
  { key: "late60", unit: "count", max: 10 },
  { key: "late90", unit: "count", max: 10 },
  { key: "dependents", unit: "count", max: 10 },
  { key: "realEstateLoans", unit: "count", max: 10 },
];

/** What a max APR implies: the tier it needs, or the best tier when none is that cheap. */
function aprImplication(maxApr: number, lang: Lang): string {
  const s = goalStrings(lang);
  const required = scoreForApr(maxApr);
  if (required === null) {
    const best = PRICING.tiers.reduce((b, x) => (x.apr < b.apr ? x : b), PRICING.tiers[0]);
    return tf(s.inputs.impliesNone, { apr: aprText(best.apr), score: best.minScore });
  }
  const tier = tierFor(required)!;
  return tf(s.inputs.impliesTier, { tier: s.tiers[tier.id], score: tier.minScore, apr: aprText(tier.apr) });
}

export function GoalInputs({
  lang,
  goal,
  applicant,
  sampleId,
  onGoal,
  onField,
  onSample,
}: {
  lang: Lang;
  goal: Goal;
  applicant: Applicant;
  sampleId: string | null;
  onGoal: (next: Partial<Goal>) => void;
  onField: (key: FeatureKey, value: number) => void;
  onSample: (id: string) => void;
}) {
  const s = goalStrings(lang);
  const ui = t(lang);
  const L = GOAL_LIMITS;

  return (
    <div className="grid gap-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight">{s.inputs.heading}</h2>

      <fieldset className="grid gap-5">
        {/* Floated so the legend becomes a normal grid row instead of sitting on the fieldset border. */}
        <legend className="float-left w-full text-xs font-semibold tracking-[0.14em] text-deep-periwinkle uppercase">
          {s.inputs.goalLegend}
        </legend>
        <NumberField
          label={s.inputs.amount}
          value={goal.amount}
          min={L.amount.min}
          max={L.amount.max}
          step={L.amount.step}
          prefix="$"
          hint={s.inputs.amountHint}
          onChange={(v) => onGoal({ amount: v })}
        />
        <RangeField
          label={s.inputs.term}
          value={goal.termMonths}
          valueText={tf(s.inputs.termValue, { n: goal.termMonths })}
          min={L.termMonths.min}
          max={L.termMonths.max}
          step={L.termMonths.step}
          onChange={(v) => onGoal({ termMonths: v })}
        />
        <RangeField
          label={s.inputs.maxApr}
          value={Math.round(goal.maxApr * 1000) / 10}
          valueText={tf(s.inputs.aprValue, { apr: aprText(goal.maxApr) })}
          min={L.maxApr.min * 100}
          max={L.maxApr.max * 100}
          step={L.maxApr.step * 100}
          onChange={(v) => onGoal({ maxApr: v / 100 })}
        >
          <p className="rounded-xl bg-pastel-periwinkle/60 px-3 py-2 text-[13px] leading-snug text-deep-periwinkle" aria-live="polite">
            {aprImplication(goal.maxApr, lang)}
          </p>
        </RangeField>
      </fieldset>

      <fieldset className="grid gap-4 border-t border-border pt-5">
        <legend className="float-left w-full text-xs font-semibold tracking-[0.14em] text-deep-periwinkle uppercase">
          {s.inputs.profileLegend}
        </legend>
        <p className="-mt-2 text-[13px] text-muted-foreground">{s.inputs.profileSub}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {PROFILE.map((f) => (
            <NumberField
              key={f.key}
              label={ui.fields[f.key]}
              value={applicant[f.key]}
              min={f.min}
              max={f.max}
              step={f.unit === "money" ? 100 : 1}
              scale={f.unit === "pct" ? 100 : 1}
              prefix={f.unit === "money" ? "$" : undefined}
              suffix={f.unit === "pct" ? "%" : undefined}
              onChange={(v) => onField(f.key, v)}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{s.inputs.demo}</p>
        <div className="grid gap-2">
          {SAMPLES.map((x) => {
            const active = sampleId === x.id;
            return (
              <button
                key={x.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSample(x.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden",
                  active ? "border-primary/40 bg-secondary" : "border-border bg-card hover:bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    active ? "bg-primary text-primary-foreground" : "bg-pastel-lavender text-deep-lavender",
                  )}
                >
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{x.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.inputs.demoTaglines[x.id]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Link2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {s.inputs.shareNote}
      </p>
    </div>
  );
}
