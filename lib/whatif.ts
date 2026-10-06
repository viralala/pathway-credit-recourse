import { MODEL, clean, contribution, isApproved, score } from "./model";
import { PRICING, aprForScore, emi, totalInterest } from "./pricing";
import { agedLateCount } from "./recourse";
import { APPLICANT_LIMITS } from "./security/validate";
import type { Applicant, ModelFeatureKey } from "./types";

/** What the person moves on the what-if sliders. A missing field leaves that input as it is. */
export interface WhatIfChanges {
  /** New card utilization, as a fraction (0.4 = 40%). */
  utilization?: number;
  /** New debt ratio (EMIs over income), as a fraction. This is the ratio itself, not a cut. */
  debtRatio?: number;
  /** Raise in monthly income as a fraction, 0..0.3. Income that was not provided stays not provided. */
  incomeGrowth?: number;
  openCreditLines?: number;
  /** Months of clean repayment, 0..24. Real late-payment counts age out; special codes do not. */
  monthsWaited?: number;
}

export interface WhatIfResult {
  applicant: Applicant;
  score: number;
  approved: boolean;
  /** Score change against the applicant as given (unrounded). */
  delta: number;
  /** Score points still missing for approval; 0 when approved. */
  pointsToApproval: number;
  /** Prime-lender APR at this score, or null when it would decline. */
  apr: number | null;
  emi: number | null;
  totalInterest: number | null;
  /** Interest saved on the same loan against today's score; null if either side has no APR. */
  interestSaved: number | null;
}

/** The applicant after the changes. Pure: the input is never modified. */
export function applyChanges(a: Applicant, c: WhatIfChanges): Applicant {
  const next: Applicant = { ...a };
  if (c.utilization !== undefined) next.utilization = c.utilization;
  if (c.debtRatio !== undefined) next.debtRatio = c.debtRatio;
  if (c.openCreditLines !== undefined) next.openCreditLines = c.openCreditLines;
  // NaN * anything is NaN, so a missing income stays missing.
  if (c.incomeGrowth !== undefined) next.monthlyIncome = Math.min(APPLICANT_LIMITS.monthlyIncome.max, a.monthlyIncome * (1 + c.incomeGrowth));
  if (c.monthsWaited !== undefined && c.monthsWaited > 0) {
    next.late30 = agedLateCount(a.late30, c.monthsWaited);
    next.late60 = agedLateCount(a.late60, c.monthsWaited);
    next.late90 = agedLateCount(a.late90, c.monthsWaited);
  }
  return next;
}

/** Score, decision and loan terms for an applicant after the changes, on one loan (default: PRICING.defaultLoan). */
export function whatIf(a: Applicant, c: WhatIfChanges, loan: { amount?: number; termMonths?: number } = {}): WhatIfResult {
  const amount = loan.amount ?? PRICING.defaultLoan.amount;
  const termMonths = loan.termMonths ?? PRICING.defaultLoan.termMonths;
  const applicant = applyChanges(a, c);
  const s = score(applicant);
  const today = score(a);
  const apr = aprForScore(s);
  const todayApr = aprForScore(today);
  const interest = apr === null ? null : totalInterest(amount, apr, termMonths);
  const todayInterest = todayApr === null ? null : totalInterest(amount, todayApr, termMonths);
  return {
    applicant,
    score: s,
    approved: isApproved(applicant),
    delta: s - today,
    pointsToApproval: Math.max(0, MODEL.thresholdScore - s),
    apr,
    emi: apr === null ? null : emi(amount, apr, termMonths),
    totalInterest: interest,
    interestSaved: interest === null || todayInterest === null ? null : todayInterest - interest,
  };
}

/**
 * Signed Pathway score points each model feature adds for this applicant (positive = helps the
 * score). Same arithmetic as reasons() in lib/model.ts, with the sign flipped. Unclamped, the
 * score is `base + sum of points`, where base is the score of the average applicant.
 */
export function contributions(a: Applicant): { key: ModelFeatureKey; points: number }[] {
  const ptsPerLogit = MODEL.pointsToDoubleOdds / Math.LN2;
  const x = clean(a);
  return MODEL.features.map((f) => ({ key: f.key, points: -contribution(f, x[f.key]) * ptsPerLogit }));
}
