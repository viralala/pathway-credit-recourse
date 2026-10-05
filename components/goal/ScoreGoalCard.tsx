"use client";

import { ArrowRight, CircleCheck, Flag } from "lucide-react";
import type { CSSProperties } from "react";
import { CountUp } from "@/components/motion/CountUp";
import type { GoalPlan } from "@/lib/goal";
import { displayScore, tf, type Lang } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { PRICING, type RateTier } from "@/lib/pricing";
import { aprText, goalStrings } from "@/lib/strings/goal";
import { cn } from "@/lib/utils";

type ZoneId = RateTier["id"] | "declined";
interface Zone {
  id: ZoneId;
  lo: number;
  hi: number;
  apr: number;
}

/** Score zones lowest first: declined below the cut-off, then each pricing tier. */
function zones(): Zone[] {
  const tiers = [...PRICING.tiers].sort((a, b) => a.minScore - b.minScore);
  const out: Zone[] = [{ id: "declined", lo: 300, hi: MODEL.thresholdScore, apr: PRICING.declinedAlternativeApr }];
  tiers.forEach((tier, i) => out.push({ id: tier.id, lo: tier.minScore, hi: tiers[i + 1]?.minScore ?? 900, apr: tier.apr }));
  return out;
}

const ZONE_STYLE: Record<ZoneId, string> = {
  declined: "bg-danger-soft text-danger-foreground",
  fair: "bg-pastel-butter text-deep-butter",
  good: "bg-pastel-sky text-deep-sky",
  "very-good": "bg-pastel-stone text-deep-stone",
  excellent: "bg-pastel-mint text-deep-mint",
};

/** Equal-width zones so the narrow tier bands stay readable; position is linear inside each zone. */
function position(score: number, zs: Zone[]): number {
  const s = Math.min(900, Math.max(300, score));
  const i = Math.max(0, zs.findIndex((z, k) => s < z.hi || k === zs.length - 1));
  const z = zs[i];
  return ((i + (s - z.lo) / Math.max(1, z.hi - z.lo)) / zs.length) * 100;
}

/** Place a marker label centred on `p`%, but pinned inside the track near either edge. */
function labelPlacement(p: number): { className: string; style: CSSProperties } {
  if (p < 14) return { className: "", style: { left: 0 } };
  if (p > 86) return { className: "", style: { right: 0 } };
  return { className: "-translate-x-1/2", style: { left: `${p}%` } };
}

export function ScoreGoalCard({ gp, lang }: { gp: GoalPlan; lang: Lang }) {
  const s = goalStrings(lang);
  const zs = zones();
  const current = displayScore(gp.currentScore, !gp.declinedToday);
  const goalPos = position(gp.targetScore, zs);
  const todayPos = position(gp.currentScore, zs);
  const goalLabel = labelPlacement(goalPos);
  const todayLabel = labelPlacement(todayPos);
  const todayZone: ZoneId = gp.currentTier?.id ?? "declined";
  const goalZone: ZoneId = gp.targetTier.id;

  return (
    <section aria-labelledby="goal-score-heading" className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <h2 id="goal-score-heading" className="text-xl font-bold tracking-tight">
            {s.card.heading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{s.card.sub}</p>

          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">{s.card.todayScore}</p>
              <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
                <CountUp value={current} />
              </p>
            </div>
            <ArrowRight aria-hidden className="mb-3 size-5 text-muted-foreground" />
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">{s.card.goalScore}</p>
              <p className="text-4xl font-extrabold tracking-tight text-primary tabular-nums sm:text-5xl">
                <CountUp value={gp.targetScore} />
              </p>
            </div>
            <span
              className={cn(
                "mb-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold",
                gp.meetsToday ? "bg-success-soft text-success-foreground" : "bg-pastel-peach text-deep-peach",
              )}
            >
              {gp.meetsToday ? <CircleCheck aria-hidden className="size-4" /> : <Flag aria-hidden className="size-4" />}
              {gp.meetsToday ? s.card.goalMet : tf(s.card.pointsToGo, { n: Math.max(1, gp.targetScore - current) })}
            </span>
          </div>

          {/* Gauge */}
          <div
            role="img"
            aria-label={tf(s.card.gaugeAria, { current, goal: gp.targetScore, threshold: MODEL.thresholdScore })}
            className="relative mt-6 pt-9 pb-9"
          >
            <span
              className={cn(
                "absolute top-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary-foreground",
                goalLabel.className,
              )}
              style={goalLabel.style}
            >
              {s.card.yourGoal} · {gp.targetScore}
            </span>
            <div className="flex h-8 overflow-hidden rounded-full ring-1 ring-foreground/5">
              {zs.map((z) => (
                <div
                  key={z.id}
                  className={cn("flex flex-1 items-center justify-center text-[11px] font-semibold tabular-nums", ZONE_STYLE[z.id])}
                >
                  {z.id === "declined" ? `<${z.hi}` : `${z.lo}+`}
                </div>
              ))}
            </div>
            <span
              aria-hidden
              className="absolute top-8 h-10 w-0.5 -translate-x-1/2 rounded-full bg-primary transition-[left] duration-500"
              style={{ left: `${goalPos}%` }}
            />
            <span
              aria-hidden
              className="absolute top-[2.75rem] size-4 -translate-x-1/2 rounded-full border-2 border-card bg-foreground shadow-sm transition-[left] duration-500"
              style={{ left: `${todayPos}%` }}
            />
            <span
              className={cn(
                "absolute bottom-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-foreground",
                todayLabel.className,
              )}
              style={todayLabel.style}
            >
              {s.card.youToday} · {current}
            </span>
          </div>
        </div>

        {/* Tier ladder */}
        <div>
          <h3 className="text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{s.card.ladder}</h3>
          <ol className="mt-3 grid gap-1.5">
            {[...zs].reverse().map((z) => {
              const isGoal = z.id === goalZone;
              const isToday = z.id === todayZone;
              return (
                <li
                  key={z.id}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-sm",
                    isGoal ? "bg-secondary ring-2 ring-primary/30" : isToday ? "bg-muted" : "",
                  )}
                >
                  <span aria-hidden className={cn("size-3 rounded-full ring-1 ring-foreground/10", ZONE_STYLE[z.id])} />
                  <span className="min-w-0">
                    <span className="font-semibold">{s.tiers[z.id]}</span>{" "}
                    <span className="text-muted-foreground tabular-nums">
                      {z.id === "declined" ? tf(s.card.belowRange, { score: z.hi }) : tf(s.card.tierRange, { score: z.lo })}
                    </span>
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {z.id === "declined" ? (
                      <span className="text-xs font-medium text-muted-foreground">{tf(s.card.declinedApr, { apr: aprText(z.apr) })}</span>
                    ) : (
                      tf(s.card.aprShort, { apr: aprText(z.apr) })
                    )}
                  </span>
                  {(isGoal || isToday) && (
                    <span className="col-span-3 col-start-1 flex flex-wrap gap-1.5 pl-6">
                      {isToday && (
                        <span className="rounded-md bg-pastel-butter px-2 py-0.5 text-[11px] font-semibold text-deep-butter">{s.card.youToday}</span>
                      )}
                      {isGoal && (
                        <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{s.card.yourGoal}</span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
