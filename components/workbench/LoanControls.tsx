"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Lang, UIStrings } from "@/lib/i18n";
import { inr, inrShort } from "@/lib/money";
import { NumberField } from "./NumberField";

export const LOAN_LIMITS = { min: 50_000, max: 25_00_000, step: 10_000 } as const;
export const TERM_OPTIONS = [12, 24, 36, 48, 60] as const;

/**
 * Loan amount (slider + number input) and term (toggle group). The label goes on the slider thumb
 * (the focusable element) through the shared Slider's thumbProps.
 */
export function LoanControls({
  ui,
  lang,
  amount,
  term,
  onAmount,
  onTerm,
}: {
  ui: UIStrings;
  lang: Lang;
  amount: number;
  term: number;
  onAmount: (v: number) => void;
  onTerm: (v: number) => void;
}) {
  const s = ui.savings;
  const amountId = useId();
  const amountLabelId = useId();
  const termLabelId = useId();

  return (
    <>
      <div className="grid content-start gap-3">
        <Label id={amountLabelId} htmlFor={amountId} className="text-sm font-semibold text-foreground">
          {s.amount}
          <span className="sr-only"> (₹)</span>
        </Label>
        <NumberField
          id={amountId}
          value={amount}
          min={LOAN_LIMITS.min}
          max={LOAN_LIMITS.max}
          step={LOAN_LIMITS.step}
          prefix="₹"
          onValue={(v) => onAmount(Math.round(v))}
          inputClassName="text-lg"
        />
        <Slider
          value={[amount]}
          min={LOAN_LIMITS.min}
          max={LOAN_LIMITS.max}
          step={LOAN_LIMITS.step}
          onValueChange={(v) => onAmount(v[0])}
          className="py-2"
          trackClassName="data-horizontal:h-2"
          thumbProps={{
            "aria-labelledby": amountLabelId,
            "aria-valuetext": inr(amount),
            className: "size-5 border-2 border-primary bg-card shadow-sm hover:ring-4 focus-visible:ring-4 active:ring-4",
          }}
        />
        <div aria-hidden className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{inrShort(LOAN_LIMITS.min, lang)}</span>
          <span>{inrShort(LOAN_LIMITS.max, lang)}</span>
        </div>
      </div>

      <div className="grid content-start gap-3">
        <span id={termLabelId} className="text-sm leading-none font-semibold text-foreground">
          {s.term}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          value={String(term)}
          onValueChange={(v) => {
            if (v) onTerm(Number(v));
          }}
          aria-labelledby={termLabelId}
          className="w-full flex-wrap"
        >
          {TERM_OPTIONS.map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              className="h-11 min-w-14 flex-1 rounded-xl bg-card px-2 tabular-nums data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {n} {ui.monthsShort}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </>
  );
}
