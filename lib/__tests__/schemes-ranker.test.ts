import { describe, expect, it } from "vitest";
import { evaluateScheme } from "@/lib/schemes/matcher";
import { RELEVANCE_WEIGHTS, matchSchemes, missingFieldsAcross, rankMatches, relevanceOf } from "@/lib/schemes/ranker";
import type { ApplicantSchemeProfile, Scheme, SchemeMatch } from "@/lib/schemes/types";
import {
  PROFILE_FITS_A,
  TEST_SCHEMES,
  TEST_SCHEME_A,
  TEST_SCHEME_B,
  TEST_SCHEME_C,
  TEST_SCHEME_D,
  TEST_SCHEME_V1,
  TEST_SCHEME_V2,
  all,
  crit,
  eligibility,
  makeScheme,
} from "./fixtures/schemes";

const relevance = (s: Scheme, p: ApplicantSchemeProfile) => relevanceOf(s, evaluateScheme(s, p), p);
const factor = (r: ReturnType<typeof relevance>, key: "required" | "preferred" | "amount") => r.factors.find((f) => f.key === key)!;
const slugs = (ms: SchemeMatch[]) => ms.map((m) => m.scheme.slug);

/** Every ordering of a list (small lists only). */
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

describe("relevance weights and factors", () => {
  it("weights sum to 100", () => {
    expect(RELEVANCE_WEIGHTS.required + RELEVANCE_WEIGHTS.preferred + RELEVANCE_WEIGHTS.amount).toBe(100);
  });

  it("always lists the three factors in order and keeps the score within 0..100", () => {
    const profiles: ApplicantSchemeProfile[] = [{}, { age: 30 }, PROFILE_FITS_A, { age: 70, loanAmount: 1 }, { loanAmount: 2e9 }];
    for (const s of [...TEST_SCHEMES, TEST_SCHEME_V1, TEST_SCHEME_V2])
      for (const p of profiles) {
        const r = relevance(s, p);
        expect(r.factors.map((f) => f.key)).toEqual(["required", "preferred", "amount"]);
        expect(Number.isInteger(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
        expect(r.factors.reduce((n, f) => n + f.max, 0)).toBe(100);
        for (const f of r.factors) {
          expect(f.points).toBeGreaterThanOrEqual(0);
          expect(f.points).toBeLessThanOrEqual(f.max);
        }
      }
  });

  it("scores zero for an empty profile", () => {
    for (const s of TEST_SCHEMES) expect(relevance(s, {}).score).toBe(0);
  });

  it("splits the weights 70 / 10 / 20 when the scheme has preferred criteria and amount bounds", () => {
    const r = relevance(TEST_SCHEME_A, PROFILE_FITS_A);
    // required: the rule passes as a whole (the unneeded income branch of the `any` costs nothing), preferred 2 of 2, amount inside the bounds.
    expect(r.factors).toEqual([
      { key: "required", points: 70, max: 70 },
      { key: "preferred", points: 10, max: 10 },
      { key: "amount", points: 20, max: 20 },
    ]);
    expect(r.score).toBe(100);
  });

  it("counts only confirmed criteria: a failed or unknown preferred criterion earns nothing", () => {
    const r = relevance(TEST_SCHEME_A, { ...PROFILE_FITS_A, gender: "male", socialCategory: undefined });
    expect(factor(r, "preferred")).toEqual({ key: "preferred", points: 0, max: 10 });
    expect(relevance(TEST_SCHEME_A, { ...PROFILE_FITS_A, gender: "male" }).factors[1].points).toBe(5);
  });

  it("gives the preferred weight to `required` when there are no preferred criteria", () => {
    const full = relevance(TEST_SCHEME_D, { socialCategory: "sc", loanAmount: 60_000 });
    expect(full.factors).toEqual([
      { key: "required", points: 80, max: 80 },
      { key: "preferred", points: 0, max: 0 },
      { key: "amount", points: 20, max: 20 },
    ]);
    expect(full.score).toBe(100);
  });

  it("gives the amount weight to `required` when the scheme has no amount bounds", () => {
    const none = relevance(TEST_SCHEME_B, { sector: "services", isGovernmentEmployee: false, hasLoanDefault: false, age: 30 });
    expect(none.factors).toEqual([
      { key: "required", points: 100, max: 100 },
      { key: "preferred", points: 0, max: 0 },
      { key: "amount", points: 0, max: 0 },
    ]);
    expect(none.score).toBe(100);
    expect(relevance(TEST_SCHEME_B, { sector: "services", age: 30 }).score).toBe(50);
    // Preferred criteria but no bounds: only the amount weight moves.
    const preferredOnly = makeScheme({ slug: "rank-pref-only", eligibility: eligibility(crit("age", "gte", 18), [crit("gender", "eq", "female")]) });
    expect(relevance(preferredOnly, { age: 30, gender: "female", loanAmount: 1 }).factors).toEqual([
      { key: "required", points: 90, max: 90 },
      { key: "preferred", points: 10, max: 10 },
      { key: "amount", points: 0, max: 0 },
    ]);
  });

  it("scores a fully confirmed scheme C at 70 required points plus nothing it did not earn", () => {
    const r = relevance(TEST_SCHEME_C, { enterpriseForm: "individual", projectCost: 100_000, hasAvailedGovtSubsidy: false, hasSimilarSchemeLoan: false });
    expect(r.factors).toEqual([
      { key: "required", points: 70, max: 70 },
      { key: "preferred", points: 0, max: 10 },
      { key: "amount", points: 0, max: 20 },
    ]);
  });

  it("amount: full points inside the bounds (ends included), none outside, none when unknown", () => {
    const inside = (loanAmount?: number) => factor(relevance(TEST_SCHEME_A, { loanAmount }), "amount");
    expect(inside(100_000)).toEqual({ key: "amount", points: 20, max: 20 });
    expect(inside(2_500_000)).toEqual({ key: "amount", points: 20, max: 20 });
    expect(inside(300_000).points).toBe(20);
    expect(inside(99_999)).toEqual({ key: "amount", points: 0, max: 20 });
    expect(inside(2_500_001)).toEqual({ key: "amount", points: 0, max: 20 });
    expect(inside(undefined)).toEqual({ key: "amount", points: 0, max: 20 });
    // One-sided bounds.
    expect(factor(relevance(TEST_SCHEME_C, { loanAmount: 0 }), "amount").points).toBe(20);
    expect(factor(relevance(TEST_SCHEME_C, { loanAmount: 1_000_001 }), "amount").points).toBe(0);
    expect(factor(relevance(TEST_SCHEME_D, { loanAmount: 49_999 }), "amount").points).toBe(0);
    expect(factor(relevance(TEST_SCHEME_D, { loanAmount: 900_000_000 }), "amount").points).toBe(20);
  });

  it("an unknown amount lowers the ceiling a scheme can reach but never fails it", () => {
    const withAmount = matchSchemes([TEST_SCHEME_A], PROFILE_FITS_A)[0];
    const without = matchSchemes([TEST_SCHEME_A], { ...PROFILE_FITS_A, loanAmount: undefined })[0];
    expect(without.status).toBe(withAmount.status);
    expect(without.relevance.score).toBe(withAmount.relevance.score - 20);
  });

  it("keeps the computed score of a scheme that is not matched", () => {
    const [m] = matchSchemes([TEST_SCHEME_A], { age: 70, businessStage: "new", educationClass: 10, areaType: "rural", loanAmount: 500_000 });
    expect(m.status).toBe("not_matched");
    expect(m.relevance.score).toBeGreaterThan(0);
  });
});

describe("ranking", () => {
  const relevant = makeScheme({ slug: "rank-relevant", eligibility: eligibility(crit("age", "gte", 18)) });
  const needs = makeScheme({ slug: "rank-needs", eligibility: eligibility(all(crit("age", "gte", 18), crit("sector", "eq", "services"), crit("areaType", "eq", "rural"), crit("enterpriseForm", "eq", "shg"))) });
  const missed = makeScheme({ slug: "rank-missed", eligibility: eligibility(all(crit("age", "gte", 18), crit("gender", "eq", "male"))) });
  const profile: ApplicantSchemeProfile = { age: 30, gender: "female" };

  it("orders appears_relevant, then needs_more_information, then not_matched, even when a lower status scores higher", () => {
    const ms = matchSchemes([missed, needs, relevant], profile);
    expect(ms.map((m) => m.status)).toEqual(["appears_relevant", "needs_more_information", "not_matched"]);
    expect(slugs(ms)).toEqual(["rank-relevant", "rank-needs", "rank-missed"]);
    const byName = Object.fromEntries(ms.map((m) => [m.scheme.slug, m.relevance.score]));
    expect(byName["rank-missed"]).toBeGreaterThan(byName["rank-needs"]);
  });

  it("orders by score descending inside a status", () => {
    const high = makeScheme({ slug: "zz-high", eligibility: eligibility(all(crit("age", "gte", 18), crit("gender", "eq", "female"), crit("sector", "eq", "services"))) });
    const low = makeScheme({ slug: "aa-low", eligibility: eligibility(all(crit("age", "gte", 18), crit("sector", "eq", "services"), crit("areaType", "eq", "rural"), crit("enterpriseForm", "eq", "shg"))) });
    const ms = matchSchemes([low, high], profile);
    expect(ms.every((m) => m.status === "needs_more_information")).toBe(true);
    expect(ms.map((m) => m.relevance.score)).toEqual([67, 25]);
    expect(slugs(ms)).toEqual(["zz-high", "aa-low"]);
  });

  it("breaks ties by slug ascending", () => {
    const mk = (slug: string) => makeScheme({ slug, eligibility: eligibility(crit("age", "gte", 18)) });
    expect(slugs(matchSchemes([mk("tie-c"), mk("tie-a"), mk("tie-b")], profile))).toEqual(["tie-a", "tie-b", "tie-c"]);
  });

  it("gives the same ranking for every input order", () => {
    const set = [TEST_SCHEME_A, TEST_SCHEME_B, TEST_SCHEME_C, TEST_SCHEME_D, relevant];
    for (const p of [PROFILE_FITS_A, {}, { age: 70 }]) {
      const first = matchSchemes(set, p);
      for (const order of permutations(set)) expect(matchSchemes(order, p)).toEqual(first);
    }
  });

  it("orders two versions of one slug newest first, so the result never depends on input order", () => {
    const a = matchSchemes([TEST_SCHEME_V1, TEST_SCHEME_V2], {});
    const b = matchSchemes([TEST_SCHEME_V2, TEST_SCHEME_V1], {});
    expect(a.map((m) => m.scheme.version)).toEqual([2, 1]);
    expect(b).toEqual(a);
  });

  it("rankMatches returns a new array and does not mutate its input", () => {
    const ms = matchSchemes([needs, relevant, missed], profile);
    const reversed = [...ms].reverse();
    const copy = [...reversed];
    const out = rankMatches(reversed);
    expect(out).not.toBe(reversed);
    expect(reversed).toEqual(copy);
    expect(out).toEqual(ms);
  });

  it("matchSchemes on an empty list is an empty list", () => {
    expect(matchSchemes([], {})).toEqual([]);
    expect(matchSchemes([], PROFILE_FITS_A)).toEqual([]);
  });

  it("reports the scheme version that was evaluated, with its own evaluation", () => {
    for (const m of matchSchemes([TEST_SCHEME_V1, TEST_SCHEME_V2], { age: 40 })) {
      const source = m.scheme.version === 1 ? TEST_SCHEME_V1 : TEST_SCHEME_V2;
      expect(m.scheme).toBe(source);
      expect(m.evaluation).toEqual(evaluateScheme(source, { age: 40 }));
    }
  });
});

describe("missingFieldsAcross", () => {
  const ASK = { gender: ["eq", "female"], sector: ["eq", "services"], areaType: ["eq", "rural"] } as const;
  /** Passes on age, and needs each listed field before it can be decided. */
  const needing = (slug: string, ...fields: (keyof typeof ASK)[]) =>
    makeScheme({ slug, eligibility: eligibility(all(crit("age", "gte", 18, "base"), ...fields.map((f) => crit(f, ASK[f][0], ASK[f][1])))) });

  it("orders by how many schemes each field would help, ties by PROFILE_FIELD_KEYS order", () => {
    const schemes = [
      needing("m1", "sector", "gender"),
      needing("m2", "sector"),
      needing("m3", "gender", "areaType", "sector"),
      makeScheme({ slug: "m4", eligibility: eligibility(all(crit("age", "gte", 18), crit("educationClass", "gte", 5))) }),
    ];
    const ms = matchSchemes(schemes, { age: 30 });
    expect(missingFieldsAcross(ms)).toEqual(["sector", "gender", "areaType", "educationClass"]);
  });

  it("ignores schemes that are decided one way or the other", () => {
    const schemes = [
      makeScheme({ slug: "done", eligibility: eligibility(crit("age", "gte", 18)) }),
      makeScheme({ slug: "out", eligibility: eligibility(all(crit("age", "lt", 18), crit("gender", "eq", "female"))) }),
      makeScheme({ slug: "open", eligibility: eligibility(all(crit("age", "gte", 18), crit("sector", "eq", "services"))) }),
    ];
    expect(missingFieldsAcross(matchSchemes(schemes, { age: 30 }))).toEqual(["sector"]);
  });

  it("is empty when nothing needs more information, and for an empty list", () => {
    expect(missingFieldsAcross([])).toEqual([]);
    expect(missingFieldsAcross(matchSchemes(TEST_SCHEMES, { age: 30 }).filter((m) => m.status !== "needs_more_information"))).toEqual([]);
  });

  it("an empty profile asks for fields across the fixture schemes, each field once", () => {
    const fields = missingFieldsAcross(matchSchemes(TEST_SCHEMES, {}));
    expect(new Set(fields).size).toBe(fields.length);
    expect(fields.length).toBeGreaterThan(5);
  });
});
