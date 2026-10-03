import type { FeatureClass, FeatureKey } from "./types";

/**
 * Every assumption the recourse engine and timeline simulator make lives here,
 * and the UI renders this object verbatim, so nothing is hidden.
 */
export const ASSUMPTIONS = {
  /** Longest plan we are willing to recommend. */
  horizonMonths: 36,

  /** Card utilization can fall by at most this many points per month (0.06 = 6 pp). */
  utilizationPaydownPerMonth: 0.06,

  /** Monthly debt payments can be cut by this share of today's payments per month. */
  debtPaymentCutPerMonth: 0.05,
  /** Most we ever ask an applicant to cut monthly debt payments. */
  maxDebtPaymentCut: 0.5,

  /** Realistic income growth per month (0.006 ≈ 7.4% a year), applied until the plan target. */
  incomeGrowthPerMonth: 0.006,
  /** Income can never be assumed to rise by more than this over a plan. */
  maxIncomeGrowth: 0.15,

  /** Open credit lines may change by at most this many, taking effect after the lag. */
  maxOpenLineChange: 2,
  openLineLagMonths: 1,

  /** Late payments are counted over this rolling window, then age out. */
  delinquencyWindowMonths: 24,
  /** Waiting periods the engine may suggest so late payments age out. */
  waitOptionsMonths: [0, 3, 6, 9, 12, 18, 24],

  /** Effort cost of each kind of change, used to pick the lowest-effort plan. */
  effort: {
    per10ppUtilization: 1,
    per10pctDebtPaymentCut: 1.2,
    perOpenLineChange: 0.8,
    per5pctIncomeGrowth: 2.5,
    perMonthWaiting: 0.15,
  },

  /** Search grid resolution. */
  grid: {
    utilizationStep: 0.05,
    debtPaymentCutStep: 0.05,
    incomeGrowthStep: 0.025,
  },
} as const;

export type Assumptions = typeof ASSUMPTIONS;

export const FEATURE_CLASS: Record<FeatureKey, FeatureClass> = {
  age: "immutable",
  dependents: "immutable",
  realEstateLoans: "immutable",
  utilization: "actionable",
  debtRatio: "actionable",
  openCreditLines: "actionable",
  monthlyIncome: "slow-moving",
  late30: "slow-moving",
  late60: "slow-moving",
  late90: "slow-moving",
};

/** Plain-English descriptions of the assumptions, rendered in the UI and the report. */
export function describeAssumptions(a: Assumptions = ASSUMPTIONS): { label: string; value: string }[] {
  const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
  return [
    { label: "Plan horizon", value: `${a.horizonMonths} months maximum` },
    { label: "Card paydown pace", value: `up to ${pct(a.utilizationPaydownPerMonth)} points of utilization per month` },
    { label: "Debt payment reduction", value: `${pct(a.debtPaymentCutPerMonth)} of today's payments per month, ${pct(a.maxDebtPaymentCut)} max` },
    { label: "Income growth", value: `${pct(a.incomeGrowthPerMonth, 1)} per month, capped at +${pct(a.maxIncomeGrowth)} in total` },
    { label: "Open credit lines", value: `change by at most ${a.maxOpenLineChange}, effective after ${a.openLineLagMonths} month` },
    { label: "Late payments", value: `counted over ${a.delinquencyWindowMonths} months, assumed evenly spread, age out if every future payment is on time` },
    { label: "Never changed", value: "age, dependents, real-estate loans" },
  ];
}
