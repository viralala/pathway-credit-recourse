import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ASSUMPTIONS, FEATURE_CLASS } from "../config";
import { DEFAULT_GOAL, GOAL_LIMITS, affordabilityFor, bestTier, normalizeGoal, planGoal, principalFor, type Goal } from "../goal";
import { MODEL, isApproved, score } from "../model";
import { INR_PER_MODEL_UNIT } from "../money";
import { PRICING, emi, scoreForApr } from "../pricing";
import { findRecourse, type RecourseResult } from "../recourse";
import { SAMPLES } from "../samples";
import { aprText, milestoneText } from "../strings/goal";
import { simulate, type Timeline } from "../timeline";
import type { Applicant, FeatureKey } from "../types";
import { GOAL_PARAM, applicantFromParams, goalFromParams, paramsFor } from "../url";

// The held-out sample is stored in the model's dataset units; the engine takes rupees (lib/money.ts).
const evalSample: Applicant[] = (
  JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../ml/artifacts/eval_sample.json"), "utf8")) as Applicant[]
).map((a) => ({ ...a, monthlyIncome: a.monthlyIncome * INR_PER_MODEL_UNIT }));
const subset = evalSample.slice(0, 200);
const immutable = (Object.keys(FEATURE_CLASS) as FeatureKey[]).filter((k) => FEATURE_CLASS[k] === "immutable");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const sample = (id: string) => SAMPLES.find((s) => s.id === id)!.applicant;
const planOf = (r: RecourseResult) => (r.status === "plan" ? r.plan : r.status === "infeasible" ? r.closest : null);
/** Only the fields the Timeline had before goal planning existed. */
const legacyTimeline = (t: Timeline) => ({
  points: t.points,
  approvalMonth: t.approvalMonth,
  baselineApprovalMonth: t.baselineApprovalMonth,
  thresholdScore: t.thresholdScore,
});
/** Tier cut-offs above approval, lowest first. */
const tierScores = PRICING.tiers
  .map((t) => t.minScore)
  .filter((s) => s > MODEL.thresholdScore)
  .sort((x, y) => x - y);

/**
 * SHA-256 of JSON.stringify(findRecourse / simulate results) on the first 200 eval applicants, recorded
 * from the engine BEFORE the optional target was added, re-recorded when money moved to rupees (a
 * one-off run against the dollar engine matched score, plan status, effort, months and approval month
 * on all 3,000 eval applicants). `fingerprint` hashes the inputs (model,
 * assumptions, applicants); if any of them is changed on purpose, the recorded output no longer applies
 * and that one comparison is skipped (the equivalence tests below still run).
 */
const LEGACY = {
  fingerprint: "3f3eac8f5aed9139541ad8622e07860c49c013528444f9a6ab8285ae3d1d5420",
  recourse: "979d56d0f57baba1454b6871a8cb65d9e5afbf0f21a14bd716894a1f66ab882f",
  timeline: "0327921c082cc3f3863e364f55a6242a04a10962d93c8f305a8ff2f04c6fd74d",
};
const inputsUnchanged = sha(JSON.stringify({ MODEL, ASSUMPTIONS, subset })) === LEGACY.fingerprint;

describe("engine without a target (legacy behaviour)", () => {
  it.skipIf(!inputsUnchanged)("reproduces the pre-goal engine byte for byte on 200 eval applicants", () => {
    const recourse = subset.map((a) => findRecourse(a));
    const timelines = subset.map((a, i) => legacyTimeline(simulate(a, planOf(recourse[i]))));
    expect(sha(JSON.stringify(recourse))).toBe(LEGACY.recourse);
    expect(sha(JSON.stringify(timelines))).toBe(LEGACY.timeline);
  });

  it("an omitted, empty, cut-off or below-cut-off target all give identical results", () => {
    for (const a of subset) {
      const base = findRecourse(a);
      const json = JSON.stringify(base);
      expect(JSON.stringify(findRecourse(a, MODEL, ASSUMPTIONS, {}))).toBe(json);
      expect(JSON.stringify(findRecourse(a, MODEL, ASSUMPTIONS, { targetScore: MODEL.thresholdScore }))).toBe(json);
      expect(JSON.stringify(findRecourse(a, MODEL, ASSUMPTIONS, { targetScore: 400 }))).toBe(json);
      expect(JSON.stringify(findRecourse(a, MODEL, ASSUMPTIONS, { targetScore: Number.NaN }))).toBe(json);

      const plan = planOf(base);
      const t = simulate(a, plan);
      expect(t.targetMonth).toBe(t.approvalMonth);
      expect(t.targetScore).toBe(MODEL.thresholdScore);
      const withTarget = simulate(a, plan, MODEL, ASSUMPTIONS, { targetScore: MODEL.thresholdScore });
      expect(JSON.stringify(withTarget)).toBe(JSON.stringify(t));
    }
  });
});

