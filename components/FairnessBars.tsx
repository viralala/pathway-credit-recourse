"use client";

import { useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tf } from "@/lib/i18n";

export interface FairnessDatum {
  group: string;
  effort: number;
  n: number;
}

const MOST = "var(--chart-2)";
const LEAST = "var(--chart-3)";
const OTHER = "var(--chart-1)";

/** Width reserved for the group labels on the left. */
const LABEL_WIDTH = 132;
const LINE = 14;

/** Greedy word wrap for SVG text: short lines so long localized labels never collide with the bars. */
function wrap(text: string, max = 18): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/**
 * Risk-adjusted mean plan effort per group, as horizontal bars so long localized group names stay
 * readable on a phone. The highest and lowest bars are also named in words under their label
 * ("most effort" / "least effort"), so colour is never the only signal. To assistive tech the chart
 * is one image: `ariaLabel` must summarise every value (the page renders the same data as a table).
 */
export function FairnessBars({
  data,
  ariaLabel,
  mostLabel,
  leastLabel,
  seriesName,
  valueTemplate,
}: {
  data: FairnessDatum[];
  ariaLabel: string;
  mostLabel: string;
  leastLabel: string;
  seriesName: string;
  /** Tooltip value, e.g. "{v} effort (n={n})". */
  valueTemplate: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((d) => d.effort));
  const min = Math.min(...data.map((d) => d.effort));
  const tagFor = (effort: number) => (effort === max ? mostLabel : effort === min ? leastLabel : null);
  const fillFor = (effort: number) => (effort === max ? MOST : effort === min ? LEAST : OTHER);
  const byGroup = new Map(data.map((d) => [d.group, d]));

  const renderTick = ({ x, y, payload }: { x: number | string; y: number | string; payload: { value: unknown } }) => {
    const label = String(payload.value);
    const d = byGroup.get(label);
    const tag = d ? tagFor(d.effort) : null;
    const lines = wrap(label);
    const total = lines.length + (tag ? 1 : 0);
    const first = -((total - 1) * LINE) / 2 + 4;
    return (
      <g transform={`translate(${Number(x) - 10},${Number(y)})`}>
        <text textAnchor="end" fontSize={11.5}>
          {lines.map((line, i) => (
            <tspan key={i} x={0} y={first + i * LINE} fill="var(--foreground)" fontWeight={600}>
              {line}
            </tspan>
          ))}
          {tag ? (
            <tspan x={0} y={first + lines.length * LINE} fill="var(--muted-foreground)" fontSize={10.5}>
              {tag}
            </tspan>
          ) : null}
        </text>
      </g>
    );
  };

  return (
    <div role="img" aria-label={ariaLabel} className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
          barCategoryGap="22%"
          accessibilityLayer={false}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="group"
            width={LABEL_WIDTH}
            interval={0}
            tick={renderTick}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--muted) 70%, transparent)" }}
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 13,
            }}
            formatter={(v, _n, item) => [
              tf(valueTemplate, { v: Number(v).toFixed(2), n: (item.payload as FairnessDatum).n }),
              seriesName,
            ]}
          />
          <Bar dataKey="effort" maxBarSize={44} radius={[0, 10, 10, 0]} isAnimationActive={reduce === false}>
            {data.map((d) => (
              <Cell key={d.group} fill={fillFor(d.effort)} />
            ))}
            <LabelList
              dataKey="effort"
              position="right"
              formatter={(v) => Number(v).toFixed(2)}
              style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
