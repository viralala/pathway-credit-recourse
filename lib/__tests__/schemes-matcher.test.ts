import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateCriterion, evaluateRule, evaluateScheme, statusFor } from "@/lib/schemes/matcher";
import { matchSchemes } from "@/lib/schemes/ranker";
import type { ApplicantSchemeProfile, Criterion, EligibilityRule, Outcome, ProfileFieldKey, RuleOperator, RuleValue } from "@/lib/schemes/types";
import {
  PROFILE_FITS_A,
  TEST_SCHEMES,
  TEST_SCHEME_A,
  TEST_SCHEME_V1,
  TEST_SCHEME_V2,
  all,
  any,
  crit,
  eligibility,
  makeScheme,
  not,
} from "./fixtures/schemes";

const P = (p: ApplicantSchemeProfile) => p;

describe("evaluateCriterion: operators", () => {
  // [field, op, value, profile value, expected]
  const cases: [ProfileFieldKey, RuleOperator, RuleValue | undefined, unknown, Outcome][] = [
    ["gender", "eq", "female", "female", "pass"],
    ["gender", "eq", "female", "male", "fail"],
    ["gender", "neq", "female", "male", "pass"],
    ["gender", "neq", "female", "female", "fail"],
    ["socialCategory", "in", ["sc", "st"], "st", "pass"],
    ["socialCategory", "in", ["sc", "st"], "obc", "fail"],
    ["socialCategory", "not_in", ["sc", "st"], "obc", "pass"],
    ["socialCategory", "not_in", ["sc", "st"], "sc", "fail"],
    ["age", "gte", 18, 18, "pass"],
    ["age", "gte", 18, 17, "fail"],
    ["age", "gte", 18, 40, "pass"],
    ["age", "lte", 60, 60, "pass"],
    ["age", "lte", 60, 61, "fail"],
    ["age", "gt", 18, 19, "pass"],
    ["age", "gt", 18, 18, "fail"],
    ["age", "lt", 60, 59, "pass"],
    ["age", "lt", 60, 60, "fail"],
    ["age", "between", [18, 50], 18, "pass"],
    ["age", "between", [18, 50], 50, "pass"],
    ["age", "between", [18, 50], 17, "fail"],
    ["age", "between", [18, 50], 51, "fail"],
    ["age", "between", [18, 50], 30, "pass"],
    ["isTraditionalArtisan", "is_true", undefined, true, "pass"],
    ["isTraditionalArtisan", "is_true", undefined, false, "fail"],
    ["hasLoanDefault", "is_false", undefined, false, "pass"],
    ["hasLoanDefault", "is_false", undefined, true, "fail"],
    ["age", "gte", 0, 0, "pass"],
  ];

  it.each(cases)("%s %s %j with %j gives %s", (field, op, value, actual, expected) => {
    expect(evaluateCriterion(crit(field, op, value), { [field]: actual } as ApplicantSchemeProfile)).toBe(expected);
  });

  it("is unknown for every operator when the field is missing", () => {
    for (const [field, op, value] of cases) expect(evaluateCriterion(crit(field, op, value), {})).toBe("unknown");
  });

  it("ignores other fields in the profile", () => {
    expect(evaluateCriterion(crit("age", "gte", 18), P({ gender: "female" }))).toBe("unknown");
  });

  it("treats a profile value of the wrong type as not told", () => {
    const bad = { age: "30", gender: "robot", hasLoanDefault: "no" } as unknown as ApplicantSchemeProfile;
    expect(evaluateCriterion(crit("age", "gte", 18), bad)).toBe("unknown");
    expect(evaluateCriterion(crit("gender", "neq", "female"), bad)).toBe("unknown");
    expect(evaluateCriterion(crit("hasLoanDefault", "is_false"), bad)).toBe("unknown");
    expect(evaluateCriterion(crit("age", "lte", 60), { age: Number.NaN })).toBe("unknown");
  });
});

