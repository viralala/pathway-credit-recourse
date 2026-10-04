"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CHECKLIST, type Checklist, type ChecklistId } from "@/lib/offer";
import type { OfferStrings } from "@/lib/strings/offer";
import { CARD } from "./styles";

/** Self-check questions. Each switch turned on adds a red flag. */
export function ChecklistCard({
  s,
  checklist,
  onToggle,
}: {
  s: OfferStrings;
  checklist: Checklist;
  onToggle: (id: ChecklistId, on: boolean) => void;
}) {
  return (
    <Card className={CARD}>
      <CardHeader className="gap-1">
        <h3 className="text-base font-semibold">{s.checklistTitle}</h3>
        <p className="text-sm text-muted-foreground">{s.checklistSub}</p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1">
          {CHECKLIST.map((id) => {
            const htmlId = `offer-check-${id}`;
            return (
              <li key={id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
                <Switch id={htmlId} checked={!!checklist[id]} onCheckedChange={(on) => onToggle(id, on)} className="mt-0.5" />
                <Label htmlFor={htmlId} className="block cursor-pointer text-sm leading-snug font-normal">
                  {s.checklist[id]}
                </Label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
