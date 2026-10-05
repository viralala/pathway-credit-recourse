/**
 * Writes public/metrics.json for the shipped (Kaggle, version 2) model.
 *
 * Model metrics are copied from the verified Phase 7 and Phase 8 reports; nothing is recomputed
 * or re-fitted here. Recourse and fairness metrics come from running the shipped TypeScript
 * engine over every rejected applicant in the test split (data/parity_test.json, written by
 * `python ml/export_parity.py`).
 */
import fs from "node:fs";
import path from "node:path";
import { evaluateApplicants, summarize, type EvalApplicant } from "../lib/evaluate";
import { MODEL } from "../lib/model";
import { applicantOf, compareParity, type ParityFile } from "../lib/parity";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const parityPath = path.join(root, "data/parity_test.json");
if (!fs.existsSync(parityPath)) {
  console.error("data/parity_test.json not found. Run `python ml/export_parity.py` first (needs data/cs-training.csv).");
  process.exit(1);
}
const parity = JSON.parse(fs.readFileSync(parityPath, "utf8")) as ParityFile;
const training = read("ml/artifacts/phase6_training.json");
const evaluation = read("ml/artifacts/phase7_evaluation.json");
const cutoff = read("ml/artifacts/phase8_cutoff.json");

// Refuse to publish numbers for a model the app does not score identically to Python.
const check = compareParity(parity);
if (!check.pass) {
  console.error("Python and TypeScript disagree on the test split; run `npx tsx scripts/parity.ts`. metrics.json not written.");
  process.exit(1);
}
if (cutoff.selectedCutoff !== MODEL.threshold || cutoff.model !== "logisticRegression" || evaluation.primaryModel !== "logisticRegression")
  throw new Error("the Phase 7/8 reports do not describe the model in lib/model.json");

/** One split's numbers: ranking quality from Phase 7, decisions at the frozen cut-off from Phase 8. */
const part = (name: "validation" | "test", atCutoff: Record<string, number>) => {
  const e = evaluation.results.logisticRegression[name];
  return {
    rows: e.rows,
    defaultRate: e.defaultRate,
    auc: e.auc,
    ks: e.ks,
    brier: e.brier,
    approvalRate: atCutoff.approvalRate,
    rejectionRate: atCutoff.rejectionRate,
    applicantsRejected: atCutoff.applicantsRejected,
    recall: atCutoff.recall,
    precision: atCutoff.precision,
    falsePositiveRate: atCutoff.falsePositiveRate,
    defaultRateAmongApproved: atCutoff.defaultRateAmongApproved,
  };
};

const applicants: EvalApplicant[] = parity.applicants.map((row) => ({ ...applicantOf(row), age: row.age ?? Number.NaN }));
const t0 = Date.now();
const s = summarize(evaluateApplicants(applicants));
if (s.rejectedEvaluated !== cutoff.testFinalConfirmation.atSelectedCutoff.applicantsRejected)
  throw new Error("the app rejects a different number of test applicants than the Phase 8 report");

const parts = training.split.parts;
const out = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  dataSource: MODEL.dataSource,
  modelVersion: MODEL.version,
  dataNote: "Kaggle 'Give Me Some Credit' (cs-training.csv, 150,000 rows): 60% training, 20% validation, 20% test, stratified",
  sources: {
    training: "ml/artifacts/phase6_training.json",
    evaluation: "ml/artifacts/phase7_evaluation.json",
    cutoff: "ml/artifacts/phase8_cutoff.json",
    recourse: "scripts/evaluate.ts over the rejected applicants of the test split",
  },
  rows: { train: parts.train.rows, validation: parts.validation.rows, test: parts.test.rows },
  defaultRate: parts.train.defaultRate,
  threshold: cutoff.selectedCutoff,
  thresholdRule: "approve when predicted probability of default < threshold; reject when >= threshold",
  thresholdSelectedOn: cutoff.selectedOn,
  // The cut-off was chosen on validation. Test was scored once at the frozen cut-off.
  validation: part("validation", cutoff.validation.atSelectedCutoff),
  test: part("test", cutoff.testFinalConfirmation.atSelectedCutoff),
  recourseEvaluatedOn: parity.part,
  evaluatedApplicants: applicants.length,
  rejectedEvaluated: s.rejectedEvaluated,
  plansFound: s.plansFound,
  plansThatFlip: s.plansThatFlip,
  planSuccessRate: Number(s.planSuccessRate.toFixed(4)),
  medianMonthsToApproval: s.medianMonthsToApproval,
  medianEffort: s.medianEffort === null ? null : Number(s.medianEffort.toFixed(2)),
  rejectedWithoutUsableIncome: s.incomeNotUsable,
  fairnessGap: Number(s.fairness.fairnessGap.toFixed(4)),
  fairness: s.fairness,
};
fs.writeFileSync(path.join(root, "public/metrics.json"), JSON.stringify(out, null, 2) + "\n");
console.log(
  `evaluated ${s.rejectedEvaluated} rejected test applicants in ${Date.now() - t0}ms: ` +
    `plans found ${s.plansFound}, approved by the model ${s.plansThatFlip}, ` +
    `plan success ${(s.planSuccessRate * 100).toFixed(1)}%, median months ${s.medianMonthsToApproval}, ` +
    `fairness gap ${(s.fairness.fairnessGap * 100).toFixed(1)}% (${s.fairness.fairnessGapDimension})`,
);
