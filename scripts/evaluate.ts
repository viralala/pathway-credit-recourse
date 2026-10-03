/** Runs the shipped TypeScript recourse engine over held-out applicants and merges metrics into public/metrics.json. */
import fs from "node:fs";
import path from "node:path";
import { evaluateApplicants, summarize } from "../lib/evaluate";
import type { Applicant } from "../lib/types";

const root = path.resolve(__dirname, "..");
const sample: Applicant[] = JSON.parse(fs.readFileSync(path.join(root, "ml/artifacts/eval_sample.json"), "utf8"));
const metricsPath = path.join(root, "public/metrics.json");
const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));

const t0 = Date.now();
const s = summarize(evaluateApplicants(sample));
const out = {
  ...metrics,
  evaluatedApplicants: sample.length,
  rejectedEvaluated: s.rejectedEvaluated,
  plansFound: s.plansFound,
  plansThatFlip: s.plansThatFlip,
  planSuccessRate: Number(s.planSuccessRate.toFixed(4)),
  medianMonthsToApproval: s.medianMonthsToApproval,
  medianEffort: s.medianEffort === null ? null : Number(s.medianEffort.toFixed(2)),
  fairnessGap: Number(s.fairness.fairnessGap.toFixed(4)),
  fairness: s.fairness,
};
fs.writeFileSync(metricsPath, JSON.stringify(out, null, 2) + "\n");
console.log(
  `evaluated ${s.rejectedEvaluated} rejected applicants in ${Date.now() - t0}ms: ` +
    `plan success ${(s.planSuccessRate * 100).toFixed(1)}%, median months ${s.medianMonthsToApproval}, ` +
    `fairness gap ${(s.fairness.fairnessGap * 100).toFixed(1)}% (${s.fairness.fairnessGapDimension})`,
);
