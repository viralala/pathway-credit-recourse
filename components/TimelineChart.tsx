"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UncertaintyBand } from "@/lib/montecarlo";
import type { Timeline } from "@/lib/timeline";

export interface TimelineChartLabels {
  withPlan: string;
  withoutPlan: string;
  month: string;
  threshold: string;
  /** Tooltip label for the shaded band. */
  band?: string;
}

/** Series colours, exported so the legend next to the chart always matches. */
export const TIMELINE_COLORS = {
  plan: "var(--chart-1)",
  baseline: "var(--chart-4)",
  band: "var(--chart-1)",
  threshold: "var(--chart-2)",
  approval: "var(--chart-3)",
} as const;

interface Row {
  month: number;
  plan: number;
  baseline: number;
  band?: [number, number];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function ChartTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  label?: string | number;
  labels: TimelineChartLabels;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Row | undefined;
  if (!row) return null;
  return (
    <div className="rounded-xl bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
      <p className="font-semibold">
        {labels.month} {label}
      </p>
      <p className="mt-1 flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: TIMELINE_COLORS.plan }} />
        {labels.withPlan}: <strong className="tabular-nums">{Math.round(row.plan)}</strong>
      </p>
      <p className="flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: TIMELINE_COLORS.baseline }} />
        {labels.withoutPlan}: <strong className="tabular-nums">{Math.round(row.baseline)}</strong>
      </p>
      {row.band && labels.band && (
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-3 rounded-sm opacity-40" style={{ background: TIMELINE_COLORS.band }} />
          {labels.band}:{" "}
          <strong className="tabular-nums">
            {Math.round(row.band[0])}–{Math.round(row.band[1])}
          </strong>
        </p>
      )}
    </div>
  );
}

/**
 * Month-by-month Pathway score: the plan (solid), doing nothing (dashed), the approval line and,
 * when `uncertainty` is given, the shaded 10th–90th percentile band of simulated futures.
 * The wrapper is an image to assistive tech, so pass a full summary as `ariaLabel`.
 */
export function TimelineChart({
  timeline,
  uncertainty,
  labels,
  ariaLabel,
}: {
  timeline: Timeline;
  uncertainty?: UncertaintyBand | null;
  labels: TimelineChartLabels;
  ariaLabel?: string;
}) {
  const data: Row[] = timeline.points.map((p, i) => {
    const b = uncertainty?.band[i];
    return {
      month: p.month,
      plan: round1(p.score),
      baseline: round1(p.baselineScore),
      ...(b ? { band: [round1(b.low), round1(b.high)] as [number, number] } : {}),
    };
  });
  const lows = data.map((d) => Math.min(d.plan, d.baseline, d.band ? d.band[0] : Infinity));
  const highs = data.map((d) => Math.max(d.plan, d.band ? d.band[1] : -Infinity));
  const lo = Math.max(300, Math.floor((Math.min(...lows) - 20) / 50) * 50);
  const hi = Math.min(900, Math.ceil((Math.max(timeline.thresholdScore, ...highs) + 20) / 50) * 50);
  const am = timeline.approvalMonth;

  return (
    <div role="img" aria-label={ariaLabel} className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -12 }} accessibilityLayer={false}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={5}
          />
          <YAxis
            domain={[lo, hi]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDataOverflow
          />
          <Tooltip
            cursor={{ stroke: "var(--ring)", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} labels={labels} />}
          />
          {uncertainty && (
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill={TIMELINE_COLORS.band}
              fillOpacity={0.16}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          <ReferenceLine
            y={timeline.thresholdScore}
            stroke={TIMELINE_COLORS.threshold}
            strokeWidth={2}
            label={{
              value: `${labels.threshold} ${timeline.thresholdScore}`,
              position: "insideTopLeft",
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke={TIMELINE_COLORS.baseline}
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="plan"
            stroke={TIMELINE_COLORS.plan}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4, fill: TIMELINE_COLORS.plan, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {am !== null && data[am] && (
            <ReferenceDot x={am} y={data[am].plan} r={7} fill={TIMELINE_COLORS.approval} stroke="var(--card)" strokeWidth={3} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
