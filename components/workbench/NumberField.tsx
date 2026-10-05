"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Number input that lets people type freely (including clearing the field) while still pushing
 * every valid, clamped value up immediately. The typed text is kept only while the field is focused.
 */
export function NumberField({
  id,
  value,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  onValue,
  className,
  inputClassName,
  describedBy,
  belowMinMessage,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Visual unit before the number (e.g. "$"); hidden from screen readers, so put the unit in the label too. */
  prefix?: string;
  suffix?: string;
  onValue: (v: number) => void;
  className?: string;
  inputClassName?: string;
  describedBy?: string;
  /** With this set, a typed value below `min` is refused (not raised to `min`) and this message is shown. */
  belowMinMessage?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const tooLow = belowMinMessage !== undefined && draft !== null && draft.trim() !== "" && Number(draft) < min;
  const errorId = `${id}-error`;

  return (
    <div className={cn("relative", className)}>
      {prefix && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
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
        value={draft ?? String(value)}
        aria-describedby={tooLow ? errorId : describedBy}
        aria-invalid={tooLow || undefined}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw.trim() === "") return;
          const v = Number(raw);
          if (belowMinMessage !== undefined && v < min) return;
          if (Number.isFinite(v)) onValue(clamp(v));
        }}
        onBlur={() => setDraft(null)}
        className={cn(
          "h-11 rounded-xl bg-background font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          prefix && "pl-7",
          suffix && "pr-9",
          inputClassName,
        )}
      />
      {suffix && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          {suffix}
        </span>
      )}
      {tooLow && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger-foreground">
          {belowMinMessage}
        </p>
      )}
    </div>
  );
}
