import { describe, expect, it } from "vitest";
import { analyze, savingsView } from "../analyze";
import { ASSUMPTIONS, UNCERTAINTY, describeUncertainty, type Uncertainty } from "../config";
import { LANGS, likelyText, monthsText, pricingRows, uncertaintyRows } from "../i18n";
import { applicantSeed, mulberry32, simulateUncertainty } from "../montecarlo";
import { describePricing } from "../pricing";
import { findRecourse } from "../recourse";
import { SAMPLES } from "../samples";
import { simulate } from "../timeline";
import type { Applicant } from "../types";

const sample = (id: string) => SAMPLES.find((s) => s.id === id)!.applicant;
const planFor = (a: Applicant) => {
  const r = findRecourse(a);
  return r.status === "plan" ? r.plan : r.status === "infeasible" ? r.closest : null;
};

/** Every source of randomness switched off: each run is exactly the deterministic timeline. */
const NO_RANDOMNESS = {
  ...UNCERTAINTY,
  paceMultiplier: { mean: 1, sd: 0, min: 0.4, max: 1.3 },
  incomeGrowthPerMonth: { mean: ASSUMPTIONS.incomeGrowthPerMonth, sd: 0, min: 0, max: 1 },
  shockChancePerMonth: 0,
  newLateChancePerMonth: 0,
} as unknown as Uncertainty;

describe("seeded randomness", () => {
  it("mulberry32 is deterministic and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("applicant seed is stable and differs between applicants", () => {
    expect(applicantSeed(sample("borderline"))).toBe(applicantSeed({ ...sample("borderline") }));
    expect(applicantSeed(sample("borderline"))).not.toBe(applicantSeed(sample("clear-rejection")));
    // Rounded like the URL, so a shared link reproduces the band.
    expect(applicantSeed({ ...sample("borderline"), utilization: sample("borderline").utilization + 1e-8 })).toBe(applicantSeed(sample("borderline")));
  });
});