describe("recourse with a target score", () => {
  it("reaches the target: the plan's end state and the simulated month both score at least the target", () => {
    let plans = 0;
    for (const target of tierScores)
      for (const a of subset) {
        const r = findRecourse(a, MODEL, ASSUMPTIONS, { targetScore: target });
        if (r.status === "approved") {
          expect(score(a)).toBeGreaterThanOrEqual(target - 1e-9);
          continue;
        }
        expect(score(a)).toBeLessThan(target + 1e-9);
        if (r.status === "infeasible") {
          expect(score(r.closest.target)).toBeLessThan(target + 1e-9);
          continue;
        }
        plans++;
        expect(score(r.plan.target)).toBeGreaterThanOrEqual(target - 1e-9);
        expect(isApproved(r.plan.target)).toBe(true);
        expect(r.plan.months).toBeLessThanOrEqual(ASSUMPTIONS.horizonMonths);

        const t = simulate(a, r.plan, MODEL, ASSUMPTIONS, { targetScore: target });
        expect(t.targetScore).toBe(target);
        expect(t.targetMonth).not.toBeNull();
        expect(t.targetMonth!).toBeLessThanOrEqual(r.plan.months);
        expect(t.points[t.targetMonth!].score).toBeGreaterThanOrEqual(target - 1e-9);
        if (t.targetMonth! > 0) expect(t.points[t.targetMonth! - 1].score).toBeLessThan(target + 1e-9);
        // Reaching a better tier always means being approved, never later than approval.
        expect(t.approvalMonth).not.toBeNull();
        expect(t.approvalMonth!).toBeLessThanOrEqual(t.targetMonth!);
      }
    expect(plans).toBeGreaterThan(20);
  });

  it("a higher target never needs less effort", () => {
    for (const a of subset.filter((x) => !isApproved(x)).slice(0, 60)) {
      let prev = 0;
      for (const target of [MODEL.thresholdScore, ...tierScores]) {
        const r = findRecourse(a, MODEL, ASSUMPTIONS, { targetScore: target });
        if (r.status !== "plan") break;
        expect(r.plan.effort).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = r.plan.effort;
      }
    }
  });
});

const GOALS: Goal[] = [
  { amount: 10000, termMonths: 36, maxApr: 0.36 },
  { amount: 10000, termMonths: 36, maxApr: 0.15 },
  { amount: 25000, termMonths: 60, maxApr: 0.125 },
  { amount: 5000, termMonths: 12, maxApr: 0.1 },
];

