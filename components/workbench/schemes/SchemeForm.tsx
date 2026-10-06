"use client";

import { Info, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tf } from "@/lib/i18n";
import { PROFILE_FIELDS } from "@/lib/schemes/schema";
import type { SchemeStrings } from "@/lib/strings/schemes";
import { cn } from "@/lib/utils";
import { Disclosure } from "./Disclosure";
import {
  boundsOf,
  EDUCATION_VALUES,
  MORE_QUESTIONS,
  PRIMARY_QUESTIONS,
  SENSITIVE_KEYS,
  type Answers,
  type Question,
} from "./fields";
import { educationText } from "./format";
import type { ProfileFieldKey } from "@/lib/schemes/types";

/** Value of the "Not answered" item: Radix Select does not allow an empty item value. */
const UNSET = "__unset";

/** Id of the wrapper around one question, used to scroll to it and focus it. */
export const questionDomId = (base: string, key: ProfileFieldKey) => `${base}-q-${key}`;

function Optional({ s }: { s: SchemeStrings }) {
  return <span className="text-xs font-normal text-muted-foreground"> · {s.form.optional}</span>;
}

function QuestionField({
  s,
  base,
  q,
  value,
  invalid,
  onChange,
}: {
  s: SchemeStrings;
  base: string;
  q: Question;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const domId = questionDomId(base, q.key);
  const controlId = `${domId}-control`;
  const labelId = `${domId}-label`;
  const hintId = `${domId}-hint`;
  const errorId = `${domId}-error`;
  const field = s.fields[q.key];
  const spec = PROFILE_FIELDS[q.key];

  const labelClass = "leading-snug font-medium text-foreground";
  let control: React.ReactNode;

  if (q.kind === "number") {
    const { min, max } = boundsOf(q.key);
    control = (
      <div className="relative">
        {q.unit === "rupees" && (
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            ₹
          </span>
        )}
        <Input
          id={controlId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={q.unit === "rupees" ? 1000 : 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
          className={cn(
            "h-11 rounded-xl bg-background text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            q.unit === "rupees" && "pl-7",
          )}
        />
      </div>
    );
  } else if (q.kind === "yesno") {
    const shown = value === "yes" || value === "no" ? value : "unknown";
    control = (
      <ToggleGroup
        type="single"
        variant="outline"
        size="lg"
        spacing={1}
        value={shown}
        // Pressing the pressed button again clears it; that is "not sure", the same as never answering.
        onValueChange={(v) => onChange(v === "yes" || v === "no" ? v : "")}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="flex-wrap"
      >
        {(["yes", "no", "unknown"] as const).map((v) => (
          <ToggleGroupItem
            key={v}
            value={v}
            className="h-10 min-w-16 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary"
          >
            {v === "yes" ? s.form.yes : v === "no" ? s.form.no : s.form.notSure}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  } else {
    const items: { value: string; label: string }[] =
      q.kind === "education"
        ? EDUCATION_VALUES.map((n) => ({ value: String(n), label: educationText(s, n) }))
        : spec.type === "enum"
          ? (spec.values as readonly string[]).map((v) => ({
              value: v,
              label: (s.options as Record<string, Record<string, string>>)[q.key]?.[v] ?? v,
            }))
          : [];
    control = (
      <Select value={value === "" ? UNSET : value} onValueChange={(v) => onChange(v === UNSET ? "" : v)}>
        <SelectTrigger
          id={controlId}
          aria-describedby={hintId}
          className="w-full rounded-xl bg-background text-base font-semibold data-[size=default]:h-11"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>{s.form.notAnswered}</SelectItem>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div id={domId} className="grid scroll-mt-28 content-start gap-1.5">
      {q.kind === "yesno" ? (
        <span id={labelId} className={cn("text-sm", labelClass)}>
          {field.label}
          <Optional s={s} />
        </span>
      ) : (
        <Label id={labelId} htmlFor={controlId} className={labelClass}>
          <span>
            {field.label}
            <Optional s={s} />
          </span>
        </Label>
      )}
      {control}
      <p id={hintId} className="text-xs text-muted-foreground">
        {field.hint}
      </p>
      {invalid && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-foreground">
          {tf(s.form.rangeError, boundsOf(q.key))}
        </p>
      )}
    </div>
  );
}

/**
 * The scheme questions. Every one is optional; an unanswered one is "not known". The first few sit
 * up front and the rest are behind "More details (optional)".
 */
export function SchemeForm({
  s,
  base,
  answers,
  invalid,
  onAnswer,
  moreOpen,
  onMoreOpen,
  busy,
  changed,
  showSave,
  saveChecked,
  onSaveChange,
  onSubmit,
}: {
  s: SchemeStrings;
  /** Prefix for every element id in the form (from useId). */
  base: string;
  answers: Answers;
  /** Number questions whose text is out of range. */
  invalid: ProfileFieldKey[];
  onAnswer: (key: ProfileFieldKey, value: string) => void;
  moreOpen: boolean;
  onMoreOpen: (open: boolean) => void;
  busy: boolean;
  /** The answers differ from the ones the shown result was computed for. */
  changed: boolean;
  /** Signed-in people only. */
  showSave: boolean;
  saveChecked: boolean;
  onSaveChange: (checked: boolean) => void;
  onSubmit: () => void;
}) {
  const renderQuestion = (q: Question) => (
    <QuestionField
      key={q.key}
      s={s}
      base={base}
      q={q}
      value={answers[q.key] ?? ""}
      invalid={invalid.includes(q.key)}
      onChange={(v) => onAnswer(q.key, v)}
    />
  );
  const sensitive = MORE_QUESTIONS.filter((q) => SENSITIVE_KEYS.includes(q.key));
  const rest = MORE_QUESTIONS.filter((q) => !SENSITIVE_KEYS.includes(q.key));
  const saveId = `${base}-save`;

  return (
    <form
      aria-labelledby={`${base}-form-title`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
      className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7"
    >
      <h3 id={`${base}-form-title`} className="text-xl font-extrabold tracking-tight">
        {s.form.heading}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{s.form.intro}</p>

      <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{PRIMARY_QUESTIONS.map(renderQuestion)}</div>

      <Disclosure
        id={`${base}-more`}
        open={moreOpen}
        onOpenChange={onMoreOpen}
        label={s.form.moreDetails}
        hint={s.form.moreDetailsHint}
        className="mt-7 border-t border-border pt-5"
        buttonClassName="py-1"
      >
        <div className="mt-5 grid gap-5">
          <p className="flex items-start gap-3 rounded-xl bg-pastel-sky p-4 text-sm font-medium text-deep-sky">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{s.form.sensitive}</span>
          </p>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{sensitive.map(renderQuestion)}</div>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{rest.map(renderQuestion)}</div>
        </div>
      </Disclosure>

      {showSave && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/70 p-4">
          <input
            id={saveId}
            type="checkbox"
            checked={saveChecked}
            onChange={(e) => onSaveChange(e.target.checked)}
            aria-describedby={`${saveId}-hint`}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
          />
          <div>
            <Label htmlFor={saveId} className="cursor-pointer leading-snug">
              {s.form.save}
            </Label>
            <p id={`${saveId}-hint`} className="mt-1 text-xs text-muted-foreground">
              {s.form.saveHint}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="h-12 gap-2 rounded-xl px-6 text-[15px] font-bold">
          {busy ? <LoaderCircle aria-hidden className="animate-spin" /> : <Search aria-hidden />}
          {busy ? s.form.checking : s.form.check}
        </Button>
        {changed && !busy && <p className="text-sm font-medium text-warning-foreground">{s.form.changed}</p>}
      </div>
    </form>
  );
}
