import metaJson from "./model.meta.json";
import modelJson from "./model.json";
import type { Applicant, CreditModel, DerivedFeatureKey, FeatureKey, ModelFeature, ModelFeatureKey, ModelInput } from "./types";

export const MODEL = modelJson as CreditModel;

/**
 * Cleaning rules and training medians, exported by ml/export_model.py from the Phase 6
 * training report. They are the same numbers ml/preprocess.py uses; nothing is redefined here.
 */
export const PREPROCESSING = metaJson.preprocessing;

export const INPUT_KEYS: FeatureKey[] = ["utilization", "late30", "late60", "late90", "monthlyIncome", "debtRatio", "openCreditLines"];
export const DERIVED_KEYS: DerivedFeatureKey[] = ["lateSpecialCode", "incomeMissing", "incomePlaceholder"];
const notANumber = (v: unknown) => typeof v !== "number" || Number.isNaN(v);

/** True when a late-payment count is a bureau special code (96/98), not a real count. */
export const isLateSpecialCode = (count: number) => count >= PREPROCESSING.lateSpecialCodeMin;

/** True when the income cannot be used as an income: not provided, or a 0/1 placeholder. */
export const isIncomeUnusable = (income: number) => Number.isNaN(income) || income <= PREPROCESSING.incomePlaceholderMax;

/** True when the utilization is a data error that the cleaning replaces with the training median. */
export const isUtilizationInvalid = (utilization: number) => utilization > PREPROCESSING.utilizationInvalidAbove;

/**
 * The cleaning ml/preprocess.py applies before the model sees an applicant, for the features the
 * model uses. A normal applicant passes through unchanged with all three flags at 0.
 *
 * Only a missing income (NaN) is a gap the model was trained to handle. Any other non-number
 * is an error and throws rather than being scored as if it were 0.
 */
export function clean(a: Applicant): ModelInput {
  const { utilization, late30, late60, late90, monthlyIncome, debtRatio, openCreditLines } = a;
  if (
    typeof monthlyIncome !== "number" ||
    notANumber(utilization) ||
    notANumber(late30) ||
    notANumber(late60) ||
    notANumber(late90) ||
    notANumber(debtRatio) ||
    notANumber(openCreditLines)
  ) {
    const key = INPUT_KEYS.find((k) => (k === "monthlyIncome" ? typeof a[k] !== "number" : notANumber(a[k])));
    throw new RangeError(`applicant.${key} must be a number, got ${String(a[key!])}`);
  }
  // Written out field by field (no loops or closures): this runs for every scored state.
  const p = PREPROCESSING;
  const special30 = late30 >= p.lateSpecialCodeMin;
  const special60 = late60 >= p.lateSpecialCodeMin;
  const special90 = late90 >= p.lateSpecialCodeMin;
  const incomeMissing = Number.isNaN(monthlyIncome);
  const incomePlaceholder = monthlyIncome <= p.incomePlaceholderMax;
  const incomeUnusable = incomeMissing || incomePlaceholder;
  return {
    utilization: utilization > p.utilizationInvalidAbove ? p.medians.utilization : utilization,
    late30: special30 ? p.lateSpecialReplacement : late30,
    late60: special60 ? p.lateSpecialReplacement : late60,
    late90: special90 ? p.lateSpecialReplacement : late90,
    lateSpecialCode: special30 || special60 || special90 ? 1 : 0,
    monthlyIncome: incomeUnusable ? p.medians.monthlyIncome : monthlyIncome,
    // Without a usable income the debt ratio is a debt amount, not a ratio.
    debtRatio: incomeUnusable ? p.medians.debtRatio : debtRatio,
    openCreditLines,
    incomeMissing: incomeMissing ? 1 : 0,
    incomePlaceholder: incomePlaceholder ? 1 : 0,
  };
}

const clip = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

/** Floor, cap and log of a CLEANED value: what gets standardized. */
export function featureValue(f: ModelFeature, cleaned: number): number {
  const v = clip(cleaned, f.clip);
  return f.log1p ? Math.log1p(v) : v;
}

