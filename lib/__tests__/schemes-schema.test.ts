import { describe, expect, it } from "vitest";
import { RULE_LIMITS, criteriaOf, criterionProblem, depthOf, eligibilityRulesSchema, matchRequestSchema, parseSchemeRow, profileSchema } from "@/lib/schemes/schema";
import type { EligibilityRule } from "@/lib/schemes/types";
import { TEST_SCHEME_A, all, any, crit, eligibility, not, validSchemeRow } from "./fixtures/schemes";

const rulesOk = (v: unknown) => eligibilityRulesSchema.safeParse(v).success;

describe("eligibilityRulesSchema", () => {
  it("accepts a valid document, including every fixture scheme's", () => {
    expect(rulesOk(TEST_SCHEME_A.eligibility)).toBe(true);
    expect(rulesOk(eligibility(crit("age", "gte", 18)))).toBe(true);
    expect(rulesOk(eligibility(all(crit("age", "between", [18, 60]), any(crit("gender", "eq", "female"), not(crit("hasLoanDefault", "is_true"))))))).toBe(true);
  });

  it("rejects a field that does not exist", () => {
    expect(rulesOk(eligibility({ ...crit("age", "gte", 18), field: "creditScore" } as never))).toBe(false);
    expect(rulesOk(eligibility({ ...crit("age", "gte", 18), field: "utilization" } as never))).toBe(false);
  });

  it("rejects a value of the wrong type for the operator", () => {
    const bad = [
      crit("age", "gte", "18"),
      crit("age", "between", 18),
      crit("age", "between", [50, 18]),
      crit("age", "in", 18),
      crit("age", "in", []),
      crit("gender", "eq", ["female"]),
      crit("gender", "eq", "robot"),
      crit("gender", "gte", 3),
      { ...crit("hasLoanDefault", "is_true"), value: true } as never,
      crit("hasLoanDefault", "eq", "yes"),
      crit("age", "is_true"),
      crit("age", "gte"),
    ];
    for (const c of bad) expect(rulesOk(eligibility(c))).toBe(false);
  });

  it("rejects duplicate criterion ids, also between required and preferred", () => {
    expect(rulesOk(eligibility(all(crit("age", "gte", 18, "same"), crit("gender", "eq", "female", "same"))))).toBe(false);
    expect(rulesOk(eligibility(crit("age", "gte", 18, "same"), [crit("gender", "eq", "female", "same")]))).toBe(false);
    expect(rulesOk(eligibility(crit("age", "gte", 18, "one"), [crit("gender", "eq", "female", "two")]))).toBe(true);
  });

  it("rejects rules nested too deep", () => {
    let rule: EligibilityRule = crit("age", "gte", 18, "leaf");
    for (let i = 1; i < RULE_LIMITS.maxDepth; i++) rule = not(rule);
    expect(depthOf(rule)).toBe(RULE_LIMITS.maxDepth);
    expect(rulesOk(eligibility(rule))).toBe(true);
    expect(rulesOk(eligibility(not(rule)))).toBe(false);
  });

  it("rejects too many criteria and too many preferred criteria", () => {
    const many = Array.from({ length: RULE_LIMITS.maxCriteria + 1 }, (_, i) => crit("age", "gte", 18, `c${i}`));
    expect(rulesOk(eligibility(all(...many)))).toBe(false);
    expect(rulesOk(eligibility(all(...many.slice(0, RULE_LIMITS.maxCriteria))))).toBe(true);
    const prefs = Array.from({ length: RULE_LIMITS.maxPreferred + 1 }, (_, i) => crit("age", "gte", 18, `p${i}`));
    expect(rulesOk(eligibility(crit("gender", "eq", "female", "req"), prefs))).toBe(false);
  });

  it("rejects extra keys, a wrong schemaVersion and empty groups", () => {
    const base = eligibility(crit("age", "gte", 18));
    expect(rulesOk({ ...base, extra: true })).toBe(false);
    expect(rulesOk({ ...base, schemaVersion: 2 })).toBe(false);
    expect(rulesOk({ required: base.required })).toBe(false);
    expect(rulesOk(eligibility({ ...crit("age", "gte", 18), extra: 1 } as never))).toBe(false);
    expect(rulesOk(eligibility({ type: "all", rules: [], extra: 1 } as never))).toBe(false);
    expect(rulesOk(eligibility(all()))).toBe(false);
    expect(rulesOk(eligibility(any()))).toBe(false);
    expect(rulesOk(eligibility({ type: "xor", rules: [crit("age", "gte", 18)] } as never))).toBe(false);
  });

  it("criteriaOf lists criteria in document order and criterionProblem agrees with the schema", () => {
    const rule = all(crit("age", "gte", 18, "a"), any(crit("gender", "eq", "female", "b"), not(crit("sector", "eq", "services", "c"))), crit("areaType", "eq", "rural", "d"));
    expect(criteriaOf(rule).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
    expect(criterionProblem(crit("age", "between", [18, 50]))).toBeNull();
    expect(criterionProblem(crit("age", "between", [50, 18]))).not.toBeNull();
  });
});

describe("parseSchemeRow", () => {
  it("turns a valid row into a Scheme, coercing numeric strings", () => {
    const s = parseSchemeRow(validSchemeRow());
    expect(s).not.toBeNull();
    expect(s).toMatchObject({ slug: "test-scheme-row", version: 1, isCurrent: true, minLoanAmount: 50_000, maxLoanAmount: 2_500_000, shortName: "TSR" });
    expect(s!.eligibility.required).toMatchObject({ type: "criterion", field: "age" });
  });

  it("returns null for an http (non-https) official_url, application_url or source url", () => {
    expect(parseSchemeRow(validSchemeRow({ official_url: "http://example.org/x" }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ application_url: "http://example.org/apply" }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ sources: [{ title: "Insecure", url: "http://example.org/x" }] }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ official_url: "javascript:alert(1)" }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ official_url: "not a url" }))).toBeNull();
  });

  it("returns null for missing or empty sources", () => {
    const withoutSources = validSchemeRow();
    delete withoutSources.sources;
    expect(parseSchemeRow(withoutSources)).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ sources: [] }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ sources: null }))).toBeNull();
  });

  it("returns null for a row whose rules are invalid or which is not an object", () => {
    expect(parseSchemeRow(validSchemeRow({ eligibility_rules: { schemaVersion: 1, required: { type: "all", rules: [] } } }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ eligibility_rules: null }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ status: "published" }))).toBeNull();
    expect(parseSchemeRow(validSchemeRow({ version: 0 }))).toBeNull();
    for (const bad of [null, undefined, 3, "row", []]) expect(parseSchemeRow(bad)).toBeNull();
  });
});

