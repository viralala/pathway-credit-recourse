import modelJson from "./model.json";
import type { Applicant, CreditModel, FeatureKey, ModelFeature } from "./types";

export const MODEL = modelJson as CreditModel;

const clip = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export function featureValue(f: ModelFeature, raw: number): number {
  const v = clip(Number.isFinite(raw) ? raw : 0, f.clip);
  return f.log1p ? Math.log1p(v) : v;
}

/** Standardized feature value × coefficient: this feature's push on the log-odds of default. */
export function contribution(f: ModelFeature, raw: number): number {
  return (f.coef * (featureValue(f, raw) - f.mean)) / f.std;
}

export function logit(a: Applicant, model: CreditModel = MODEL): number {
  let z = model.intercept;
  for (const f of model.features) z += contribution(f, a[f.key]);
  return z;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const logitOf = (p: number) => Math.log(p / (1 - p));

/** Probability of serious delinquency within two years. */
export function probabilityOfDefault(a: Applicant, model: CreditModel = MODEL): number {
  return sigmoid(logit(a, model));
}

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
  return logit(a, model) <= thresholdLogit(model);
}

export interface Reason {
  key: FeatureKey;
  label: string;
  /** Log-odds points this feature adds relative to the average applicant (positive = hurts). */
  impact: number;
  /** Equivalent Pathway score points lost. */
  points: number;
  value: number;
}

/**
 * Adverse-action reason codes: features ranked by how much they raise risk
 * compared with the average applicant in the training data.
 */
export function reasons(a: Applicant, model: CreditModel = MODEL, limit = 4): Reason[] {
  const ptsPerLogit = model.pointsToDoubleOdds / Math.LN2;
  return model.features
    .map((f) => {
      const impact = contribution(f, a[f.key]);
      return { key: f.key, label: f.label, impact, points: impact * ptsPerLogit, value: a[f.key] };
    })
    .filter((r) => r.impact > 0.01)
    .sort((x, y) => y.impact - x.impact)
    .slice(0, limit);
}

export interface Assessment {
  score: number;
  pd: number;
  approved: boolean;
  reasons: Reason[];
}

export function assess(a: Applicant, model: CreditModel = MODEL): Assessment {
  const z = logit(a, model);
  return {
    score: scoreFromLogit(z, model),
    pd: sigmoid(z),
    approved: z <= thresholdLogit(model),
    reasons: reasons(a, model),
  };
}
