import { describe, expect, it } from "vitest";
import { MODEL, logit, score, scoreFromLogit } from "../model";
import { SAMPLES } from "../samples";
import { applyChanges, contributions, whatIf } from "../whatif";

const asha = SAMPLES[0].applicant;

describe("whatIf", () => {
  it("with no changes equals today's score", () => {
    for (const s of SAMPLES) {
      const r = whatIf(s.applicant, {});
      expect(r.score).toBeCloseTo(score(s.applicant), 9);
      expect(r.delta).toBeCloseTo(0, 9);
      expect(r.interestSaved === null || Math.abs(r.interestSaved) < 1e-6).toBe(true);
    }
  });

  it("never lowers the score when utilization goes down", () => {
    let prev = -Infinity;
    for (let u = asha.utilization; u >= 0; u -= 0.05) {
      const r = whatIf(asha, { utilization: Math.max(0, u) });
      expect(r.score).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r.score;
    }
  });

  it("removes late counts after 24 months", () => {
    const a = applyChanges({ ...asha, late30: 2, late60: 1, late90: 1 }, { monthsWaited: 24 });
    expect([a.late30, a.late60, a.late90]).toEqual([0, 0, 0]);
  });

  it("keeps a missing income missing", () => {
    const a = applyChanges({ ...asha, monthlyIncome: NaN }, { incomeGrowth: 0.2 });
    expect(Number.isNaN(a.monthlyIncome)).toBe(true);
  });

  it("does not mutate the applicant and reports points to approval", () => {
    const copy = { ...asha };
    const r = whatIf(asha, { utilization: 0.3 });
    expect(asha).toEqual(copy);
    expect(r.pointsToApproval).toBe(r.approved ? 0 : MODEL.thresholdScore - r.score);
  });
});

describe("contributions", () => {
  it("sums to the score minus the average applicant's score", () => {
    for (const s of SAMPLES) {
      const z = logit(s.applicant);
      if (score(s.applicant) <= 300 || score(s.applicant) >= 900) continue;
      const ptsPerLogit = MODEL.pointsToDoubleOdds / Math.LN2;
      const sum = contributions(s.applicant).reduce((t, c) => t + c.points, 0);
      // Score at the intercept alone (every feature at its training mean) plus the points.
      const base = scoreFromLogit(MODEL.intercept);
      expect(base + sum).toBeCloseTo(scoreFromLogit(z), 6);
      expect(ptsPerLogit).toBeGreaterThan(0);
    }
  });

  it("returns one entry per model feature", () => {
    expect(contributions(asha).map((c) => c.key)).toEqual(MODEL.features.map((f) => f.key));
  });
});
