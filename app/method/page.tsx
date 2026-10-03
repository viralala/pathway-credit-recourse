import type { Metadata } from "next";
import Link from "next/link";
import { describeAssumptions, FEATURE_CLASS } from "@/lib/config";
import { MODEL } from "@/lib/model";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = { title: "How it works · Pathway" };

const CLASS_STYLE: Record<string, string> = {
  immutable: "bg-plum text-cream",
  actionable: "bg-orange text-ink",
  "slow-moving": "bg-rose text-brown",
};

export default function MethodPage() {
  const stats = [
    { k: "Model AUC", v: metrics.auc.toFixed(3), c: "bg-indigo text-cream" },
    { k: "Plans that flip the decision", v: `${(metrics.planSuccessRate * 100).toFixed(0)}%`, c: "bg-orange text-ink" },
    { k: "Median months to approval", v: String(metrics.medianMonthsToApproval), c: "bg-paper" },
    { k: "Recourse effort gap", v: `${(metrics.fairnessGap * 100).toFixed(1)}%`, c: "bg-red text-cream" },
  ];
  const steps = [
    { t: "Train offline", d: "ml/train.py fits logistic regression in Python on Give Me Some Credit, or a synthetic equivalent." },
    { t: "Export", d: "Coefficients, scaler, intercept and threshold go to lib/model.json. No Python runs in production." },
    { t: "Recourse engine", d: "TypeScript searches every feasible change set and scores each one exactly with the linear model." },
    { t: "Timeline", d: "A month-by-month simulator moves each change at a capped pace and finds the approval month." },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="bg-indigo p-8 text-cream sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">How it works</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          An interpretable model, so every reason and every plan is exact.
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-px bg-rose lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className={`p-6 ${s.c}`}>
            <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">{s.k}</p>
            <p className="mt-3 text-4xl font-extrabold tracking-tight">{s.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-brown">
        Data: {metrics.dataNote}. {metrics.rejectedEvaluated} rejected hold-out applicants evaluated by the same TypeScript engine the app
        ships.
      </p>

      <ol className="mt-10 grid gap-3 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.t} className="bg-paper p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-orange font-extrabold text-ink">{i + 1}</span>
            <p className="mt-4 text-lg font-extrabold text-indigo">{s.t}</p>
            <p className="mt-1 text-sm text-brown">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="bg-paper p-6">
          <h2 className="text-xl font-extrabold text-indigo">Features and what a plan may do with them</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-rose text-left text-brown/80">
                <th className="py-2 font-semibold">Feature</th>
                <th className="py-2 font-semibold">Class</th>
                <th className="py-2 text-right font-semibold">Coefficient</th>
              </tr>
            </thead>
            <tbody>
              {MODEL.features.map((f) => (
                <tr key={f.key} className="border-b border-rose/60">
                  <td className="py-2 font-semibold">{f.label}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs font-bold ${CLASS_STYLE[FEATURE_CLASS[f.key]]}`}>{FEATURE_CLASS[f.key]}</span>
                  </td>
                  <td className="py-2 text-right font-mono">{f.coef >= 0 ? "+" : ""}{f.coef.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-brown">
            Standardized coefficients on the log-odds of serious delinquency; positive means riskier. Income enters as log(1 + income).
          </p>
        </div>
        <div className="bg-brown p-6 text-cream">
          <h2 className="text-xl font-extrabold">Assumptions (lib/config.ts)</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {describeAssumptions().map((x) => (
              <div key={x.label}>
                <dt className="font-bold text-orange">{x.label}</dt>
                <dd className="text-cream/80">{x.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-cream/80">
            Approval cut-off: Pathway score {MODEL.thresholdScore} (predicted default probability ≤ {(MODEL.threshold * 100).toFixed(2)}%,
            which rejects the riskiest 20% of training applicants). Every {MODEL.pointsToDoubleOdds} points doubles the odds of repaying.
          </p>
          <Link href="/fairness" className="mt-6 inline-block bg-orange px-5 py-2.5 text-sm font-bold text-ink">
            See the fairness audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
