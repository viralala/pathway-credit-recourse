"use client";

import { CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { displayScore, money, pct, rate, tf, type Lang } from "@/lib/i18n";
import { isIncomeUnusable } from "@/lib/model";
import { PRICING } from "@/lib/pricing";
import { whatIfStrings } from "@/lib/strings/whatif";
import type { Applicant } from "@/lib/types";
import { whatIf, type WhatIfChanges } from "@/lib/whatif";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

interface Values {
  utilization: number;
  debtRatio: number;
  incomeGrowth: number;
  openCreditLines: number;
  monthsWaited: number;
}

const MINUS = "−";

const startValues = (a: Applicant): Values => ({
  utilization: Math.min(a.utilization, 1),
  debtRatio: a.debtRatio,
  incomeGrowth: 0,
  openCreditLines: a.openCreditLines,
  monthsWaited: 0,
});

/** Only what the person actually moved, so untouched inputs (even odd ones) reach the model as given. */
function changesFrom(a: Applicant, v: Values): WhatIfChanges {
  const c: WhatIfChanges = {};
  if (v.utilization !== Math.min(a.utilization, 1)) c.utilization = v.utilization;
  if (v.debtRatio !== a.debtRatio) c.debtRatio = v.debtRatio;
  if (v.incomeGrowth > 0) c.incomeGrowth = v.incomeGrowth;
  if (v.openCreditLines !== a.openCreditLines) c.openCreditLines = v.openCreditLines;
  if (v.monthsWaited > 0) c.monthsWaited = v.monthsWaited;
  return c;
}

function SliderRow({
  label,
  shown,
  note,
  disabled,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  shown: string;
  note: string;
  disabled?: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label id={id} className="text-sm font-semibold text-foreground">
          {label}
        </Label>
        <span className="text-sm font-bold text-foreground tabular-nums">{shown}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0])}
        className="py-2"
        trackClassName="data-horizontal:h-2"
        thumbProps={{
          "aria-labelledby": id,
          "aria-valuetext": shown,
          className: "size-5 border-2 border-primary bg-card shadow-sm hover:ring-4 focus-visible:ring-4 active:ring-4",
        }}
      />
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-extrabold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

/** Sliders over the real model: move an input and see the score, decision and loan terms change. */
export function WhatIf({ lang, applicant, onApply }: { lang: Lang; applicant: Applicant; onApply?: (next: Applicant) => void }) {
  const s = whatIfStrings(lang).whatIf;
  const [values, setValues] = useState<Values>(() => startValues(applicant));
  const [prev, setPrev] = useState(applicant);
  // A different applicant (new sample, edited form) starts the sliders over.
  if (prev !== applicant) {
    setPrev(applicant);
    setValues(startValues(applicant));
  }

  const deferred = useDeferredValue(values);
  const result = useMemo(() => whatIf(applicant, changesFrom(applicant, deferred)), [applicant, deferred]);
  const baseline = useMemo(() => whatIf(applicant, {}), [applicant]);

  const set = <K extends keyof Values>(k: K, v: number) => setValues((p) => ({ ...p, [k]: v }));
  const incomeUnusable = isIncomeUnusable(applicant.monthlyIncome);
  const start = startValues(applicant);
  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);
  const shownScore = displayScore(result.score, result.approved);
  const delta = shownScore - displayScore(baseline.score, baseline.approved);
  const loan = PRICING.defaultLoan;

  return (
    <section id="what-if" aria-labelledby="whatif-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="whatif-title" kicker={s.kicker} title={s.title} sub={s.sub} tone="peach" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid content-start gap-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <h3 className="text-base font-extrabold text-foreground">{s.sliders}</h3>
          <SliderRow
            label={s.utilization}
            shown={pct(values.utilization)}
            note={tf(s.today, { value: pct(start.utilization) })}
            value={values.utilization}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set("utilization", v)}
          />
          <SliderRow
            label={s.debtRatio}
            shown={pct(values.debtRatio)}
            note={tf(s.today, { value: pct(start.debtRatio) })}
            value={values.debtRatio}
            min={0}
            max={Math.max(1.5, Math.ceil(applicant.debtRatio * 10) / 10)}
            step={0.01}
            onChange={(v) => set("debtRatio", v)}
          />
          <SliderRow
            label={s.incomeGrowth}
            shown={`+${pct(values.incomeGrowth)}`}
            note={incomeUnusable ? s.incomeUnusable : tf(s.today, { value: money(applicant.monthlyIncome) })}
            disabled={incomeUnusable}
            value={values.incomeGrowth}
            min={0}
            max={0.3}
            step={0.01}
            onChange={(v) => set("incomeGrowth", v)}
          />
          <SliderRow
            label={s.openCreditLines}
            shown={String(values.openCreditLines)}
            note={tf(s.today, { value: start.openCreditLines })}
            value={values.openCreditLines}
            min={0}
            max={Math.max(20, applicant.openCreditLines)}
            step={1}
            onChange={(v) => set("openCreditLines", v)}
          />
          <SliderRow
            label={s.monthsWaited}
            shown={String(values.monthsWaited)}
            note={s.monthsHint}
            value={values.monthsWaited}
            min={0}
            max={24}
            step={1}
            onChange={(v) => set("monthsWaited", v)}
          />
        </div>

        <div className="grid content-start gap-5 rounded-2xl bg-pastel-peach p-5 ring-1 ring-foreground/10 sm:p-6" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-foreground">{s.result}</h3>
            <span
              data-decision={result.approved ? "approved" : "declined"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold",
                result.approved ? "bg-success-soft text-success-foreground" : "bg-danger-soft text-danger-foreground",
              )}
            >
              {result.approved ? <CircleCheck aria-hidden className="size-3.5" /> : <CircleAlert aria-hidden className="size-3.5" />}
              <span className="sr-only">{s.decision}: </span>
              {result.approved ? s.approved : s.declined}
            </span>
          </div>

          <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <p className="text-sm font-semibold text-muted-foreground">{s.newScore}</p>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold tracking-tight tabular-nums">
                <CountUp value={shownScore} duration={0.3} />
              </span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  delta > 0 ? "text-success-foreground" : delta < 0 ? "text-danger-foreground" : "text-muted-foreground",
                )}
              >
                <span className="sr-only">{s.change}: </span>
                {delta > 0 ? "+" : delta < 0 ? MINUS : ""}
                {Math.abs(delta)} {Math.abs(delta) === 1 ? s.pt : s.pts}
              </span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label={s.toApproval}
              value={
                result.approved
                  ? s.reached
                  : `${Math.max(1, Math.ceil(result.pointsToApproval))} ${Math.ceil(result.pointsToApproval) <= 1 ? s.pt : s.pts}`
              }
            />
            <Stat label={s.apr} value={result.apr === null ? s.noApr : rate(result.apr)} />
            <Stat label={s.emi} value={result.emi === null ? s.noApr : money(result.emi)} />
            <Stat
              label={s.interestSaved}
              value={result.interestSaved !== null && result.interestSaved > 0.5 ? money(result.interestSaved) : s.noSaving}
            />
          </dl>
          <p className="text-xs text-muted-foreground">{tf(s.loanNote, { amount: money(loan.amount), term: loan.termMonths })}</p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="lg" disabled={!dirty} onClick={() => setValues(start)}>
              <RotateCcw aria-hidden />
              {s.reset}
            </Button>
            {onApply && (
              <Button type="button" size="lg" disabled={!dirty} onClick={() => onApply(result.applicant)}>
                {s.apply}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
