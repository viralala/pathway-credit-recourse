"use client";

import { CalendarClock, Shuffle, Target } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { describeAssumptions, UNCERTAINTY } from "@/lib/config";
import { displayScore, likelyText, monthsText, splitAt, tf, uncertaintyRows, type Lang, type UIStrings } from "@/lib/i18n";
import type { UncertaintyBand } from "@/lib/montecarlo";
import type { Timeline } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { TIMELINE_COLORS, TimelineChart } from "../TimelineChart";
import { RowList } from "./RowList";
import { KICKER, SectionHeading } from "./SectionHeading";

/** Legend swatches drawn to match the chart's series. */
function Swatch({ kind }: { kind: "plan" | "baseline" | "band" | "threshold" | "approval" }) {
  if (kind === "band") return <span aria-hidden className="h-3 w-6 rounded-sm opacity-30" style={{ background: TIMELINE_COLORS.band }} />;
  if (kind === "approval")
    return <span aria-hidden className="size-3 rounded-full ring-2 ring-card" style={{ background: TIMELINE_COLORS.approval }} />;
  if (kind === "baseline") return <span aria-hidden className="h-0 w-6 border-t-2 border-dashed" style={{ borderColor: TIMELINE_COLORS.baseline }} />;
  return <span aria-hidden className="h-1 w-6 rounded-full" style={{ background: TIMELINE_COLORS[kind] }} />;
}

/** Section 4: deterministic timeline plus the Monte Carlo band of simulated futures. */
export function TimelineSection({
  ui,
  lang,
  timeline,
  uncertainty,
  approvalLabel,
  thresholdScore,
  horizon,
}: {
  ui: UIStrings;
  lang: Lang;
  timeline: Timeline;
  uncertainty: UncertaintyBand;
  /** Deterministic "Approved in N months" label (same as the score card). */
  approvalLabel: string;
  thresholdScore: number;
  horizon: number;
}) {
  const mc = ui.mc;
  const { months, approvalWithinHorizon, runs } = uncertainty;
  const sharePct = Math.round(approvalWithinHorizon * 100);
  const likely = likelyText(lang, months.mid, horizon);
  const rangeText =
    months.low === months.high
      ? tf(mc.rangeSame, { m: monthsText(lang, months.low, horizon) })
      : tf(mc.range, { low: monthsText(lang, months.low, horizon), high: monthsText(lang, months.high, horizon) });
  const shareText = tf(mc.share, { pct: `${sharePct}%`, runs, n: horizon });
  const [shareBefore, shareAfter] = splitAt(tf(mc.share, { runs, n: horizon }), "pct");
  const pLow = Math.round(UNCERTAINTY.percentiles.low * 100);
  const pHigh = Math.round(UNCERTAINTY.percentiles.high * 100);
  const first = timeline.points[0];
  const last = timeline.points[timeline.points.length - 1];
  const ariaLabel = tf(mc.chartLabel, {
    h: horizon,
    from: displayScore(first.score, first.approved),
    to: displayScore(last.score, last.approved),
    base: displayScore(last.baselineScore),
    threshold: thresholdScore,
    likely,
    share: shareText,
  });

  const legend = [
    { kind: "plan" as const, label: ui.withPlan },
    { kind: "baseline" as const, label: ui.withoutPlan },
    { kind: "band" as const, label: tf(mc.band, { low: pLow, high: pHigh }) },
    { kind: "threshold" as const, label: `${ui.threshold} ${thresholdScore}` },
    ...(timeline.approvalMonth !== null ? [{ kind: "approval" as const, label: mc.approvalDot }] : []),
  ];

  return (
    <section id="timeline" aria-labelledby="timeline-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="timeline-title" n={4} kicker={ui.when} title={ui.whenTitle} sub={ui.whenSub} tone="sky" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Reveal>
          <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-pastel-periwinkle text-deep-periwinkle">
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-3xl">{likely}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tf(mc.exact, { label: approvalLabel })}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl bg-pastel-sky p-4 text-deep-sky">
                <Target aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm font-semibold">{rangeText}</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-pastel-mint p-4 text-deep-mint">
                <Shuffle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm font-semibold">
                  {shareBefore}
                  <CountUp value={sharePct} format={(v) => `${Math.round(v)}%`} className="text-base font-extrabold tabular-nums" />
                  {shareAfter}
                </p>
              </div>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {legend.map((l) => (
                <li key={l.kind} className="flex items-center gap-2">
                  <Swatch kind={l.kind} />
                  {l.label}
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <TimelineChart
                timeline={timeline}
                uncertainty={uncertainty}
                ariaLabel={ariaLabel}
                labels={{ withPlan: ui.withPlan, withoutPlan: ui.withoutPlan, month: ui.month, threshold: ui.threshold, band: mc.tooltipRange }}
              />
            </div>

            <Accordion type="single" collapsible className="mt-4 border-t border-border">
              <AccordionItem value="how-sure">
                <AccordionTrigger className="py-4 text-sm font-bold">{mc.howSure}</AccordionTrigger>
                <AccordionContent className="pb-2">
                  <p className="text-sm text-pretty text-muted-foreground">
                    {tf(mc.howSureBody, { runs, width: pHigh - pLow })}
                  </p>
                  <RowList rows={uncertaintyRows(lang)} className="mt-4 sm:grid-cols-2" />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Reveal>

        <Reveal as="div" delay={0.1}>
          <aside aria-labelledby="assumptions-title" className="rounded-2xl bg-muted/70 p-6 ring-1 ring-foreground/5">
            <h3 id="assumptions-title" className={cn(KICKER, "text-muted-foreground")}>
              {ui.assumptions}
            </h3>
            <RowList rows={describeAssumptions()} lang="en" className="mt-4" />
            <p className="mt-5 text-xs text-muted-foreground">{ui.incomeUnits}</p>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
