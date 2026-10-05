import { MODEL, approvesProbability, isApproved, logit, probabilityOfDefault } from "./model";
import { findRecourse, type RecoursePlan } from "./recourse";
import { simulate } from "./timeline";
import type { Applicant, CreditModel } from "./types";

/**
 * Python ↔ TypeScript parity on raw applicants. ml/export_parity.py writes data/parity_test.json
 * (every test-split applicant as it appears in the Kaggle file, with the Python model's
 * probability and decision); this module scores the same rows with the app's own code.
 */

/** One raw applicant from the export. `null` income = not provided. */
export interface ParityRow {
  id: number;
  utilization: number;
  late30: number;
  late60: number;
  late90: number;
  monthlyIncome: number | null;
  debtRatio: number;
  openCreditLines: number;
  /** Not a model input; carried for the fairness audit only. */
  age: number | null;
  pythonProbability: number;
  pythonApproved: boolean;
}

export interface ParityFile {
  part: string;
  rows: number;
  cutoff: number;
  rule: string;
  boundary: { probability: number; pythonApproved: boolean }[];
  applicants: ParityRow[];
}

/** Largest probability difference the app may have from Python on any applicant. */
export const PARITY_TOLERANCE = 1e-6;

/** The applicant exactly as given: a missing income stays missing (NaN), nothing is defaulted. */
export function applicantOf(row: ParityRow): Applicant {
  return {
    utilization: row.utilization,
    late30: row.late30,
    late60: row.late60,
    late90: row.late90,
    monthlyIncome: row.monthlyIncome === null ? Number.NaN : row.monthlyIncome,
    debtRatio: row.debtRatio,
    openCreditLines: row.openCreditLines,
  };
}

export interface ParityReport {
  rows: number;
  maxProbabilityDiff: number;
  meanProbabilityDiff: number;
  /** Applicants whose probability differs by `PARITY_TOLERANCE` or more. */
  probabilityMismatches: number;
  /** Applicants the app and Python decide differently. */
  decisionMismatches: number;
  approved: number;
  rejected: number;
  /** The decision rule at and next to the cut-off, where both sides are given the same probability. */
  boundary: { probability: number; pythonApproved: boolean; appApproved: boolean }[];
  boundaryMismatches: number;
  cutoffMatches: boolean;
  pass: boolean;
}

export function compareParity(file: ParityFile, model: CreditModel = MODEL): ParityReport {
  let max = 0;
  let sum = 0;
  let probabilityMismatches = 0;
  let decisionMismatches = 0;
  let approved = 0;
  for (const row of file.applicants) {
    const a = applicantOf(row);
    const diff = Math.abs(probabilityOfDefault(a, model) - row.pythonProbability);
    // A NaN difference must count as a failure, not slip past the comparisons below.
    if (!(diff < PARITY_TOLERANCE)) probabilityMismatches++;
    if (!(diff <= max)) max = diff;
    sum += diff;
    const ok = isApproved(a, model);
    if (ok) approved++;
    if (ok !== row.pythonApproved) decisionMismatches++;
  }
  const boundary = file.boundary.map((b) => ({ ...b, appApproved: approvesProbability(b.probability, model) }));
  const boundaryMismatches = boundary.filter((b) => b.appApproved !== b.pythonApproved).length;
  const rows = file.applicants.length;
  const cutoffMatches = file.cutoff === model.threshold;
  return {
    rows,
    maxProbabilityDiff: max,
    meanProbabilityDiff: rows ? sum / rows : Number.NaN,
    probabilityMismatches,
    decisionMismatches,
    approved,
    rejected: rows - approved,
    boundary,
    boundaryMismatches,
    cutoffMatches,
    pass: rows > 0 && rows === file.rows && cutoffMatches && probabilityMismatches === 0 && decisionMismatches === 0 && boundaryMismatches === 0,
  };
}

/**
 * Why a plan is not honest, or null when it is. A plan is honest when the model itself approves
 * the finished applicant exactly when the engine says it does, the month-by-month simulation gets
 * there by the promised month, and undoing any single action makes the model's output worse
 * (so no action is listed that the model cannot see).
 */
export function planProblem(a: Applicant, plan: RecoursePlan, claimsApproval: boolean, model: CreditModel = MODEL): string | null {
  const approvedAfter = isApproved(plan.target, model);
  if (approvedAfter !== claimsApproval) return claimsApproval ? "plan target is rejected by the model" : "closest plan is approved by the model";
  if (plan.flipsDecision !== approvedAfter) return "flipsDecision disagrees with the model";
  if (claimsApproval) {
    if (!(probabilityOfDefault(plan.target, model) < model.threshold)) return "plan target probability is not below the cut-off";
    const month = simulate(a, plan, model).approvalMonth;
    if (month === null || month > plan.months) return "simulation does not reach approval by the plan's last month";
  }
  const zAfter = logit(plan.target, model);
  const t = plan.target;
  for (const act of plan.actions) {
    const reverted: Applicant =
      act.key === "wait"
        ? { ...t, late30: a.late30, late60: a.late60, late90: a.late90 }
        : act.key === "monthlyIncome"
          ? { ...t, monthlyIncome: a.monthlyIncome, debtRatio: t.debtRatio * (1 + plan.incomeGrowth) }
          : act.key === "debtRatio"
            ? { ...t, debtRatio: t.debtRatio / (1 - plan.debtPaymentCut) }
            : { ...t, [act.key]: a[act.key] };
    if (!(logit(reverted, model) > zAfter)) return `action "${act.key}" does not change the model's output`;
  }
  return null;
}

export interface RecourseAudit {
  rejected: number;
  plans: number;
  /** Plans whose finished applicant the model approves (probability below the cut-off). */
  plansApprovedByModel: number;
  infeasible: number;
  /** Plans (or closest plans) that fail `planProblem`, with the first few reasons. */
  invalid: number;
  problems: { id: number; problem: string }[];
}

/** Runs the recourse engine on every applicant Python rejects and checks each result against the model. */
export function auditRecourse(file: ParityFile, model: CreditModel = MODEL, every = 1): RecourseAudit {
  const out: RecourseAudit = { rejected: 0, plans: 0, plansApprovedByModel: 0, infeasible: 0, invalid: 0, problems: [] };
  let seen = 0;
  for (const row of file.applicants) {
    if (row.pythonApproved || seen++ % every !== 0) continue;
    out.rejected++;
    const a = applicantOf(row);
    const r = findRecourse(a, model);
    let problem: string | null;
    if (r.status === "approved") problem = "engine treats a rejected applicant as approved";
    else {
      const plan = r.status === "plan" ? r.plan : r.closest;
      if (r.status === "plan") {
        out.plans++;
        if (isApproved(plan.target, model)) out.plansApprovedByModel++;
      } else out.infeasible++;
      problem = planProblem(a, plan, r.status === "plan", model);
    }
    if (problem) {
      out.invalid++;
      if (out.problems.length < 10) out.problems.push({ id: row.id, problem });
    }
  }
  return out;
}
