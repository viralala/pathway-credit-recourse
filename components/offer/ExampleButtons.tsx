"use client";

import { CalendarDays, Landmark, Smartphone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFFER_EXAMPLES, type ExampleId } from "@/lib/offer";
import type { OfferStrings } from "@/lib/strings/offer";

const ICONS: Record<ExampleId, LucideIcon> = { app7: Smartphone, weekly: CalendarDays, bank: Landmark };

/** Three clearly fictional offers that fill the form. The loaded one is marked pressed. */
export function ExampleButtons({
  s,
  active,
  onPick,
}: {
  s: OfferStrings;
  active: ExampleId | null;
  onPick: (id: ExampleId) => void;
}) {
  return (
    <section aria-labelledby="offer-examples-title" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
      <div className="shrink-0">
        <h2 id="offer-examples-title" className="text-sm font-semibold">
          {s.examplesTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{s.examplesNote}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OFFER_EXAMPLES.map((e) => {
          const Icon = ICONS[e.id];
          const pressed = active === e.id;
          return (
            <Button
              key={e.id}
              type="button"
              variant="outline"
              aria-pressed={pressed}
              onClick={() => onPick(e.id)}
              className="h-auto min-h-9 rounded-md px-3.5 py-1.5 text-left whitespace-normal aria-pressed:border-primary/40 aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
            >
              <Icon aria-hidden />
              {s.examples[e.id]}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
