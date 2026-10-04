import { describe, expect, it } from "vitest";
import { MODEL } from "../model";
import { PRICING, aprForScore, emi, moneySaved, nextTier, scoreForApr, tierFor, totalInterest } from "../pricing";

describe("pricing", () => {
  it("declines below the model cut-off and prices the cut-off itself", () => {
    expect(tierFor(MODEL.thresholdScore - 1)).toBeNull();
    expect(aprForScore(MODEL.thresholdScore)).toBe(PRICING.tiers[PRICING.tiers.length - 1].apr);
  });

  it("gives better scores lower or equal APRs", () => {
    let prev = Infinity;
    for (let s = MODEL.thresholdScore; s <= 900; s += 5) {
      const apr = aprForScore(s)!;
      expect(apr).toBeLessThanOrEqual(prev);
      prev = apr;
    }
  });

  it("computes a standard amortising EMI", () => {
    // 10,000 at 12% over 12 months is 888.49 per month.
    expect(emi(10000, 0.12, 12)).toBeCloseTo(888.49, 2);
    expect(emi(1200, 0, 12)).toBeCloseTo(100, 9);
    expect(totalInterest(10000, 0.12, 12)).toBeCloseTo(661.86, 1);
  });

  it("never reports negative savings and saves money when a plan crosses the cut-off", () => {
    const s = moneySaved({ scoreToday: 600, scoreAfter: 660 });
    expect(s.todayDeclined).toBe(true);
    expect(s.planDeclined).toBe(false);
    expect(s.saved).toBeGreaterThan(0);
    expect(moneySaved({ scoreToday: 700, scoreAfter: 650 }).saved).toBe(0);
  });

  it("finds the score needed for a target APR", () => {
    expect(scoreForApr(0.5)).toBe(MODEL.thresholdScore);
    expect(scoreForApr(0.15)).toBe(MODEL.thresholdScore + 40);
    expect(scoreForApr(0.01)).toBeNull();
    expect(nextTier(MODEL.thresholdScore)?.id).toBe("good");
    expect(nextTier(900)).toBeNull();
  });
});