describe("planGoal", () => {
  it("never changes immutable features, in the plan or any simulated month", () => {
    for (const a of [...SAMPLES.map((s) => s.applicant), ...subset.slice(0, 80)])
      for (const g of GOALS) {
        const gp = planGoal(a, g);
        for (const k of immutable) {
          expect(gp.targetState[k]).toBe(a[k]);
          for (const pt of gp.timeline.points) expect(pt.state[k]).toBe(a[k]);
        }
      }
  });

  it("works out the score an APR needs and where the applicant stands", () => {
    const g = planGoal(sample("borderline"), { amount: 10000, termMonths: 36, maxApr: 0.15 });
    expect(g.requiredScore).toBe(scoreForApr(0.15));
    expect(g.targetScore).toBe(g.requiredScore);
    expect(g.targetApr).toBeLessThanOrEqual(0.15);
    expect(g.currentScore).toBeCloseTo(score(sample("borderline")), 9);
    expect(g.declinedToday).toBe(true);
    expect(g.currentApr).toBeNull();
    expect(g.today.effectiveApr).toBe(PRICING.declinedAlternativeApr);
    expect(g.status).toBe("plan");
    expect(g.targetMonth).not.toBeNull();
    expect(g.scoreAfter).toBeGreaterThanOrEqual(g.targetScore - 1e-9);
    expect(g.pointsToGo).toBeCloseTo(g.targetScore - g.currentScore, 9);
    expect(g.emi).toBeCloseTo(emi(10000, g.targetApr, 36), 9);
    expect(g.interestSaved).toBeGreaterThan(0);
  });

  it("reports a goal already met today with no plan and no milestones", () => {
    const g = planGoal(sample("approved"), { amount: 10000, termMonths: 36, maxApr: 0.18 });
    expect(g.status).toBe("met-today");
    expect(g.meetsToday).toBe(true);
    expect(g.plan).toBeNull();
    expect(g.targetMonth).toBe(0);
    expect(g.pointsToGo).toBe(0);
    expect(g.milestones).toEqual([]);
    expect(g.today.declined).toBe(false);
    expect(g.today.apr).not.toBeNull();
  });

  it("returns a null required score when the APR is below the cheapest tier, and aims for the best tier", () => {
    const best = bestTier();
    expect(scoreForApr(best.apr - 0.001)).toBeNull();
    const g = planGoal(sample("borderline"), { amount: 10000, termMonths: 36, maxApr: best.apr - 0.005 });
    expect(g.requiredScore).toBeNull();
    expect(g.aprReachable).toBe(false);
    expect(g.cheapestApr).toBe(best.apr);
    expect(g.targetScore).toBe(best.minScore);
    expect(g.targetApr).toBe(best.apr);
    expect(g.timeline.targetScore).toBe(best.minScore);
  });

  it("shows the closest plan when the target cannot be reached within the horizon", () => {
    const g = planGoal(sample("clear-rejection"), { amount: 10000, termMonths: 36, maxApr: 0.105 });
    expect(g.status).toBe("infeasible");
    expect(g.plan).not.toBeNull();
    expect(g.targetMonth).toBeNull();
    expect(g.scoreAfter).toBeLessThan(g.targetScore);
  });

  it("clamps the goal to the planner's limits", () => {
    const g = planGoal(sample("borderline"), { amount: 1e9, termMonths: 3, maxApr: 0.9 });
    expect(g.goal).toEqual({ amount: GOAL_LIMITS.amount.max, termMonths: GOAL_LIMITS.termMonths.min, maxApr: GOAL_LIMITS.maxApr.max });
    expect(normalizeGoal({ amount: Number.NaN, termMonths: 36.4, maxApr: 0.12345 })).toEqual({
      amount: DEFAULT_GOAL.amount,
      termMonths: 36,
      maxApr: 0.1235,
    });
  });

  it("lists milestones in chronological order, with unique keys and the goal at the target month", () => {
    let seenGoal = 0;
    for (const a of [...SAMPLES.map((s) => s.applicant), ...subset.filter((x) => !isApproved(x)).slice(0, 40)])
      for (const goal of GOALS) {
        const g = planGoal(a, goal);
        const ms = g.milestones;
        for (let i = 1; i < ms.length; i++) expect(ms[i].month).toBeGreaterThanOrEqual(ms[i - 1].month);
        expect(new Set(ms.map((m) => m.key)).size).toBe(ms.length);
        for (const m of ms) {
          expect(m.month).toBeGreaterThanOrEqual(1);
          expect(m.month).toBeLessThanOrEqual(g.horizonMonths);
        }
        const goalMs = ms.filter((m) => m.kind === "goal");
        if (g.status === "plan" && g.targetMonth! > 0) {
          expect(goalMs).toHaveLength(1);
          expect(goalMs[0].month).toBe(g.targetMonth);
          seenGoal++;
        } else expect(goalMs).toHaveLength(0);
        const approval = ms.find((m) => m.kind === "approval" || (m.kind === "goal" && m.approval));
        if (approval) expect(approval.month).toBe(g.approvalMonth);
      }
    expect(seenGoal).toBeGreaterThan(10);
  });

  it("names the clear-rejection sample's late payments ageing out", () => {
    const g = planGoal(sample("clear-rejection"), { amount: 10000, termMonths: 36, maxApr: 0.18 });
    const lastLate60 = g.milestones.find((m) => m.kind === "late" && m.feature === "late60" && m.remaining === 0);
    expect(lastLate60).toBeDefined();
    expect(g.timeline.points[lastLate60!.month].state.late60).toBe(0);
    expect(g.timeline.points[lastLate60!.month - 1].state.late60).toBeGreaterThan(0);
  });
});

