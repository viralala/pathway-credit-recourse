import { describe, expect, it } from "vitest";
import { MODEL, assess, isApproved, logit, reasons, score, scoreFromLogit, thresholdLogit } from "../model";
import { INR_PER_MODEL_UNIT } from "../money";
import type { Applicant } from "../types";

/** Applicant incomes are rupees; the dataset-unit figures below are scaled into them. */
const rupees = (modelUnits: number) => modelUnits * INR_PER_MODEL_UNIT;

const base: Applicant = {
  utilization: 0.3,
  late30: 0,
  debtRatio: 0.35,
  monthlyIncome: rupees(5000),
  openCreditLines: 8,
  late90: 0,
  late60: 0,
};

describe("credit model", () => {
  it("exports every feature with a finite scaler and coefficient", () => {
    expect(MODEL.features).toHaveLength(10);
    for (const f of MODEL.features) {
      expect(Number.isFinite(f.coef)).toBe(true);
      expect(f.std).toBeGreaterThan(0);
    }
    expect(MODEL.threshold).toBeGreaterThan(0);
    expect(MODEL.threshold).toBeLessThan(1);
  });

  it("puts the approval cut-off exactly at the threshold score", () => {
    expect(scoreFromLogit(thresholdLogit())).toBeCloseTo(MODEL.thresholdScore, 6);
  });

  it("is monotone in the directions a lender would expect", () => {
    expect(score({ ...base, utilization: 0.9 })).toBeLessThan(score(base));
    expect(score({ ...base, late90: 2 })).toBeLessThan(score(base));
    expect(score({ ...base, debtRatio: 1.2 })).toBeLessThan(score(base));
    expect(score({ ...base, monthlyIncome: rupees(9000) })).toBeGreaterThan(score(base));
  });

  it("agrees between score, logit and the approve flag", () => {
    for (const u of [0, 0.4, 0.8, 1.2]) {
      const a = { ...base, utilization: u, late30: 2 };
      expect(isApproved(a)).toBe(logit(a) <= thresholdLogit());
      expect(assess(a).approved).toBe(score(a) >= MODEL.thresholdScore - 1e-9);
    }
  });

  it("ranks reason codes by adverse impact", () => {
    const r = reasons({ ...base, utilization: 1.1, late90: 3 });
    expect(r.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].impact).toBeGreaterThanOrEqual(r[i].impact);
    expect(r.map((x) => x.key)).toContain("utilization");
  });
});