describe("simulateUncertainty", () => {
  it("is deterministic: same input, identical output", () => {
    for (const s of SAMPLES) {
      const plan = planFor(s.applicant);
      expect(simulateUncertainty(s.applicant, plan)).toEqual(simulateUncertainty({ ...s.applicant }, plan));
    }
  });

  it("an explicit seed changes the draws but not the shape", () => {
    const a = sample("clear-rejection");
    const plan = planFor(a);
    const x = simulateUncertainty(a, plan, { seed: 1 });
    const y = simulateUncertainty(a, plan, { seed: 2 });
    expect(x.band).toHaveLength(y.band.length);
    expect(x.runs).toBe(UNCERTAINTY.runs);
  });

  it("keeps low <= mid <= high every month, and months ordered", () => {
    for (const s of SAMPLES) {
      const r = simulateUncertainty(s.applicant, planFor(s.applicant));
      expect(r.band).toHaveLength(ASSUMPTIONS.horizonMonths + 1);
      r.band.forEach((b, i) => {
        expect(b.month).toBe(i);
        expect(b.low).toBeLessThanOrEqual(b.mid + 1e-9);
        expect(b.mid).toBeLessThanOrEqual(b.high + 1e-9);
        expect(b.low).toBeGreaterThanOrEqual(300);
        expect(b.high).toBeLessThanOrEqual(900);
      });
      const order = [r.months.low, r.months.mid, r.months.high].map((m) => (m === null ? Infinity : m));
      expect(order[0]).toBeLessThanOrEqual(order[1]);
      expect(order[1]).toBeLessThanOrEqual(order[2]);
      for (const m of [r.months.low, r.months.mid, r.months.high]) {
        if (m === null) continue;
        expect(Number.isInteger(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(ASSUMPTIONS.horizonMonths);
      }
    }
  });

  it("reports approvalWithinHorizon as a share in [0, 1]", () => {
    for (const s of SAMPLES) {
      const r = simulateUncertainty(s.applicant, planFor(s.applicant));
      expect(r.approvalWithinHorizon).toBeGreaterThanOrEqual(0);
      expect(r.approvalWithinHorizon).toBeLessThanOrEqual(1);
      expect(r.runs).toBe(UNCERTAINTY.runs);
    }
  });

  it("with all randomness off, matches the deterministic timeline exactly", () => {
    for (const s of SAMPLES) {
      const plan = planFor(s.applicant);
      const det = simulate(s.applicant, plan);
      const r = simulateUncertainty(s.applicant, plan, { uncertainty: NO_RANDOMNESS });
      expect(r.months.mid).toBe(det.approvalMonth);
      expect(r.months.low).toBe(det.approvalMonth);
      expect(r.months.high).toBe(det.approvalMonth);
      expect(r.approvalWithinHorizon).toBe(det.approvalMonth === null ? 0 : 1);
      r.band.forEach((b, i) => {
        expect(b.mid).toBeCloseTo(det.points[i].score, 9);
        expect(b.low).toBeCloseTo(b.high, 9);
      });
    }
  });

  it("the already-approved sample is approved at month 0 with high probability", () => {
    const a = sample("approved");
    const r = simulateUncertainty(a, planFor(a));
    expect(r.months.low).toBe(0);
    expect(r.months.mid).toBe(0);
    expect(r.approvalWithinHorizon).toBeGreaterThan(0.95);
  });

  it("variation spreads the outcome for a rejected applicant", () => {
    const a = sample("clear-rejection");
    const r = simulateUncertainty(a, planFor(a));
    const spread = r.band.some((b) => b.high - b.low > 1);
    expect(spread).toBe(true);
    expect(r.approvalWithinHorizon).toBeGreaterThan(0);
  });

  it("never moves a feature past the plan's target (a perfect pace cannot beat the plan's final score)", () => {
    const fast = {
      ...UNCERTAINTY,
      paceMultiplier: { mean: 5, sd: 0, min: 5, max: 5 },
      incomeGrowthPerMonth: { mean: 0.1, sd: 0, min: 0.1, max: 0.1 },
      shockChancePerMonth: 0,
      newLateChancePerMonth: 0,
    } as unknown as Uncertainty;
    for (const id of ["clear-rejection", "borderline"]) {
      const a = sample(id);
      const plan = planFor(a)!;
      const det = simulate(a, plan);
      const r = simulateUncertainty(a, plan, { uncertainty: fast });
      const finalScore = det.points[det.points.length - 1].score;
      for (const b of r.band) expect(b.high).toBeLessThanOrEqual(finalScore + 1e-6);
    }
  });

  it("handles a null plan (no actions) without throwing", () => {
    const a = sample("clear-rejection");
    const r = simulateUncertainty(a, null);
    expect(r.band).toHaveLength(ASSUMPTIONS.horizonMonths + 1);
  });

  it("runs 400 futures x 37 months fast", () => {
    const a = sample("clear-rejection");
    const plan = planFor(a);
    simulateUncertainty(a, plan); // warm-up (JIT)
    const t0 = performance.now();
    const reps = 5;
    for (let i = 0; i < reps; i++) simulateUncertainty(a, plan, { seed: i });
    const per = (performance.now() - t0) / reps;
    expect(per).toBeLessThan(50);
  });

  it("is part of the analysis", () => {
    const r = analyze(sample("borderline"));
    expect(r.uncertainty.runs).toBe(UNCERTAINTY.runs);
    expect(r.uncertainty.band).toHaveLength(r.timeline.points.length);
  });
});

describe("savingsView (money saved panel)", () => {
  it("a feasible plan saves interest and shows the next tier up", () => {
    const v = savingsView(analyze(sample("borderline")), { amount: 10000, termMonths: 36 });
    expect(v.mode).toBe("plan");
    expect(v.savings.todayDeclined).toBe(true);
    expect(v.savings.planDeclined).toBe(false);
    expect(v.savings.saved).toBeGreaterThan(0);
    expect(v.savings.emiDrop).toBeGreaterThan(0);
    expect(v.next).not.toBeNull();
    expect(v.next!.points).toBeGreaterThan(0);
    expect(v.next!.extraSaved).toBeGreaterThan(0);
    expect(v.next!.tier.minScore).toBeGreaterThan(v.scoreAfter);
  });

  it("an approved applicant is priced against the next better tier", () => {
    const r = analyze(sample("approved"));
    const v = savingsView(r);
    expect(v.mode).toBe("approved");
    expect(v.savings.todayDeclined).toBe(false);
    if (v.next) {
      expect(v.scoreAfter).toBe(v.next.tier.minScore);
      expect(v.next.extraSaved).toBeCloseTo(v.savings.saved, 9);
      expect(v.next.points).toBeGreaterThanOrEqual(1);
    } else expect(v.savings.saved).toBe(0);
  });

  it("an infeasible applicant gets the closest plan, honestly (no saving while still declined)", () => {
    // A history reported as bureau code 98: the model flags it and no action clears the flag.
    const hard = { ...sample("clear-rejection"), late30: 98, late60: 98, late90: 98 };
    const r = analyze(hard);
    expect(r.recourse.status).toBe("infeasible");
    const v = savingsView(r);
    expect(v.mode).toBe("closest");
    expect(v.savings.planDeclined).toBe(true);
    expect(v.savings.saved).toBe(0);
    expect(v.next?.tier.id).toBe("fair");
  });

  it("scales with the loan: a bigger loan saves more", () => {
    const r = analyze(sample("clear-rejection"));
    expect(savingsView(r, { amount: 20000 }).savings.saved).toBeGreaterThan(savingsView(r, { amount: 10000 }).savings.saved);
  });
});

describe("localized assumption rows", () => {
  it("English is the config text verbatim; every language has the same rows", () => {
    expect(pricingRows("en")).toEqual(describePricing());
    expect(uncertaintyRows("en")).toEqual(describeUncertainty());
    for (const l of LANGS) {
      expect(pricingRows(l.id)).toHaveLength(describePricing().length);
      expect(uncertaintyRows(l.id)).toHaveLength(describeUncertainty().length);
      for (const row of [...pricingRows(l.id), ...uncertaintyRows(l.id)]) expect(row.value).not.toMatch(/\{\w+\}/);
    }
  });

  it("month phrases handle today, one month, many months and beyond the horizon", () => {
    for (const l of LANGS) {
      for (const m of [0, 1, 7, null]) {
        expect(monthsText(l.id, m, 36)).not.toMatch(/\{\w+\}/);
        expect(likelyText(l.id, m, 36)).not.toMatch(/\{\w+\}/);
      }
    }
    expect(monthsText("en", null, 36)).toBe("beyond 36 months");
    expect(likelyText("en", 7, 36)).toBe("Likely approved in 7 months");
  });
});