describe("evaluateCriterion: malformed criteria are unknown, never fail, never throw", () => {
  const profile = P({ age: 30, gender: "female", hasLoanDefault: false });
  const malformed: Record<string, unknown>[] = [
    { ...crit("age", "gte", 18), value: "eighteen" },
    { ...crit("age", "gte", 18), value: undefined },
    { ...crit("age", "between", [50, 18]) },
    { ...crit("age", "between", [18]) },
    { ...crit("age", "in", []) },
    { ...crit("gender", "gte", 3) },
    { ...crit("gender", "eq", "robot") },
    { ...crit("gender", "is_true") },
    { ...crit("hasLoanDefault", "eq", "no") },
    { ...crit("hasLoanDefault", "is_true"), value: true },
    { ...crit("age", "gte", 18), field: "creditScore" },
    { ...crit("age", "gte", 18), op: "approximately" },
    { ...crit("age", "gte", 18), op: "approximately", value: 18 },
  ];

  it.each(malformed.map((c, i) => [i, c] as const))("case %s", (_i, c) => {
    expect(() => evaluateCriterion(c as unknown as Criterion, profile)).not.toThrow();
    expect(evaluateCriterion(c as unknown as Criterion, profile)).toBe("unknown");
    expect(evaluateCriterion(c as unknown as Criterion, {})).toBe("unknown");
  });

  it("does not throw on non-objects or malformed groups", () => {
    for (const r of [null, undefined, 5, "all", {}, { type: "all" }, { type: "any", rules: [] }, { type: "all", rules: [] }, { type: "not" }, { type: "xor", rules: [] }]) {
      expect(() => evaluateRule(r as unknown as EligibilityRule, profile)).not.toThrow();
      expect(evaluateRule(r as unknown as EligibilityRule, profile)).toBe("unknown");
    }
  });

  it("a malformed criterion in a scheme gives needs_more_information with nothing to ask for, not a rejection", () => {
    const scheme = makeScheme({
      slug: "test-malformed",
      eligibility: eligibility(all(crit("age", "gte", 18), { ...crit("age", "gte", 18, "bad"), value: "x" } as unknown as Criterion)),
    });
    const ev = evaluateScheme(scheme, { age: 40 });
    expect(ev.outcome).toBe("unknown");
    expect(statusFor(ev)).toBe("needs_more_information");
    expect(ev.missingFields).toEqual([]);
  });
});

describe("Kleene logic", () => {
  const T = crit("age", "gte", 18, "t"); // passes for age 30
  const F = crit("age", "lt", 18, "f"); // fails for age 30
  const U = crit("gender", "eq", "female", "u"); // unknown: gender not given
  const profile = P({ age: 30 });
  const ev = (r: EligibilityRule) => evaluateRule(r, profile);
  const O = { pass: T, fail: F, unknown: U } as const;
  const outcomes = ["pass", "fail", "unknown"] as const;

  it("all", () => {
    const expected = (a: Outcome, b: Outcome): Outcome =>
      a === "fail" || b === "fail" ? "fail" : a === "unknown" || b === "unknown" ? "unknown" : "pass";
    for (const a of outcomes) for (const b of outcomes) expect(ev(all(O[a], O[b]))).toBe(expected(a, b));
  });

  it("any", () => {
    const expected = (a: Outcome, b: Outcome): Outcome =>
      a === "pass" || b === "pass" ? "pass" : a === "unknown" || b === "unknown" ? "unknown" : "fail";
    for (const a of outcomes) for (const b of outcomes) expect(ev(any(O[a], O[b]))).toBe(expected(a, b));
  });

  it("not", () => {
    expect(ev(not(T))).toBe("fail");
    expect(ev(not(F))).toBe("pass");
    expect(ev(not(U))).toBe("unknown");
  });

  it("nests", () => {
    expect(ev(all(T, any(F, U)))).toBe("unknown");
    expect(ev(all(T, any(F, T)))).toBe("pass");
    expect(ev(all(U, any(F, F)))).toBe("fail");
    expect(ev(any(all(T, F), all(T, U)))).toBe("unknown");
    expect(ev(any(all(T, F), not(any(F, F))))).toBe("pass");
    expect(ev(not(all(U, F)))).toBe("pass");
    expect(ev(not(all(U, T)))).toBe("unknown");
    expect(ev(not(not(U)))).toBe("unknown");
    expect(ev(not(not(T)))).toBe("pass");
    expect(ev(all(not(any(F, U)), T))).toBe("unknown");
    expect(ev(all(not(any(F, T)), U))).toBe("fail");
  });
});

