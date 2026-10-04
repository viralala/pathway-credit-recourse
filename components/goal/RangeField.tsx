"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Labelled single-value slider. Built on the Radix primitive directly so the thumb can carry
 * `aria-labelledby` (the visible label) and `aria-valuetext` (e.g. "15% APR" instead of "15").
 */
export function RangeField({
  label,
  value,
  valueText,
  onChange,
  min,
  max,
  step,
  children,
  className,
}: {
  label: string;
  value: number;
  valueText: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Extra content under the slider, e.g. what the value implies. */
  children?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <div className={cn("grid gap-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label id={labelId} className="text-[13px] leading-snug font-medium text-muted-foreground">
          {label}
        </Label>
        <span aria-hidden className="text-base font-bold tabular-nums text-foreground">
          {valueText}
        </span>
      </div>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          if (typeof v[0] === "number") onChange(v[0]);
        }}
        className="relative flex h-6 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-labelledby={labelId}
          aria-valuetext={valueText}
          className="block size-5 rounded-full border-2 border-primary bg-card shadow-sm ring-ring/40 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
        />
      </SliderPrimitive.Root>
      {children}
    </div>
  );
}
