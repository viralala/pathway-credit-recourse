"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { displayScore } from "@/lib/i18n";
import type { Timeline } from "@/lib/timeline";

/**
 * Projected score by month, with the approval line and the goal line. Purely visual: the caller wraps
 * it in an element with role="img" and an aria-label that states the data in words.
 */
export function GoalChart({
  timeline,
  goalMonth,
  labels,
}: {
  timeline: Timeline;
  /** Month the goal is reached (marked with a dot), or null. */
  goalMonth: number | null;
  labels: { score: string; month: string; goal: string };
}) {
  const data = timeline.points.map((p) => ({ month: p.month, score: displayScore(p.score, p.approved) }));
  const scores = data.map((d) => d.score);
  const min = Math.min(...scores, timeline.thresholdScore) - 25;
  const max = Math.max(...scores, timeline.targetScore) + 25;
  const tickStep = max - min <= 300 ? 50 : 100;
  const lo = Math.max(300, Math.floor(min / tickStep) * tickStep);
  const hi = Math.min(900, Math.ceil(max / tickStep) * tickStep);
  const ticks = Array.from({ length: Math.floor((hi - lo) / tickStep) + 1 }, (_, i) => lo + i * tickStep);
  const dot = goalMonth !== null ? data[goalMonth] : undefined;

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 12, bottom: 4, left: -12 }} accessibilityLayer={false}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={5}
          />
          <YAxis domain={[lo, hi]} ticks={ticks} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(m) => `${labels.month} ${m}`}
            formatter={(v) => [v as number, labels.score]}
          />
          {/* The legend above the chart names both lines; only the goal is labelled in place to avoid collisions. */}
          <ReferenceLine y={timeline.thresholdScore} stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 4" />
          <ReferenceLine
            y={timeline.targetScore}
            stroke="var(--chart-3)"
            strokeWidth={2}
            label={{ value: labels.goal, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Line type="stepAfter" dataKey="score" stroke="var(--chart-1)" strokeWidth={3} dot={false} isAnimationActive={false} />
          {dot && <ReferenceDot x={dot.month} y={dot.score} r={6} fill="var(--chart-3)" stroke="var(--card)" strokeWidth={2} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
