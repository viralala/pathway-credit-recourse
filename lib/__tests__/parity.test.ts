import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import { ASSUMPTIONS, FEATURE_CLASS } from "../config";
import { LANGS, displayScore, featureLabel, reasonText, summaryText } from "../i18n";
import {
  DERIVED_KEYS,
  INPUT_KEYS,
  MODEL,
  PREPROCESSING,
  approvesLogit,
  approvesProbability,
  assess,
  clean,
  isApproved,
  logit,
  probabilityOfDefault,
  reasons,
  score,
  sigmoid,
} from "../model";
import { PARITY_TOLERANCE, auditRecourse, compareParity, planProblem, type ParityFile } from "../parity";
import { RECOURSE_GROUPS, findRecourse, reachesGoal, targetLogit } from "../recourse";
import { SAMPLES } from "../samples";
import { APPLICANT_LIMITS } from "../security/validate";
import { simulate } from "../timeline";
import type { Applicant, CreditModel, ModelFeatureKey } from "../types";
import { PARAM } from "../url";

const ROOT = path.resolve(__dirname, "../..");
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const sha256 = (rel: string) => createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
const meta = readJson("lib/model.meta.json");
const training = readJson("ml/artifacts/phase6_training.json");
const cutoff = readJson("ml/artifacts/phase8_cutoff.json");

/** Raw test-split applicants + Python predictions (ml/export_parity.py). Git-ignored: it holds Kaggle rows. */
const PARITY_PATH = path.join(ROOT, "data/parity_test.json");
const parity: ParityFile | null = fs.existsSync(PARITY_PATH) ? JSON.parse(fs.readFileSync(PARITY_PATH, "utf8")) : null;

/** A normal applicant: real income, real counts, nothing out of range. */
const normal: Applicant = { utilization: 0.82, late30: 2, late60: 1, late90: 0, monthlyIncome: 4200, debtRatio: 0.45, openCreditLines: 7 };
const med = PREPROCESSING.medians;

describe("shipped model is the Phase 6 Kaggle model", () => {
  it("carries the Phase 6 coefficients, scaler and intercept unchanged", () => {
    expect(MODEL.version).toBe(2);
    expect(MODEL.dataSource).toBe("kaggle");
    expect(MODEL.intercept).toBe(training.logisticRegression.intercept);
    expect(MODEL.features.map((f) => f.key)).toEqual(training.features.order);
    for (const [i, f] of MODEL.features.entries()) {
      const spec = training.features.preparation.features[i];
      expect(f.coef).toBe(training.logisticRegression.coefficients[f.key]);
      expect([f.mean, f.std, f.log1p]).toEqual([spec.mean, spec.std, spec.log1p]);
      expect(f.clip).toEqual(spec.cap === null ? [0, 1] : [spec.floor, spec.cap]);
    }
  });

  it("was exported from the training and cut-off reports on disk", () => {
    expect(meta.provenance.trainingReportSha256).toBe(sha256("ml/artifacts/phase6_training.json"));
    expect(meta.provenance.cutoffReportSha256).toBe(sha256("ml/artifacts/phase8_cutoff.json"));
  });

  it("uses the cleaning thresholds and medians learned in Phase 6", () => {
    const pre = training.features.preparation.preprocessor;
    expect(PREPROCESSING.lateSpecialCodeMin).toBe(pre.thresholds.lateSpecialMin);
    expect(PREPROCESSING.lateSpecialReplacement).toBe(pre.thresholds.lateSpecialReplacement);
    expect(PREPROCESSING.incomePlaceholderMax).toBe(pre.thresholds.incomePlaceholderMax);
    expect(PREPROCESSING.utilizationInvalidAbove).toBe(pre.thresholds.utilizationInvalidAbove);
    for (const k of ["monthlyIncome", "debtRatio", "utilization"] as const) expect(med[k]).toBe(pre.medians[k]);
  });

  it("keeps the frozen cut-off of 0.10", () => {
    expect(MODEL.threshold).toBe(0.1);
    expect(cutoff.selectedCutoff).toBe(0.1);
    expect(meta.decisionRule.threshold).toBe(0.1);
  });
});

