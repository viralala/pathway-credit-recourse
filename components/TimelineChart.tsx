"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Timeline } from "@/lib/timeline";

export function TimelineChart({
  timeline,
  labels,
}: {
  timeline: Timeline;
  labels: { withPlan: string; withoutPlan: string; month: string; threshold: string };
}) {
  const data = timeline.points.map((p) => ({
    month: p.month,
    plan: Math.round(p.score),
    baseline: Math.round(p.baselineScore),
  }));
  const lo = Math.max(300, Math.floor((Math.min(...data.map((d) => Math.min(d.plan, d.baseline))) - 20) / 50) * 50);
  const hi = Math.min(900, Math.ceil((Math.max(timeline.thresholdScore, ...data.map((d) => d.plan)) + 20) / 50) * 50);
  const am = timeline.approvalMonth;

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="var(--rose)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--brown)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--rose)" }}
            interval={5}
          />
          <YAxis
            domain={[lo, hi]}
            tick={{ fill: "var(--brown)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: "var(--paper)", border: "1px solid var(--rose)", borderRadius: 0, fontSize: 13 }}
            labelFormatter={(m) => `${labels.month} ${m}`}
            formatter={(v, name) => [v as number, name === "plan" ? labels.withPlan : labels.withoutPlan]}
          />
          <ReferenceLine
            y={timeline.thresholdScore}
            stroke="var(--orange)"
            strokeWidth={2}
            label={{ value: `${labels.threshold} ${timeline.thresholdScore}`, position: "insideTopLeft", fill: "var(--brown)", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="baseline" stroke="var(--plum)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="plan" stroke="var(--indigo)" strokeWidth={3} dot={false} isAnimationActive={false} />
          {am !== null && (
            <ReferenceDot x={am} y={data[am].plan} r={7} fill="var(--orange)" stroke="var(--indigo)" strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
