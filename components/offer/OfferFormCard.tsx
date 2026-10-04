"use client";

import { CircleAlert, Eraser } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CURRENCIES,
  CURRENCY_FORMAT,
  FREQUENCIES,
  type Currency,
  type ExampleId,
  type Frequency,
  type OfferErrorCode,
  type OfferField,
  type OfferForm,
  type RepaymentKind,
} from "@/lib/offer";
import { tf } from "@/lib/i18n";
import type { OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { CARD } from "./styles";

type TextField = Exclude<keyof OfferForm, "currency" | "kind" | "everyDays">;

/** One labelled number input with an optional unit adornment, hint and inline error. */
function NumberField({
  id,
  label,
  hint,
  optional,
  prefix,
  suffix,
  whole,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  prefix?: string;
  suffix?: string;
  /** Whole numbers only (days, counts): shows a numeric keypad on phones. */
  whole?: boolean;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id} className="leading-snug">
        <span>
          {label}
          {optional && <span className="font-normal text-muted-foreground"> ({optional})</span>}
        </span>
      </Label>
      <div className="relative">
        {prefix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          value={value}
          inputMode={whole ? "numeric" : "decimal"}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn("h-10 bg-card text-base tabular-nums md:text-base", prefix && "pl-7", suffix && "pr-9")}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-xs font-medium text-danger-foreground">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function KindOption({ value, title, desc }: { value: RepaymentKind; title: string; desc: string }) {
  const id = `offer-kind-${value}`;
  // The label is a sibling of the radio (clean accessible name) and stretches over the whole card.
  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/60 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-secondary">
      <RadioGroupItem id={id} value={value} className="mt-0.5" aria-describedby={`${id}-desc`} />
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="cursor-pointer leading-snug font-semibold after:absolute after:inset-0 after:rounded-xl">
          {title}
        </Label>
        <span id={`${id}-desc`} className="text-xs leading-snug text-muted-foreground">
          {desc}
        </span>
      </div>
    </div>
  );
}

/** The offer form. Holds no state: the parent owns the raw strings and decides which errors show. */
export function OfferFormCard({
  s,
  form,
  errors,
  example,
  onChange,
  onCurrency,
  onBlur,
  onClear,
  className,
}: {
  s: OfferStrings;
  form: OfferForm;
  /** Errors that should be visible now (the parent hides errors on untouched empty fields). */
  errors: Partial<Record<OfferField, OfferErrorCode>>;
  example: ExampleId | null;
  onChange: (patch: Partial<OfferForm>) => void;
  onCurrency: (c: Currency) => void;
  onBlur: (field: OfferField) => void;
  onClear: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const symbol = CURRENCY_FORMAT[form.currency].symbol;
  const field = (name: TextField, label: string, extra: { hint?: string; optional?: boolean; money?: boolean; suffix?: string; whole?: boolean } = {}): ReactNode => (
    <NumberField
      id={`offer-${name}`}
      label={label}
      hint={extra.hint}
      optional={extra.optional ? s.optional : undefined}
      prefix={extra.money ? symbol : undefined}
      suffix={extra.suffix}
      whole={extra.whole}
      value={form[name]}
      error={errors[name] ? s.errors[errors[name]] : undefined}
      onChange={(v) => onChange({ [name]: v })}
      onBlur={() => onBlur(name)}
    />
  );

  return (
    <Card className={cn(CARD, className)}>
      <CardHeader className="gap-1">
        <h2 className="text-lg font-semibold">{s.formTitle}</h2>
        <p className="text-sm text-muted-foreground">{s.formSub}</p>
        {/* Always mounted so screen readers hear the change when an example is loaded. */}
        <p role="status" className={example ? "mt-2 rounded-lg bg-pastel-sky px-3 py-2 text-xs leading-snug text-deep-sky" : "sr-only"}>
          {example ? tf(s.showingExample, { name: s.examples[example] }) : ""}
        </p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="offer-currency">{s.currency}</Label>
            <Select value={form.currency} onValueChange={(v) => onCurrency(v as Currency)}>
              <SelectTrigger id="offer-currency" className="w-full bg-card data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {s.currencies[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field("sanctioned", s.sanctioned, { hint: s.sanctionedHint, money: true })}

          <div className="grid gap-5 sm:grid-cols-2">
            {field("processingFee", s.processingFee, { hint: s.processingFeeHint, optional: true, money: true })}
            {field("otherCharges", s.otherCharges, { hint: s.otherChargesHint, optional: true, money: true })}
          </div>
          {field("gstPct", s.gstPct, { hint: s.gstHint, optional: true, suffix: "%" })}

          <Separator />

          <div className="grid gap-2">
            <p id="offer-kind-label" className="text-sm font-medium">
              {s.repayment}
            </p>
            <RadioGroup
              aria-labelledby="offer-kind-label"
              value={form.kind}
              onValueChange={(v) => onChange({ kind: v as RepaymentKind })}
              className="grid gap-2 sm:grid-cols-2"
            >
              <KindOption value="bullet" title={s.bullet} desc={s.bulletDesc} />
              <KindOption value="instalments" title={s.instalments} desc={s.instalmentsDesc} />
            </RadioGroup>
          </div>

          <motion.div
            key={form.kind}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-5 sm:grid-cols-2"
          >
            {form.kind === "bullet" ? (
              <>
                {field("bulletAmount", s.bulletAmount, { money: true })}
                {field("bulletDays", s.bulletDays, { whole: true })}
              </>
            ) : (
              <>
                {field("count", s.count, { whole: true })}
                {field("instalment", s.instalment, { money: true })}
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="offer-every">{s.everyDays}</Label>
                  <Select value={String(form.everyDays)} onValueChange={(v) => onChange({ everyDays: Number(v) as Frequency })}>
                    <SelectTrigger id="offer-every" className="w-full bg-card data-[size=default]:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={String(f)}>
                          {s.frequencies[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </motion.div>

          <div>
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
              <Eraser aria-hidden />
              {s.reset}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
