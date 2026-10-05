import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ASSUMPTIONS } from "../config";
import { evaluateApplicants, summarize, type EvalApplicant } from "../evaluate";
import { MODEL, isApproved } from "../model";
import { agedCount, findRecourse } from "../recourse";
import { SAMPLES } from "../samples";
import { simulate } from "../timeline";
import type { Applicant } from "../types";

/** Synthetic applicants kept as a fixed test fixture (they carry an age, which the model ignores). */
const evalSample: EvalApplicant[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../ml/artifacts/eval_sample.json"), "utf8"),
);

describe("late payments ageing out", () => {
  it("never increases and reaches zero at the end of the window", () => {
    for (const n of [0, 1, 2, 5]) {
      let prev = n;
      for (let m = 0; m <= ASSUMPTIONS.delinquencyWindowMonths; m++) {
        const c = agedCount(n, m);
        expect(c).toBeLessThanOrEqual(prev);
        prev = c;
      }
      expect(agedCount(n, ASSUMPTIONS.delinquencyWindowMonths)).toBe(0);
    }
  });
});

describe("recourse engine", () => {
  it("returns no plan for an approved applicant", () => {
    expect(findRecourse(SAMPLES.find((s) => s.id === "approved")!.applicant).status).toBe("approved");
  });

  it("finds a plan for both rejected demo applicants", () => {
    for (const id of ["clear-rejection", "borderline"]) {
      const r = findRecourse(SAMPLES.find((s) => s.id === id)!.applicant);
      expect(r.status).toBe("plan");
    }
  });

  it("respects every cap", () => {
    for (const a of evalSample.slice(0, 600)) {
      const r = findRecourse(a);
      if (r.status !== "plan") continue;
      const p = r.plan;
      expect(p.incomeGrowth).toBeLessThanOrEqual(ASSUMPTIONS.maxIncomeGrowth + 1e-9);
      expect(p.debtPaymentCut).toBeLessThanOrEqual(ASSUMPTIONS.maxDebtPaymentCut + 1e-9);
      expect(Math.abs(p.openLineChange)).toBeLessThanOrEqual(ASSUMPTIONS.maxOpenLineChange);
      expect(p.target.utilization).toBeLessThanOrEqual(a.utilization + 1e-9);
      expect(p.months).toBeLessThanOrEqual(ASSUMPTIONS.horizonMonths);
    }
  });

  it("recommended plans flip the model's decision (plan success rate)", () => {
    const rejected = evalSample.filter((a) => !isApproved(a));
    expect(rejected.length).toBeGreaterThan(100);
    for (const a of rejected) {
      const r = findRecourse(a);
      if (r.status !== "plan") continue;
      // The target state the plan promises is approved by the exact model...
      expect(isApproved(r.plan.target, MODEL)).toBe(true);
      expect(r.plan.flipsDecision).toBe(true);
      // ...and the month-by-month simulation reaches approval no later than plan completion.
      const t = simulate(a, r.plan);
      expect(t.approvalMonth).not.toBeNull();
      expect(t.approvalMonth!).toBeLessThanOrEqual(r.plan.months);
    }
    const s = summarize(evaluateApplicants(evalSample));
    expect(s.plansThatFlip).toBe(s.plansFound);
    expect(s.planSuccessRate).toBeGreaterThan(0.5);
  });

  it("every action in a demo plan is necessary: dropping any one breaks approval", () => {
    for (const id of ["clear-rejection", "borderline"]) {
      const a = SAMPLES.find((s) => s.id === id)!.applicant;
      const r = findRecourse(a);
      if (r.status !== "plan") throw new Error("expected a plan");
      const t = r.plan.target;
      for (const act of r.plan.actions) {
        const reverted: Applicant =
          act.key === "wait"
            ? { ...t, late30: a.late30, late60: a.late60, late90: a.late90 }
            : act.key === "monthlyIncome"
              ? { ...t, monthlyIncome: a.monthlyIncome, debtRatio: t.debtRatio * (1 + r.plan.incomeGrowth) }
              : { ...t, [act.key]: a[act.key] };
        expect(isApproved(reverted)).toBe(false);
      }
    }
  });
});

describe("timeline simulator", () => {
  it("score is non-decreasing month by month under a plan", () => {
    for (const s of SAMPLES.filter((x) => x.id !== "approved")) {
      const r = findRecourse(s.applicant);
      if (r.status !== "plan") throw new Error("expected a plan");
      const t = simulate(s.applicant, r.plan);
      expect(t.points).toHaveLength(ASSUMPTIONS.horizonMonths + 1);
      for (let i = 1; i < t.points.length; i++)
        expect(t.points[i].score).toBeGreaterThanOrEqual(t.points[i - 1].score - 1e-9);
      expect(t.points[t.approvalMonth!].score).toBeGreaterThanOrEqual(MODEL.thresholdScore - 1e-9);
    }
  });

  it("caps income growth at the configured limit", () => {
    const a = SAMPLES[0].applicant;
    const plan = { utilizationTarget: a.utilization, debtPaymentCut: 0, incomeGrowth: 0.1, openLineChange: 0 };
    const t = simulate(a, { ...plan, target: a, actions: [], effort: 0, months: 0, waitMonths: 0, scoreBefore: 0, scoreAfter: 0, flipsDecision: false });
    const last = t.points[t.points.length - 1].state.monthlyIncome;
    expect(last).toBeCloseTo(a.monthlyIncome * 1.1, 6);
  });
});