describe("profileSchema and matchRequestSchema", () => {
  it("accepts any subset of the known fields", () => {
    expect(profileSchema.safeParse({}).success).toBe(true);
    expect(profileSchema.safeParse({ age: 30, gender: "female", hasLoanDefault: false, loanAmount: 100_000 }).success).toBe(true);
  });

  it("rejects unknown keys, including credit fields", () => {
    for (const key of ["favourite", "score", "utilization", "approved"]) expect(profileSchema.safeParse({ age: 30, [key]: 1 }).success).toBe(false);
  });

  it("rejects out-of-range numbers, bad enum values and wrong types", () => {
    for (const bad of [{ age: -1 }, { age: 121 }, { educationClass: 16 }, { loanAmount: 2_000_000_000 }, { annualIncome: -5 }, { age: Number.NaN }, { age: "30" }, { gender: "robot" }, { isTraditionalArtisan: "yes" }])
      expect(profileSchema.safeParse(bad).success).toBe(false);
  });

  it("matchRequestSchema takes an optional profile, income, goal amount and save flag, and nothing else", () => {
    expect(matchRequestSchema.safeParse({}).success).toBe(true);
    expect(matchRequestSchema.safeParse({ profile: { age: 30 }, applicant: { monthlyIncome: 20_000 }, goal: { amount: 100_000 }, save: true }).success).toBe(true);
    expect(matchRequestSchema.safeParse({ score: 700 }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ profile: { age: 200 } }).success).toBe(false);
  });
});
