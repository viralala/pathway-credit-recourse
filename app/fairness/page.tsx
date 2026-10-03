import type { Metadata } from "next";
import { FairnessBars } from "@/components/FairnessBars";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = { title: "Fairness audit · Pathway" };

type Group = { group: string; n: number; adjustedEffort: number | null; noPlanRate: number; medianMonths: number | null };

function Panel({ title, groups, ratio }: { title: string; groups: Group[]; ratio: number }) {
  const data = groups.filter((g) => g.adjustedEffort !== null).map((g) => ({ group: g.group, effort: g.adjustedEffort!, n: g.n }));
  return (
    <div className="bg-paper p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-extrabold text-indigo">{title}</h2>
        <span className="bg-orange px-2.5 py-1 text-sm font-extrabold text-ink">{((ratio - 1) * 100).toFixed(1)}% gap</span>
      </div>
      <div className="mt-4">
        <FairnessBars data={data} />
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-rose text-left text-brown/80">
            <th className="py-2 font-semibold">Group</th>
            <th className="py-2 text-right font-semibold">Rejected</th>
            <th className="py-2 text-right font-semibold">Adj. effort</th>
            <th className="py-2 text-right font-semibold">No plan</th>
            <th className="py-2 text-right font-semibold">Median months</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.group} className="border-b border-rose/60">
              <td className="py-2 font-semibold">{g.group}</td>
              <td className="py-2 text-right">{g.n}</td>
              <td className="py-2 text-right">{g.adjustedEffort?.toFixed(2) ?? "n/a"}</td>
              <td className="py-2 text-right">{(g.noPlanRate * 100).toFixed(0)}%</td>
              <td className="py-2 text-right">{g.medianMonths ?? "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FairnessPage() {
  const f = metrics.fairness;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="bg-indigo p-8 text-cream sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">Fairness audit</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            At the same risk, who has to work harder?
          </h1>
          <p className="mt-4 max-w-xl text-cream/80">{f.method}</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-rose">
          {[
            { k: "Headline effort gap", v: `${(metrics.fairnessGap * 100).toFixed(1)}%`, s: `${f.fairnessGapHighest} vs ${f.fairnessGapLowest}`, c: "bg-red text-cream" },
            { k: "Age gap", v: `${((f.ageGapRatio - 1) * 100).toFixed(1)}%`, s: "most vs least effort band", c: "bg-paper" },
            { k: "Income gap", v: `${((f.incomeGapRatio - 1) * 100).toFixed(1)}%`, s: "most vs least effort band", c: "bg-paper" },
            { k: "Rejected applicants audited", v: String(metrics.rejectedEvaluated), s: `${metrics.dataSource} hold-out data`, c: "bg-orange text-ink" },
          ].map((x) => (
            <div key={x.k} className={`flex flex-col justify-between p-5 ${x.c}`}>
              <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">{x.k}</span>
              <span className="mt-4 text-4xl font-extrabold tracking-tight">{x.v}</span>
              <span className="mt-1 text-xs opacity-80">{x.s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By age band" groups={f.age} ratio={f.ageGapRatio} />
        <Panel title="By income band" groups={f.income} ratio={f.incomeGapRatio} />
      </div>

      <div className="mt-6 grid gap-6 bg-brown p-6 text-sm text-cream sm:grid-cols-3 sm:p-8">
        <div>
          <p className="font-bold text-orange">What “effort” means</p>
          <p className="mt-1 text-cream/80">
            The weighted size of the lowest-effort plan: 1 point per 10 points of card utilization paid down, 1.2 per 10% cut in debt
            payments, 2.5 per 5% income growth, 0.15 per month of waiting. Weights live in <code>lib/config.ts</code>.
          </p>
        </div>
        <div>
          <p className="font-bold text-orange">How groups are compared</p>
          <p className="mt-1 text-cream/80">
            Risk bands by Pathway score: {f.riskBands.map(([lo, hi]) => `${lo}–${hi}`).join(", ")}. Each group&apos;s mean effort is
            re-weighted to the overall risk mix, so a gap is not just “this group is riskier”.
          </p>
        </div>
        <div>
          <p className="font-bold text-orange">Read with care</p>
          <p className="mt-1 text-cream/80">
            {metrics.dataNote}. Age is never changed by a plan, but it is a model input, so it shapes how much other change is needed.
            That is exactly what this audit makes visible.
          </p>
        </div>
      </div>
    </div>
  );
}