describe("evaluateScheme", () => {
  it("passes a person who meets every required criterion", () => {
    const ev = evaluateScheme(TEST_SCHEME_A, PROFILE_FITS_A);
    expect(ev.outcome).toBe("pass");
    expect(ev.missingFields).toEqual([]);
    expect(statusFor(ev)).toBe("appears_relevant");
  });

  it("fails when one required criterion fails, even if others are unknown", () => {
    const ev = evaluateScheme(TEST_SCHEME_A, { age: 70 });
    expect(ev.outcome).toBe("fail");
    expect(ev.missingFields).toEqual([]);
    expect(statusFor(ev)).toBe("not_matched");
  });

  it("lists criteria required first in document order, then preferred, with importance, outcome and actual", () => {
    const ev = evaluateScheme(TEST_SCHEME_A, { age: 30, gender: "male" });
    expect(ev.criteria.map((c) => [c.id, c.importance])).toEqual([
      ["age-between", "required"],
      ["businessstage-eq", "required"],
      ["educationclass-gte", "required"],
      ["areatype-eq", "required"],
      ["annualincome-lte", "required"],
      ["socialcategory-in", "preferred"],
      ["gender-eq", "preferred"],
    ]);
    const age = ev.criteria[0];
    expect(age).toMatchObject({ field: "age", outcome: "pass", actual: 30 });
    expect(ev.criteria[1].outcome).toBe("unknown");
    expect("actual" in ev.criteria[1]).toBe(false);
    expect(ev.criteria[6]).toMatchObject({ outcome: "fail", actual: "male" });
  });

  it("carries the label and sourceRef through", () => {
    const c: Criterion = { ...crit("age", "gte", 18), label: "At least 18 years", sourceRef: "Clause 4(a)" };
    const ev = evaluateScheme(makeScheme({ slug: "test-labels", eligibility: eligibility(c) }), { age: 20 });
    expect(ev.criteria[0]).toEqual({ id: c.id, field: "age", label: "At least 18 years", sourceRef: "Clause 4(a)", importance: "required", outcome: "pass", actual: 20 });
  });

  it("reports missing fields in document order, de-duplicated", () => {
    const scheme = makeScheme({
      slug: "test-missing",
      eligibility: eligibility(all(crit("age", "gte", 18, "a"), crit("gender", "eq", "female"), crit("age", "lte", 60, "b"), crit("sector", "eq", "services"))),
    });
    expect(evaluateScheme(scheme, {}).missingFields).toEqual(["age", "gender", "sector"]);
    expect(evaluateScheme(scheme, { age: 30 }).missingFields).toEqual(["gender", "sector"]);
  });

  it("an `any` with a passing branch reports nothing from the other branches", () => {
    const scheme = makeScheme({
      slug: "test-any",
      eligibility: eligibility(all(crit("age", "gte", 18), any(crit("areaType", "eq", "rural"), crit("annualIncome", "lte", 300_000)))),
    });
    const ev = evaluateScheme(scheme, { age: 30, areaType: "rural" });
    expect(ev.outcome).toBe("pass");
    expect(ev.missingFields).toEqual([]);
    // Same scheme, other branch still open: both fields could change the result.
    expect(evaluateScheme(scheme, { age: 30 }).missingFields).toEqual(["areaType", "annualIncome"]);
    // One branch failed, the other still open: only the open one is worth asking.
    expect(evaluateScheme(scheme, { age: 30, areaType: "urban" }).missingFields).toEqual(["annualIncome"]);
  });

  it("an `any` with a passing branch nested under an unknown `all` still hides its other branches", () => {
    const scheme = makeScheme({
      slug: "test-any-nested",
      eligibility: eligibility(all(crit("gender", "eq", "female"), any(crit("areaType", "eq", "rural"), crit("sector", "eq", "services")))),
    });
    expect(evaluateScheme(scheme, { areaType: "rural" }).missingFields).toEqual(["gender"]);
  });

  it("does not report fields inside a decided `all` branch", () => {
    const scheme = makeScheme({
      slug: "test-decided",
      eligibility: eligibility(any(all(crit("age", "lt", 18), crit("gender", "eq", "female")), crit("sector", "eq", "services"))),
    });
    // The first branch already failed on age, so gender cannot help.
    expect(evaluateScheme(scheme, { age: 30 }).missingFields).toEqual(["sector"]);
  });

  it("descends through `not`", () => {
    const scheme = makeScheme({ slug: "test-not", eligibility: eligibility(not(crit("isGovernmentEmployee", "is_true"))) });
    expect(evaluateScheme(scheme, {}).missingFields).toEqual(["isGovernmentEmployee"]);
    expect(evaluateScheme(scheme, { isGovernmentEmployee: true }).outcome).toBe("fail");
    expect(evaluateScheme(scheme, { isGovernmentEmployee: false }).outcome).toBe("pass");
  });

  it("preferred criteria never affect the outcome or missingFields", () => {
    const base = makeScheme({ slug: "test-pref", eligibility: eligibility(crit("age", "gte", 18), [crit("gender", "eq", "female")]) });
    expect(evaluateScheme(base, { age: 30 })).toMatchObject({ outcome: "pass", missingFields: [] });
    expect(evaluateScheme(base, { age: 30, gender: "male" }).outcome).toBe("pass");
    const unknownRequired = makeScheme({ slug: "test-pref2", eligibility: eligibility(crit("age", "gte", 18), [crit("gender", "eq", "female"), crit("sector", "eq", "services")]) });
    expect(evaluateScheme(unknownRequired, {}).missingFields).toEqual(["age"]);
  });

  it("statusFor maps each outcome", () => {
    const e = (outcome: Outcome) => ({ outcome, criteria: [], missingFields: [] });
    expect(statusFor(e("pass"))).toBe("appears_relevant");
    expect(statusFor(e("unknown"))).toBe("needs_more_information");
    expect(statusFor(e("fail"))).toBe("not_matched");
  });
});

