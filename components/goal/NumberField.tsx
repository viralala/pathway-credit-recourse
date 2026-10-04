"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Labelled number input with an optional $ prefix or % suffix. `scale` converts between the stored
 * value and what is shown (100 for a fraction shown as a percentage). While the field is focused the
 * raw text is kept, so clearing it to type a new number does not snap back to 0.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  scale = 1,
  prefix,
  suffix,
  hint,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  scale?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [draft, setDraft] = useState<string | null>(null);
  const shown = String(Math.round(value * scale * 100) / 100);

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] leading-snug font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {prefix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft ?? shown}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const v = Number(raw);
            if (raw.trim() !== "" && Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)) / scale);
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            "h-10 rounded-xl bg-card text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            prefix && "pl-7",
            suffix && "pr-8",
          )}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