describe("cut-off convention: probability < 0.10 approves, >= 0.10 rejects", () => {
  it("rejects at exactly 0.10 and approves just below it", () => {
    expect(approvesProbability(0.1)).toBe(false);
    expect(approvesProbability(0.1 - Number.EPSILON / 8)).toBe(true);
    expect(approvesProbability(0.1 + Number.EPSILON / 8)).toBe(false);
    expect(approvesProbability(0.0999999)).toBe(true);
    expect(approvesProbability(0.1000001)).toBe(false);
  });

  it("an applicant whose probability is exactly the cut-off is declined everywhere", () => {
    // Every feature sits at the training mean, so the log-odds is the intercept; ln(1/3) gives p = 0.25 exactly.
    const atMean: CreditModel = {
      ...MODEL,
      intercept: Math.log(1 / 3),
      threshold: 0.25,
      features: MODEL.features.map((f) => ({ ...f, coef: 0 })),
    };
    expect(probabilityOfDefault(normal, atMean)).toBe(0.25);
    expect(isApproved(normal, atMean)).toBe(false);
    expect(assess(normal, atMean).approved).toBe(false);
    expect(approvesLogit(logit(normal, atMean), atMean)).toBe(false);
    expect(reachesGoal(logit(normal, atMean), targetLogit(undefined, atMean), atMean)).toBe(false);
    expect(findRecourse(normal, atMean).status).not.toBe("approved");
    expect(simulate(normal, null, atMean).approvalMonth).toBeNull();
    // One step below the cut-off is approved.
    const below = { ...atMean, threshold: 0.25 + 1e-12 };
    expect(isApproved(normal, below)).toBe(true);
    expect(findRecourse(normal, below).status).toBe("approved");
  });

  it("a declined score is never shown as the approval score", () => {
    const T = MODEL.thresholdScore;
    expect([649.4, 649.5, 649.6, 649.999].map((s) => displayScore(s))).toEqual([649, 649, 649, 649]);
    expect([650, 650.4, 650.5].map((s) => displayScore(s))).toEqual([650, 650, 651]);
    expect(displayScore(507.47)).toBe(507);
    expect(displayScore(634.5)).toBe(635);
    // The decision, not the rounded score, decides: a score that computes to exactly 650 on a declined applicant.
    expect(displayScore(T, false)).toBe(T - 1);
    expect(displayScore(T - 1e-9, true)).toBe(T);
    // A real declined profile within half a point of the line (Rohan with 63% utilization).
    const near: Applicant = { monthlyIncome: 4600, utilization: 0.63, debtRatio: 0.42, openCreditLines: 6, late30: 1, late60: 0, late90: 0 };
    const a = assess(near);
    expect(a.approved).toBe(false);
    expect(Math.round(a.score)).toBe(T);
    expect(displayScore(a.score, a.approved)).toBe(T - 1);
    for (const { id: lang } of LANGS) {
      const text = summaryText(lang, { name: "A", approved: false, score: a.score, threshold: T, topReason: null, approvalMonth: 1, horizon: 36 });
      expect(text.match(/\d+/g)).toEqual(expect.arrayContaining([String(T - 1), String(T)]));
      expect(text.match(new RegExp(String(T), "g"))).toHaveLength(1);
    }
    // Display only: the score itself and the decision are unchanged.
    expect(a.score).toBe(score(near));
    expect(a.score).toBeLessThan(T);
  });

  it("the decision is the probability compared with the cut-off, for every demo applicant", () => {
    for (const s of SAMPLES) {
      const a = assess(s.applicant);
      expect(a.pd).toBe(sigmoid(logit(s.applicant)));
      expect(a.approved).toBe(a.pd < MODEL.threshold);
      expect(isApproved(s.applicant)).toBe(a.approved);
    }
  });
});