/** Standardized feature value × coefficient: this feature's push on the log-odds of default. `cleaned` comes from `clean()`. */
export function contribution(f: ModelFeature, cleaned: number): number {
  return (f.coef * (featureValue(f, cleaned) - f.mean)) / f.std;
}

export function logitOfInput(x: ModelInput, model: CreditModel = MODEL): number {
  let z = model.intercept;
  for (const f of model.features) z += contribution(f, x[f.key]);
  return z;
}

export function logit(a: Applicant, model: CreditModel = MODEL): number {
  return logitOfInput(clean(a), model);
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const logitOf = (p: number) => Math.log(p / (1 - p));

/** Probability of serious delinquency within two years. */
export function probabilityOfDefault(a: Applicant, model: CreditModel = MODEL): number {
  return sigmoid(logit(a, model));
}

/**
 * The decision rule, identical to ml/select_cutoff.py: approve when the probability of default
 * is BELOW the cut-off, reject when it is at or above it.
 */
export function approvesProbability(probability: number, model: CreditModel = MODEL): boolean {
  return probability < model.threshold;
}

/** The decision for a log-odds value. Every approve/reject in the app goes through this. */
export function approvesLogit(z: number, model: CreditModel = MODEL): boolean {
  return approvesProbability(sigmoid(z), model);
}

/** Log-odds at the cut-off. Used for the score scale; decisions use `approvesLogit`. */
export function thresholdLogit(model: CreditModel = MODEL): number {
  return logitOf(model.threshold);
}

/**
 * Pathway score: a scorecard on the log-odds scale where the approval cut-off is
 * `thresholdScore` and every `pointsToDoubleOdds` points doubles the odds of repaying.
 */
export function scoreFromLogit(z: number, model: CreditModel = MODEL): number {
  const s = model.thresholdScore + (model.pointsToDoubleOdds / Math.LN2) * (thresholdLogit(model) - z);
  return Math.max(300, Math.min(900, s));
}

export function score(a: Applicant, model: CreditModel = MODEL): number {
  return scoreFromLogit(logit(a, model), model);
}

export function isApproved(a: Applicant, model: CreditModel = MODEL): boolean {
  return approvesLogit(logit(a, model), model);
}

export interface Reason {
  key: ModelFeatureKey;
  label: string;
  /** Log-odds points this feature adds relative to the average applicant (positive = hurts). */
  impact: number;
  /** Equivalent Pathway score points lost. */
  points: number;
  /** The applicant's own value for an input; 1 for a flag. */
  value: number;
}

const isDerived = (key: ModelFeatureKey): key is DerivedFeatureKey => (DERIVED_KEYS as ModelFeatureKey[]).includes(key);

/**
 * Adverse-action reason codes: features ranked by how much they raise risk
 * compared with the average applicant in the training data.
 *
 * A reason is only given when what it says is true of this applicant:
 *  - a flag ("income not provided", ...) is a reason only when the flag is set. With the flag at
 *    0 the feature still moves the score a little, because the average training applicant is
 *    not at 0, but that is not something this applicant did;
 *  - an input the cleaning replaced (an unusable income, an out-of-range utilization, a
 *    special-coded late count) is never a reason, because the model did not use that value.
 */
export function reasons(a: Applicant, model: CreditModel = MODEL, limit = 4): Reason[] {
  const ptsPerLogit = model.pointsToDoubleOdds / Math.LN2;
  const x = clean(a);
  const out: Reason[] = [];
  for (const f of model.features) {
    const key = f.key;
    if (isDerived(key) ? x[key] !== 1 : x[key] !== a[key]) continue;
    const impact = contribution(f, x[key]);
    if (impact > 0.01) out.push({ key, label: f.label, impact, points: impact * ptsPerLogit, value: isDerived(key) ? 1 : a[key] });
  }
  return out.sort((p, q) => q.impact - p.impact).slice(0, limit);
}

export interface Assessment {
  score: number;
  pd: number;
  approved: boolean;
  reasons: Reason[];
}

export function assess(a: Applicant, model: CreditModel = MODEL): Assessment {
  const z = logit(a, model);
  const pd = sigmoid(z);
  return {
    score: scoreFromLogit(z, model),
    pd,
    approved: approvesProbability(pd, model),
    reasons: reasons(a, model),
  };
}
