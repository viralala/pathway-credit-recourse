import { MODEL, score } from "./model";
import { findRecourse } from "./recourse";
import { simulate } from "./timeline";
import type { Applicant, CreditModel } from "./types";

export interface ApplicantOutcome {
  score: number;
  age: number;
  income: number;
  feasible: boolean;
  effort: number | null;
  approvalMonth: number | null;
  /** The recommended plan's target state is approved by the model. */
  flips: boolean;
}

export interface GroupStat {
  group: string;
  n: number;
  /** Mean effort, directly standardized over risk bands so groups are compared at equal risk. */
  adjustedEffort: number | null;
  noPlanRate: number;
  medianMonths: number | null;
}

export const RISK_BANDS: [number, number][] = [
  [600, 650],
  [550, 600],
  [500, 550],
  [300, 500],
];
export const AGE_BANDS: { label: string; test: (a: number) => boolean }[] = [
  { label: "18–34", test: (a) => a < 35 },
  { label: "35–54", test: (a) => a >= 35 && a < 55 },
  { label: "55+", test: (a) => a >= 55 },
];
export const INCOME_BANDS: { label: string; test: (i: number) => boolean }[] = [
  { label: "Under $3,000/mo", test: (i) => i < 3000 },
  { label: "$3,000–6,000/mo", test: (i) => i >= 3000 && i < 6000 },
  { label: "$6,000+/mo", test: (i) => i >= 6000 },
];

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function evaluateApplicants(applicants: Applicant[], model: CreditModel = MODEL): ApplicantOutcome[] {
  const out: ApplicantOutcome[] = [];
  for (const a of applicants) {
    const r = findRecourse(a, model);
    if (r.status === "approved") continue;
    const plan = r.status === "plan" ? r.plan : null;
    const approvalMonth = plan ? simulate(a, plan, model).approvalMonth : null;
    out.push({
      score: score(a, model),
      age: a.age,
      income: a.monthlyIncome,
      feasible: !!plan,
      effort: plan ? plan.effort : null,
      approvalMonth,
      flips: plan ? plan.flipsDecision : false,
    });
  }
  return out;
}

function groupStats(rows: ApplicantOutcome[], bands: typeof AGE_BANDS, field: "age" | "income"): GroupStat[] {
  const total = rows.length;
  const riskShare = RISK_BANDS.map(([lo, hi]) => rows.filter((r) => r.score >= lo && r.score < hi).length / total);
  return bands.map((b) => {
    const g = rows.filter((r) => b.test(r[field]));
    let adj = 0;
    let wsum = 0;
    RISK_BANDS.forEach(([lo, hi], i) => {
      const efforts = g.filter((r) => r.score >= lo && r.score < hi && r.effort !== null).map((r) => r.effort!);
      if (efforts.length >= 5) {
        adj += riskShare[i] * (efforts.reduce((s, x) => s + x, 0) / efforts.length);
        wsum += riskShare[i];
      }
    });
    return {
      group: b.label,
      n: g.length,
      adjustedEffort: wsum > 0 ? adj / wsum : null,
      noPlanRate: g.length ? g.filter((r) => !r.feasible).length / g.length : 0,
      medianMonths: median(g.filter((r) => r.approvalMonth !== null).map((r) => r.approvalMonth!)),
    };
  });
}

const gapOf = (stats: GroupStat[]) => {
  const v = stats.map((s) => s.adjustedEffort).filter((x): x is number => x !== null);
  const hi = stats.reduce((a, b) => ((b.adjustedEffort ?? -1) > (a.adjustedEffort ?? -1) ? b : a));
  const lo = stats.reduce((a, b) => ((b.adjustedEffort ?? Infinity) < (a.adjustedEffort ?? Infinity) ? b : a));
  return { ratio: Math.max(...v) / Math.min(...v), highest: hi.group, lowest: lo.group };
};

export function summarize(rows: ApplicantOutcome[]) {
  const successes = rows.filter((r) => r.approvalMonth !== null);
  const age = groupStats(rows, AGE_BANDS, "age");
  const income = groupStats(rows, INCOME_BANDS, "income");
  const ageGap = gapOf(age);
  const incomeGap = gapOf(income);
  const worst = ageGap.ratio >= incomeGap.ratio ? { dimension: "age", ...ageGap } : { dimension: "income", ...incomeGap };
  return {
    rejectedEvaluated: rows.length,
    plansFound: rows.filter((r) => r.feasible).length,
    plansThatFlip: rows.filter((r) => r.flips).length,
    planSuccessRate: successes.length / rows.length,
    medianMonthsToApproval: median(successes.map((r) => r.approvalMonth!)),
    medianEffort: median(rows.filter((r) => r.effort !== null).map((r) => r.effort!)),
    fairness: {
      method:
        "Rejected applicants are split into Pathway-score risk bands; each group's mean plan effort is directly standardized to the overall risk-band mix, so groups are compared at the same risk level.",
      riskBands: RISK_BANDS,
      age,
      income,
      ageGapRatio: ageGap.ratio,
      incomeGapRatio: incomeGap.ratio,
      fairnessGap: worst.ratio - 1,
      fairnessGapDimension: worst.dimension,
      fairnessGapHighest: worst.highest,
      fairnessGapLowest: worst.lowest,
    },
  };
}