describe("cleaning matches ml/preprocess.py", () => {
  it("leaves a normal applicant unchanged with all three flags at 0", () => {
    expect(clean(normal)).toEqual({ ...normal, lateSpecialCode: 0, incomeMissing: 0, incomePlaceholder: 0 });
  });

  it("missing income: training medians for income and debt ratio, incomeMissing = 1", () => {
    const x = clean({ ...normal, monthlyIncome: Number.NaN, debtRatio: 2400 });
    expect([x.monthlyIncome, x.debtRatio, x.incomeMissing, x.incomePlaceholder]).toEqual([med.monthlyIncome, med.debtRatio, 1, 0]);
  });

  it("income of 0 or 1 is a placeholder: medians, incomePlaceholder = 1; an income of 2 is real", () => {
    for (const income of [0, 1]) {
      const x = clean({ ...normal, monthlyIncome: income });
      expect([x.monthlyIncome, x.debtRatio, x.incomeMissing, x.incomePlaceholder]).toEqual([med.monthlyIncome, med.debtRatio, 0, 1]);
    }
    const real = clean({ ...normal, monthlyIncome: 2 });
    expect([real.monthlyIncome, real.debtRatio, real.incomePlaceholder]).toEqual([2, normal.debtRatio, 0]);
    // The income floor: 2 to 999 all score like 1,000, and only the income feature is affected.
    expect(logit({ ...normal, monthlyIncome: 2 })).toBe(logit({ ...normal, monthlyIncome: 1000 }));
  });

  it("late counts of 96/98 are special codes: the count becomes 0 and lateSpecialCode = 1", () => {
    const x = clean({ ...normal, late30: 98, late60: 98, late90: 98 });
    expect([x.late30, x.late60, x.late90, x.lateSpecialCode]).toEqual([0, 0, 0, 1]);
    const one = clean({ ...normal, late30: 96 });
    expect([one.late30, one.late60, one.lateSpecialCode]).toEqual([0, normal.late60, 1]);
    expect(clean({ ...normal, late30: 89 }).lateSpecialCode).toBe(0);
  });

  it("utilization above 10 is a data error (training median); 1.5 to 10 is capped, not replaced", () => {
    expect(clean({ ...normal, utilization: 10.01 }).utilization).toBe(med.utilization);
    expect(clean({ ...normal, utilization: 10 }).utilization).toBe(10);
    expect(logit({ ...normal, utilization: 10 })).toBe(logit({ ...normal, utilization: 1.5 }));
    expect(logit({ ...normal, utilization: 12 })).toBe(logit({ ...normal, utilization: med.utilization }));
  });

  it("refuses a non-number instead of scoring it as 0", () => {
    for (const key of INPUT_KEYS.filter((k) => k !== "monthlyIncome")) expect(() => logit({ ...normal, [key]: Number.NaN })).toThrow(RangeError);
    const partial = { ...normal } as Partial<Applicant>;
    delete partial.debtRatio;
    expect(() => logit(partial as Applicant)).toThrow(RangeError);
    expect(() => logit({ ...normal, monthlyIncome: null as unknown as number })).toThrow(RangeError);
  });

  it.skipIf(!parity)("matches Python on every raw test-split applicant (needs data/parity_test.json)", () => {
    const r = compareParity(parity!);
    expect(r.rows).toBe(30000);
    expect(r.maxProbabilityDiff).toBeLessThan(PARITY_TOLERANCE);
    expect(r.probabilityMismatches).toBe(0);
    expect(r.decisionMismatches).toBe(0);
    expect(r.boundaryMismatches).toBe(0);
    expect(r.rejected).toBe(cutoff.testFinalConfirmation.atSelectedCutoff.applicantsRejected);
    expect(r.pass).toBe(true);
  });
});

describe("reasons are true of the applicant", () => {
  it("never gives an income flag as a reason to someone who provided an income", () => {
    for (const a of [normal, ...SAMPLES.map((s) => s.applicant)])
      for (const r of reasons(a, MODEL, 10)) expect(DERIVED_KEYS as ModelFeatureKey[]).not.toContain(r.key);
  });

  it("gives a flag as a reason only when the flag is set", () => {
    const coded = reasons({ ...normal, late30: 98, late60: 98, late90: 98 }, MODEL, 10);
    expect(coded[0].key).toBe("lateSpecialCode");
    // The coded counts themselves are not reasons: the model did not use them.
    expect(coded.map((r) => r.key)).not.toContain("late30");
    for (const income of [Number.NaN, 0, 1]) {
      const keys = reasons({ ...normal, monthlyIncome: income }, MODEL, 10).map((r) => r.key);
      // An unusable income is replaced by the median, so the applicant's own figure is never quoted.
      expect(keys).not.toContain("monthlyIncome");
      expect(keys).not.toContain("debtRatio");
    }
  });

  it("every reason has a label and a sentence in every language", () => {
    for (const { id: lang } of LANGS)
      for (const f of MODEL.features) {
        expect(featureLabel(lang, f.key).length).toBeGreaterThan(2);
        const text = reasonText(lang, f.key, 1);
        expect(text.length).toBeGreaterThan(5);
        expect(text).not.toMatch(/[{}]|undefined|NaN/);
      }
  });
});

describe("the form asks only for model inputs", () => {
  it("form limits, URL parameters and plan classes cover exactly the seven inputs", () => {
    const inputs = [...INPUT_KEYS].sort();
    expect(Object.keys(APPLICANT_LIMITS).sort()).toEqual(inputs);
    expect(Object.keys(PARAM).sort()).toEqual(inputs);
    expect(Object.keys(FEATURE_CLASS).sort()).toEqual(inputs);
    for (const s of SAMPLES) expect(Object.keys(s.applicant).sort()).toEqual(inputs);
    expect([...INPUT_KEYS, ...DERIVED_KEYS].sort()).toEqual(MODEL.features.map((f) => f.key).sort());
  });

  it("every input changes the model's output", () => {
    const bumped: Applicant = { utilization: 0.2, late30: 0, late60: 0, late90: 1, monthlyIncome: 9000, debtRatio: 0.9, openCreditLines: 2 };
    for (const key of INPUT_KEYS) expect(logit({ ...normal, [key]: bumped[key] })).not.toBe(logit(normal));
  });
});

