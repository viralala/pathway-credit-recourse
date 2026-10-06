import { ASSUMPTIONS } from "./config";
import { assessLoan } from "./loanAssessment";
import { MODEL, assess, type Assessment } from "./model";
import { simulateUncertainty, type UncertaintyBand } from "./montecarlo";
import { PRICING, moneySaved, nextTier, totalInterest, type RateTier, type Savings } from "./pricing";
import { findRecourse, type RecoursePlan, type RecourseResult } from "./recourse";
import { simulate, type Timeline } from "./timeline";
import type { Applicant, LoanAssessment, LoanType } from "./types";

export interface Analysis {
  assessment: Assessment;
  recourse: RecourseResult;
  /** The recommended plan, or the closest one if nothing is feasible. */
  plan: RecoursePlan | null;
  timeline: Timeline;
  /** Monte Carlo spread around the timeline: how sure the projected approval month is. */
  uncertainty: UncertaintyBand;
  thresholdScore: number;
  horizon: number;
  loanType: LoanType;
  loanAssessment: LoanAssessment;
}

export function analyze(
  applicant: Applicant,
  loanOpts:
    | LoanType
    | {
        loanType?: LoanType;
        loanAmount?: number;
        collateralValue?: number | null;
        recentHardInquiries?: number;
      } = "unsecured",
): Analysis {
  const assessment = assess(applicant);
  const recourse = findRecourse(applicant);
  const plan = recourse.status === "plan" ? recourse.plan : recourse.status === "infeasible" ? recourse.closest : null;

  const loanType: LoanType = typeof loanOpts === "string" ? loanOpts : (loanOpts.loanType || "unsecured");
  const loanAmount = typeof loanOpts === "object" ? loanOpts.loanAmount : undefined;
  const collateralValue = typeof loanOpts === "object" ? loanOpts.collateralValue : undefined;
  const recentHardInquiries = typeof loanOpts === "object" ? loanOpts.recentHardInquiries : undefined;

  const loanAssessment = assessLoan({
    loanType,
    loanAmount,
    collateralValue,
    recentHardInquiries,
    applicant,
    predictedScore: assessment.score,
    pd: assessment.pd,
    decision: assessment.approved ? "approved" : "declined",
  });
  return {
    assessment,
    recourse,
    plan,
    timeline: simulate(applicant, plan),
    uncertainty: simulateUncertainty(applicant, plan),
    thresholdScore: MODEL.thresholdScore,
    horizon: ASSUMPTIONS.horizonMonths,
    loanType,
    loanAssessment,
  };
}

/**
 * What the "money saved" panel shows, for one loan:
 * - "plan": declined today, a feasible plan exists. Compare today with after the plan.
 * - "closest": declined, nothing feasible. Compare today with after the closest plan (honestly, often no saving).
 * - "approved": already approved. Compare today with the next better tier (the next-tier gain).
 */
export interface SavingsView {
  mode: "plan" | "closest" | "approved";
  /** Score the "after" side is priced at. */
  scoreAfter: number;
  savings: Savings;
  /** The next better tier above `scoreAfter`, the points to reach it and the extra interest it would save. */
  next: { tier: RateTier; points: number; extraSaved: number } | null;
}

export function savingsView(
  a: Pick<Analysis, "assessment" | "recourse" | "plan">,
  loan: { amount?: number; termMonths?: number } = {},
  p: typeof PRICING = PRICING,
): SavingsView {
  const amount = loan.amount ?? p.defaultLoan.amount;
  const termMonths = loan.termMonths ?? p.defaultLoan.termMonths;
  const scoreToday = a.assessment.score;
  const mode: SavingsView["mode"] = a.recourse.status === "approved" || !a.plan ? "approved" : a.recourse.status === "plan" ? "plan" : "closest";

  if (mode === "approved") {
    const up = nextTier(scoreToday, p);
    const scoreAfter = up ? up.minScore : scoreToday;
    const savings = moneySaved({ scoreToday, scoreAfter, amount, termMonths }, p);
    return {
      mode,
      scoreAfter,
      savings,
      next: up ? { tier: up, points: Math.max(1, Math.ceil(up.minScore - scoreToday)), extraSaved: savings.saved } : null,
    };
  }

  const scoreAfter = a.plan!.scoreAfter;
  const savings = moneySaved({ scoreToday, scoreAfter, amount, termMonths }, p);
  const up = nextTier(scoreAfter, p);
  return {
    mode,
    scoreAfter,
    savings,
    next: up
      ? {
          tier: up,
          points: Math.max(1, Math.ceil(up.minScore - scoreAfter)),
          extraSaved: Math.max(0, savings.planInterest - totalInterest(amount, up.apr, termMonths)),
        }
      : null,
  };
}
