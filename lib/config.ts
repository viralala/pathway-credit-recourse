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

/**
 * Monte Carlo assumptions for the "how sure is this timeline?" band. Real life does not follow a
 * plan at exactly the capped pace, so every simulated run draws its own pace and can be hit by
 * shocks. All values are illustrative and rendered in the UI via `describeUncertainty()`.
 */
export interface Uncertainty {
  runs: number;
  paceMultiplier: { mean: number; sd: number; min: number; max: number };
  incomeGrowthPerMonth: { mean: number; sd: number; min: number; max: number };
  shockChancePerMonth: number;
  shockMonths: [number, number];
  newLateChancePerMonth: number;
  percentiles: { low: number; mid: number; high: number };
}

export const UNCERTAINTY: Readonly<Uncertainty> = {
  /** Simulated futures per applicant. Seeded, so the same applicant always gets the same band. */
  runs: 400,
  /** Per-run multiplier on card paydown and debt-cut pace: normal(mean, sd), clamped to [min, max]. */
  paceMultiplier: { mean: 1, sd: 0.25, min: 0.4, max: 1.3 },
  /** Per-run monthly income growth: normal(mean, sd), clamped to [min, max]. Still capped by the plan's target. */
  incomeGrowthPerMonth: { mean: 0.006, sd: 0.004, min: 0, max: 0.015 },
  /** Chance per month of an income shock that pauses all progress. */
  shockChancePerMonth: 0.015,
  /** How long a shock pauses progress, in months (inclusive range). */
  shockMonths: [2, 3],
  /** Chance per month of a fresh 30–59-day late payment while on the plan. */
  newLateChancePerMonth: 0.006,
  /** Percentiles reported as the band and the "best / likely / worst case" months. */
  percentiles: { low: 0.1, mid: 0.5, high: 0.9 },
};

/** Plain-English description of the Monte Carlo assumptions, rendered next to the band. */
export function describeUncertainty(u: Uncertainty = UNCERTAINTY): { label: string; value: string }[] {
  const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
  return [
    { label: "Simulated futures", value: `${u.runs} per applicant (seeded, repeatable)` },
    { label: "Pace of paydown", value: `${pct(u.paceMultiplier.min)}–${pct(u.paceMultiplier.max)} of the plan's pace, centred on ${pct(u.paceMultiplier.mean)}` },
    { label: "Income growth", value: `${pct(u.incomeGrowthPerMonth.min, 1)}–${pct(u.incomeGrowthPerMonth.max, 1)} per month, centred on ${pct(u.incomeGrowthPerMonth.mean, 1)}` },
    { label: "Income shocks", value: `${pct(u.shockChancePerMonth, 1)} chance a month, pausing progress ${u.shockMonths[0]}–${u.shockMonths[1]} months` },
    { label: "New late payment", value: `${pct(u.newLateChancePerMonth, 1)} chance a month` },
    { label: "Band shown", value: `${Math.round(u.percentiles.low * 100)}th to ${Math.round(u.percentiles.high * 100)}th percentile; "likely" is the median` },
  ];
}

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