/** Every action a plan lists changes the model's output, and the model approves the finished applicant. */
function expectHonest(a: Applicant): "approved" | "plan" | "infeasible" {
  const r = findRecourse(a);
  expect(r.status === "approved").toBe(isApproved(a));
  if (r.status === "approved") return r.status;
  const plan = r.status === "plan" ? r.plan : r.closest;
  expect(planProblem(a, plan, r.status === "plan")).toBeNull();
  return r.status;
}

describe("recourse never claims what the model does not confirm", () => {
  it("the search covers every model feature exactly once", () => {
    const grouped = Object.values(RECOURSE_GROUPS).flat().sort();
    expect(grouped).toEqual(MODEL.features.map((f) => f.key).sort());
  });

  it("without a usable income, no plan pretends a raise or a payment cut helps", () => {
    for (const income of [Number.NaN, 0, 1]) {
      const a = { ...SAMPLES[0].applicant, monthlyIncome: income };
      const r = findRecourse(a);
      expect(r.status).not.toBe("approved");
      const plan = r.status === "plan" ? r.plan : r.status === "infeasible" ? r.closest : null;
      expect(plan!.incomeGrowth).toBe(0);
      expect(plan!.debtPaymentCut).toBe(0);
      expect(plan!.actions.map((x) => x.key)).not.toContain("monthlyIncome");
      expect(plan!.actions.map((x) => x.key)).not.toContain("debtRatio");
      expectHonest(a);
    }
  });

  it("a special-coded late history cannot be waited away, and is reported as infeasible", () => {
    const a = { ...SAMPLES[0].applicant, late30: 98, late60: 98, late90: 98 };
    const r = findRecourse(a);
    expect(r.status).toBe("infeasible");
    if (r.status !== "infeasible") return;
    expect(r.closest.waitMonths).toBe(0);
    expect(r.closest.flipsDecision).toBe(false);
    expect(r.closest.target.late30).toBe(98);
    expect(clean(r.closest.target).lateSpecialCode).toBe(1);
    expect(analyze(a).timeline.approvalMonth).toBeNull();
    expectHonest(a);
  });

  it("an out-of-range utilization is not offered as something to pay down", () => {
    const a = { ...SAMPLES[0].applicant, utilization: 12 };
    const r = findRecourse(a);
    const plan = r.status === "plan" ? r.plan : r.status === "infeasible" ? r.closest : null;
    expect(plan!.utilizationTarget).toBe(12);
    expect(plan!.actions.map((x) => x.key)).not.toContain("utilization");
    expectHonest(a);
  });

  it("credit lines at or above the cap are never changed, even in a closest plan", () => {
    const a = { ...SAMPLES[0].applicant, openCreditLines: 8, late30: 98, late60: 98, late90: 98 };
    const r = findRecourse(a);
    expect(r.status).toBe("infeasible");
    if (r.status === "infeasible") expect(r.closest.openLineChange).toBe(0);
  });

  it("holds across the form's whole range", () => {
    const grid: Applicant[] = [];
    for (const utilization of [0, 0.4, 0.95, 1.5])
      for (const late of [0, 1, 4, 10])
        for (const monthlyIncome of [0, 1, 600, 3000, 30000, 100000])
          for (const debtRatio of [0, 0.5, 1.9, 3])
            for (const openCreditLines of [0, 4, 5, 12])
              grid.push({ utilization, late30: late, late60: Math.floor(late / 2), late90: Math.floor(late / 4), monthlyIncome, debtRatio, openCreditLines });
    const seen = new Set<string>();
    for (const a of grid) seen.add(expectHonest(a));
    expect([...seen].sort()).toEqual(["approved", "plan"]);
    expect(ASSUMPTIONS.horizonMonths).toBeGreaterThanOrEqual(ASSUMPTIONS.delinquencyWindowMonths);
  });

  // The full 4,035 are checked by `npx tsx scripts/parity.ts`; one in eight keeps this suite quick.
  it.skipIf(!parity)("holds for rejected applicants in the raw test split (needs data/parity_test.json)", () => {
    const audit = auditRecourse(parity!, MODEL, 8);
    expect(audit.rejected).toBeGreaterThan(400);
    expect(audit.problems).toEqual([]);
    expect(audit.invalid).toBe(0);
    expect(audit.plansApprovedByModel).toBe(audit.plans);
    expect(audit.plans + audit.infeasible).toBe(audit.rejected);
  });
});