describe("unknown is never a failure", () => {
  it("an empty profile is needs_more_information for every fixture scheme", () => {
    for (const s of [...TEST_SCHEMES, TEST_SCHEME_V1, TEST_SCHEME_V2]) {
      const ev = evaluateScheme(s, {});
      expect(ev.outcome).toBe("unknown");
      expect(ev.criteria.every((c) => c.outcome === "unknown")).toBe(true);
      expect(statusFor(ev)).toBe("needs_more_information");
      expect(ev.missingFields.length).toBeGreaterThan(0);
    }
    expect(matchSchemes(TEST_SCHEMES, {}).every((m) => m.status === "needs_more_information")).toBe(true);
  });

  it("adding an answer can move a scheme to pass or fail, but removing one never produces a fail", () => {
    for (const s of TEST_SCHEMES) {
      const keys = Object.keys(PROFILE_FITS_A) as (keyof typeof PROFILE_FITS_A)[];
      for (const drop of keys) {
        const partial: Record<string, unknown> = { ...PROFILE_FITS_A };
        delete partial[drop];
        const ev = evaluateScheme(s, partial as ApplicantSchemeProfile);
        const full = evaluateScheme(s, PROFILE_FITS_A);
        if (full.outcome !== "fail") expect(ev.outcome).not.toBe("fail");
      }
    }
  });
});

describe("determinism and versioning", () => {
  it("the same input twice gives deep-equal output", () => {
    const profile = P({ age: 30, areaType: "rural", loanAmount: 400_000 });
    expect(matchSchemes(TEST_SCHEMES, profile)).toEqual(matchSchemes(TEST_SCHEMES, profile));
    expect(evaluateScheme(TEST_SCHEME_A, profile)).toEqual(evaluateScheme(TEST_SCHEME_A, profile));
  });

  it("does not mutate the profile or the scheme", () => {
    const profile = P({ age: 30 });
    const before = JSON.stringify([profile, TEST_SCHEME_A]);
    evaluateScheme(TEST_SCHEME_A, profile);
    expect(JSON.stringify([profile, TEST_SCHEME_A])).toBe(before);
  });

  it("two versions of one slug evaluate differently, and the match reports the evaluated version", () => {
    const profile = P({ age: 40, educationClass: 10 });
    expect(evaluateScheme(TEST_SCHEME_V1, profile).outcome).toBe("fail"); // v1 stops at 35
    expect(evaluateScheme(TEST_SCHEME_V2, profile).outcome).toBe("pass"); // v2 allows up to 45
    const [m1] = matchSchemes([TEST_SCHEME_V1], profile);
    const [m2] = matchSchemes([TEST_SCHEME_V2], profile);
    expect([m1.scheme.version, m1.status]).toEqual([1, "not_matched"]);
    expect([m2.scheme.version, m2.status]).toEqual([2, "appears_relevant"]);
    expect(evaluateScheme(TEST_SCHEME_V1, {}).criteria).toHaveLength(2);
    expect(evaluateScheme(TEST_SCHEME_V2, {}).criteria).toHaveLength(1);
  });
});

describe("separation from the credit model", () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, "../schemes", f), "utf8");

  it.each(["matcher.ts", "normalizer.ts", "ranker.ts"])("%s imports nothing from the credit engine", (file) => {
    const src = read(file);
    const imports = [...src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    for (const spec of imports) expect(spec).not.toMatch(/(^|\/)(model|recourse|timeline|montecarlo|pricing|analyze)(\.|$)|@\/lib\/model/);
    expect(src).not.toMatch(/@\/lib\/model|\.\.\/model|\.\/model|recourse|timeline|montecarlo|pricing|analyze/);
  });

  it.each(["matcher.ts", "normalizer.ts", "ranker.ts"])("%s never describes relevance as a probability of approval", (file) => {
    expect(read(file)).not.toMatch(/probab|likelihood|chance/i);
  });
});
