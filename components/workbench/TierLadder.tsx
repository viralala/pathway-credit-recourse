"use client";

import { Flag, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { rate, tf, type UIStrings } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { PRICING, tierFor, type RateTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type RowId = RateTier["id"] | "declined";

const ROW_TONE: Record<RowId, { fill: string; bar: string }> = {
  excellent: { fill: "bg-pastel-mint", bar: "bg-deep-mint/70" },
  "very-good": { fill: "bg-pastel-sky", bar: "bg-deep-sky/70" },
  good: { fill: "bg-pastel-periwinkle", bar: "bg-deep-periwinkle/70" },
  fair: { fill: "bg-pastel-butter", bar: "bg-deep-butter/70" },
  declined: { fill: "bg-pastel-blush", bar: "bg-deep-blush/70" },
};

export interface LadderMarker {
  score: number;
  label: string;
  kind: "today" | "after";
}

/** Signal-strength bars: how far up the ladder a row is. Decorative. */
function StepBars({ level, bar }: { level: number; bar: string }) {
  return (
    <span aria-hidden className="flex h-7 shrink-0 items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("w-1.5 rounded-sm", i <= level ? bar : "bg-foreground/10")} style={{ height: `${i * 20}%` }} />
      ))}
    </span>
  );
}

/** The illustrative rate tiers plus the declined zone, best first, marking where the applicant sits. */
export function TierLadder({ ui, markers }: { ui: UIStrings; markers: LadderMarker[] }) {
  const s = ui.savings;
  const reduce = useReducedMotion();
  const rows: { id: RowId; name: string; range: string; apr: number }[] = [
    ...PRICING.tiers.map((tier) => ({
      id: tier.id as RowId,
      name: s.tierNames[tier.id],
      range: tf(s.scoreFrom, { n: tier.minScore }),
      apr: tier.apr,
    })),
    { id: "declined", name: s.declinedZone, range: tf(s.scoreBelow, { n: MODEL.thresholdScore }), apr: PRICING.declinedAlternativeApr },
  ];
  const rowOf = (score: number): RowId => tierFor(score)?.id ?? "declined";

  return (
    <div>
      <h3 id="ladder-title" className="text-base font-bold">
        {s.ladderTitle}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{s.ladderSub}</p>
      <ol aria-labelledby="ladder-title" className="mt-4 grid gap-2">
        {rows.map((row, i) => {
          const here = markers.filter((m) => rowOf(m.score) === row.id);
          const tone = ROW_TONE[row.id];
          return (
            <li
              key={row.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-shadow",
                tone.fill,
                here.length ? "ring-2 ring-foreground/25" : "ring-1 ring-foreground/5",
              )}
            >
              <StepBars level={rows.length - i} bar={tone.bar} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-tight font-bold text-foreground">{row.name}</p>
                <p className="text-xs text-foreground/70 tabular-nums">{row.range}</p>
                {here.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {here.map((m) => (
                      <motion.span
                        key={m.kind}
                        layoutId={`ladder-marker-${m.kind}`}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          m.kind === "today" ? "bg-card text-foreground ring-1 ring-foreground/15" : "bg-primary text-primary-foreground",
                        )}
                      >
                        {m.kind === "today" ? <MapPin aria-hidden className="size-3" /> : <Flag aria-hidden className="size-3" />}
                        {m.label}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
              <p className="shrink-0 text-right text-sm font-extrabold text-foreground tabular-nums">
                {rate(row.apr)}
                <span className="block text-[10px] font-semibold text-foreground/70">{s.apr}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
