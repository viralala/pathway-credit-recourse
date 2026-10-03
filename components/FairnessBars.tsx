"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FairnessBars({ data }: { data: { group: string; effort: number; n: number }[] }) {
  const max = Math.max(...data.map((d) => d.effort));
  const min = Math.min(...data.map((d) => d.effort));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="var(--rose)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="group" tick={{ fill: "var(--brown)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--rose)" }} />
          <YAxis tick={{ fill: "var(--brown)", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(213,190,183,0.25)" }}
            contentStyle={{ background: "var(--paper)", border: "1px solid var(--rose)", borderRadius: 0, fontSize: 13 }}
            formatter={(v, _n, item) => [`${Number(v).toFixed(2)} effort (n=${(item.payload as { n: number }).n})`, "Risk-adjusted mean"]}
          />
          <Bar dataKey="effort" maxBarSize={72} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.group} fill={d.effort === max ? "var(--red)" : d.effort === min ? "var(--indigo)" : "var(--orange)"} />
            ))}
            <LabelList dataKey="effort" position="top" formatter={(v) => Number(v).toFixed(2)} style={{ fill: "var(--ink)", fontSize: 12, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
