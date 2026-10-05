"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { money, tf, type UIStrings } from "@/lib/i18n";
import { APPLICANT_LIMITS } from "@/lib/security/validate";
import type { Applicant, FeatureKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NumberField } from "./NumberField";

type Unit = "money" | "pct" | "count";
interface FieldSpec {
  key: FeatureKey;
  unit: Unit;
  /** Lower bound; defaults to 0. Mirrors APPLICANT_LIMITS in lib/security/validate.ts. */
  min?: number;
  max: number;
}

/** Field layout: the four that matter most first, then late-payment history. Every field here is a model input. */
export const PRIMARY_FIELDS: FieldSpec[] = [
  { key: "monthlyIncome", unit: "money", min: APPLICANT_LIMITS.monthlyIncome.min, max: 100000 },
  { key: "utilization", unit: "pct", max: 150 },
  { key: "debtRatio", unit: "pct", max: 300 },
  { key: "openCreditLines", unit: "count", max: 30 },
];
export const SECONDARY_FIELDS: FieldSpec[] = [
  { key: "late30", unit: "count", max: 10 },
  { key: "late60", unit: "count", max: 10 },
  { key: "late90", unit: "count", max: 10 },
];

function Field({
  spec,
  label,
  value,
  big,
  belowMinMessage,
  onChange,
}: {
  spec: FieldSpec;
  label: string;
  value: number;
  big?: boolean;
  belowMinMessage?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const shown = spec.unit === "pct" ? Math.round(value * 100) : Math.round(value);
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id} className="leading-snug font-medium text-muted-foreground">
        {label}
        {spec.unit !== "count" && <span className="sr-only"> ({spec.unit === "pct" ? "%" : "$"})</span>}
      </Label>
      <NumberField
        id={id}
        value={shown}
        min={spec.min ?? 0}
        max={spec.max}
        step={spec.unit === "money" ? 100 : 1}
        prefix={spec.unit === "money" ? "$" : undefined}
        suffix={spec.unit === "pct" ? "%" : undefined}
        belowMinMessage={belowMinMessage}
        onValue={(v) => onChange(spec.unit === "pct" ? v / 100 : v)}
        inputClassName={cn(big ? "h-12 text-xl" : "text-base")}
      />
    </div>
  );
}

/** Every model input with a visible label. Values update the analysis as you type. */
export function ApplicantForm({
  ui,
  applicant,
  onField,
}: {
  ui: UIStrings;
  applicant: Applicant;
  onField: (key: FeatureKey, v: number) => void;
}) {
  return (
    <section
      aria-labelledby="profile-title"
      className="rounded-2xl bg-card/90 p-5 ring-1 ring-foreground/10 backdrop-blur-sm sm:p-7"
    >
      <h2 id="profile-title" className="text-xl font-extrabold tracking-tight">
        {ui.profileTitle}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{ui.profileSub}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        {PRIMARY_FIELDS.map((f) => (
          <Field
            key={f.key}
            big
            spec={f}
            label={ui.fields[f.key]}
            value={applicant[f.key]}
            belowMinMessage={f.key === "monthlyIncome" ? tf(ui.incomeMin, { min: money(f.min ?? 0) }) : undefined}
            onChange={(v) => onField(f.key, v)}
          />
        ))}
      </div>

      <h3 className="mt-8 text-sm font-bold text-foreground">{ui.historyTitle}</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECONDARY_FIELDS.map((f) => (
          <Field key={f.key} spec={f} label={ui.fields[f.key]} value={applicant[f.key]} onChange={(v) => onField(f.key, v)} />
        ))}
      </div>
    </section>
  );
}
