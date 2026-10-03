import { ASSUMPTIONS } from "./config";
import { MODEL, assess, type Assessment } from "./model";
import { findRecourse, type RecoursePlan, type RecourseResult } from "./recourse";
import { simulate, type Timeline } from "./timeline";
import type { Applicant } from "./types";

export interface Analysis {
  assessment: Assessment;
  recourse: RecourseResult;
  /** The recommended plan, or the closest one if nothing is feasible. */
  plan: RecoursePlan | null;
  timeline: Timeline;
  thresholdScore: number;
  horizon: number;
}

export function analyze(applicant: Applicant): Analysis {
  const assessment = assess(applicant);
  const recourse = findRecourse(applicant);
  const plan = recourse.status === "plan" ? recourse.plan : recourse.status === "infeasible" ? recourse.closest : null;
  return {
    assessment,
    recourse,
    plan,
    timeline: simulate(applicant, plan),
    thresholdScore: MODEL.thresholdScore,
    horizon: ASSUMPTIONS.horizonMonths,
  };
}
