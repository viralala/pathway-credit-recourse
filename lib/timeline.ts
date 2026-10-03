import { ASSUMPTIONS, type Assumptions } from "./config";
import { MODEL, isApproved, score } from "./model";
import { agedCount, debtRatioAfter, type RecoursePlan } from "./recourse";
import type { Applicant, CreditModel } from "./types";

export interface TimelinePoint {
  month: number;
  score: number;
  /** Score if the applicant changes nothing (late payments still age out). */
  baselineScore: number;
  approved: boolean;
  state: Applicant;
}

export interface Timeline {
  points: TimelinePoint[];
  /** First month the plan reaches approval, or null if it never does within the horizon. */
  approvalMonth: number | null;
  baselineApprovalMonth: number | null;
  thresholdScore: number;
}

/** Applicant state `month` months into a plan: every action moves at its capped monthly pace. */
export function stateAt(
  applicant: Applicant,
  plan: Pick<RecoursePlan, "utilizationTarget" | "debtPaymentCut" | "incomeGrowth" | "openLineChange"> | null,
  month: number,
  a: Assumptions = ASSUMPTIONS,
): Applicant {
  const w = a.delinquencyWindowMonths;
  const aged = {
    late30: agedCount(applicant.late30, month, w),
    late60: agedCount(applicant.late60, month, w),
    late90: agedCount(applicant.late90, month, w),
  };
  if (!plan) return { ...applicant, ...aged };

  const utilization = Math.max(plan.utilizationTarget, applicant.utilization - a.utilizationPaydownPerMonth * month);
  const cut = Math.min(plan.debtPaymentCut, a.debtPaymentCutPerMonth * month);
  const growth = Math.min(plan.incomeGrowth, Math.pow(1 + a.incomeGrowthPerMonth, month) - 1);
  const openCreditLines = month >= a.openLineLagMonths ? applicant.openCreditLines + plan.openLineChange : applicant.openCreditLines;

  return {
    ...applicant,
    ...aged,
    utilization: Math.abs(utilization - plan.utilizationTarget) < 1e-9 ? plan.utilizationTarget : utilization,
    monthlyIncome: applicant.monthlyIncome * (1 + growth),
    debtRatio: debtRatioAfter(applicant.debtRatio, cut, growth),
    openCreditLines,
  };
}

/** Month-by-month projection of the Pathway score under a plan versus doing nothing. */
export function simulate(
  applicant: Applicant,
  plan: RecoursePlan | null,
  model: CreditModel = MODEL,
  a: Assumptions = ASSUMPTIONS,
): Timeline {
  const points: TimelinePoint[] = [];
  let approvalMonth: number | null = null;
  let baselineApprovalMonth: number | null = null;
  for (let m = 0; m <= a.horizonMonths; m++) {
    const state = stateAt(applicant, plan, m, a);
    const baseState = stateAt(applicant, null, m, a);
    const approved = isApproved(state, model);
    if (approved && approvalMonth === null) approvalMonth = m;
    if (isApproved(baseState, model) && baselineApprovalMonth === null) baselineApprovalMonth = m;
    points.push({ month: m, score: score(state, model), baselineScore: score(baseState, model), approved, state });
  }
  return { points, approvalMonth, baselineApprovalMonth, thresholdScore: model.thresholdScore };
}