describe("affordability", () => {
  it("principalFor inverts emi (round trip)", () => {
    for (const apr of [0, 0.105, 0.18, 0.36])
      for (const n of [12, 36, 60])
        for (const pay of [50, 333.33, 2000]) {
          expect(emi(principalFor(pay, apr, n), apr, n)).toBeCloseTo(pay, 6);
          expect(principalFor(emi(pay * 10, apr, n), apr, n)).toBeCloseTo(pay * 10, 6);
        }
    expect(principalFor(0, 0.15, 36)).toBe(0);
    expect(principalFor(-10, 0.15, 36)).toBe(0);
  });

  it("caps all loan payments at the configured share of income", () => {
    const a = { ...sample("borderline"), monthlyIncome: 5000, debtRatio: 0.3 };
    const f = affordabilityFor(a, 20000, 0.15, 36);
    expect(f.existingPayments).toBeCloseTo(1500, 9);
    expect(f.budget).toBeCloseTo(5000 * PRICING.maxEmiToIncome, 9);
    expect(f.allowed).toBeCloseTo(f.budget - 1500, 9);
    expect(f.emi).toBeCloseTo(emi(20000, 0.15, 36), 9);
    expect(emi(f.maxAmount, 0.15, 36)).toBeCloseTo(f.allowed, 6);
    expect(f.affordable).toBe(20000 <= f.maxAmount);
    expect(affordabilityFor(a, Math.floor(f.maxAmount), 0.15, 36).affordable).toBe(true);
    expect(affordabilityFor(a, Math.ceil(f.maxAmount) + 1, 0.15, 36).affordable).toBe(false);
  });

  it("finds the shortest longer term that fits, or none", () => {
    const a = { ...sample("borderline"), monthlyIncome: 3000, debtRatio: 0.35 };
    const f = affordabilityFor(a, 12000, 0.15, 24);
    expect(f.affordable).toBe(false);
    expect(f.fitTermMonths).not.toBeNull();
    expect(emi(12000, 0.15, f.fitTermMonths!)).toBeLessThanOrEqual(f.allowed + 1e-9);
    expect(emi(12000, 0.15, f.fitTermMonths! - 1)).toBeGreaterThan(f.allowed);
    expect(f.fitTermEmi).toBeCloseTo(emi(12000, 0.15, f.fitTermMonths!), 9);
    expect(f.longestTermEmi).toBeCloseTo(emi(12000, 0.15, GOAL_LIMITS.termMonths.max), 9);

    const full = affordabilityFor({ ...a, debtRatio: 0.62 }, 5000, 0.15, 36);
    expect(full.allowed).toBe(0);
    expect(full.maxAmount).toBe(0);
    expect(full.affordable).toBe(false);
    expect(full.fitTermMonths).toBeNull();
    expect(full.fitTermEmi).toBeNull();
  });

  it("re-checks affordability after the plan with its income and debt payments", () => {
    const a = sample("clear-rejection");
    const g = planGoal(a, { amount: 10000, termMonths: 36, maxApr: 0.105 });
    const after = g.affordability.afterPlan;
    expect(after.monthlyIncome).toBeCloseTo(g.targetState.monthlyIncome, 9);
    expect(after.existingPayments).toBeCloseTo(g.targetState.debtRatio * g.targetState.monthlyIncome, 9);
    expect(after.existingPayments).toBeLessThan(g.affordability.today.existingPayments);
    expect(after.apr).toBe(g.targetApr);
    expect(g.today.affordability.apr).toBe(g.today.effectiveApr);
  });
});

describe("goal strings", () => {
  it("renders every milestone in every language with all placeholders filled", () => {
    const kinds = new Set<string>();
    for (const a of [...SAMPLES.map((s) => s.applicant), ...subset.filter((x) => !isApproved(x)).slice(0, 20)])
      for (const goal of GOALS)
        for (const m of planGoal(a, goal).milestones) {
          kinds.add(m.kind);
          for (const lang of ["en", "hi", "mr"] as const) {
            const text = milestoneText(lang, m);
            expect(text.length).toBeGreaterThan(5);
            expect(text).not.toMatch(/[{}]/);
          }
        }
    expect([...kinds].sort()).toEqual(["approval", "debt", "goal", "income", "late", "lines", "tier", "utilization"]);
  });

  it("formats APRs compactly", () => {
    expect(aprText(0.105)).toBe("10.5%");
    expect(aprText(0.15)).toBe("15%");
    expect(aprText(0.36)).toBe("36%");
  });
});

describe("goal URL parameters", () => {
  it("reads amount, term and APR (in percent), clamping and falling back", () => {
    expect(goalFromParams({ amount: "25000", term: "48", apr: "12.5" })).toEqual({ amount: 25000, termMonths: 48, maxApr: 0.125 });
    expect(goalFromParams({})).toEqual(DEFAULT_GOAL);
    expect(goalFromParams({ amount: "abc", term: "", apr: ["99", "1"] })).toEqual({
      amount: DEFAULT_GOAL.amount,
      termMonths: DEFAULT_GOAL.termMonths,
      maxApr: GOAL_LIMITS.maxApr.max,
    });
  });

  it("round-trips through paramsFor and leaves links without a goal unchanged", () => {
    const a = sample("borderline");
    const goal: Goal = { amount: 18500, termMonths: 42, maxApr: 0.135 };
    const q = Object.fromEntries(new URLSearchParams(paramsFor(a, { goal, lang: "hi" })));
    expect(goalFromParams(q)).toEqual(goal);
    expect(applicantFromParams(q).applicant).toEqual(a);
    expect(q.lang).toBe("hi");
    const plain = paramsFor(a, { sampleId: "borderline" });
    expect(plain).toBe("sample=borderline");
    expect(Object.values(GOAL_PARAM).some((p) => new URLSearchParams(plain).has(p))).toBe(false);
  });
});
