import { describe, expect, it } from "vitest";
import { normalizeProfile } from "@/lib/schemes/normalizer";
import { matchSchemes } from "@/lib/schemes/ranker";
import { PROFILE_FIELDS, PROFILE_FIELD_KEYS, profileSchema } from "@/lib/schemes/schema";
import { PROFILE_FITS_A, TEST_SCHEMES } from "./fixtures/schemes";

describe("normalizeProfile", () => {
  it("returns an empty profile for empty or unusable input, and never throws", () => {
    expect(normalizeProfile({})).toEqual({});
    for (const bad of [null, undefined, 5, "x", [], () => 1, Symbol("s")]) {
      expect(() => normalizeProfile(bad as never)).not.toThrow();
      expect(normalizeProfile(bad as never)).toEqual({});
      expect(normalizeProfile({ profile: bad, applicant: bad as never, goal: bad as never })).toEqual({});
    }
  });

  it("keeps valid values of every type", () => {
    const profile = { age: 30, gender: "female", socialCategory: "sc", areaType: "rural", isTraditionalArtisan: true, hasLoanDefault: false, annualIncome: 250_000 };
    expect(normalizeProfile({ profile })).toEqual(profile);
  });

  it("drops unknown keys", () => {
    const out = normalizeProfile({ profile: { age: 30, favouriteColour: "red", __proto__: { age: 99 }, constructor: 1 } });
    expect(out).toEqual({ age: 30 });
    expect(Object.keys(out)).toEqual(["age"]);
  });

  it("drops out-of-range, wrong-type and non-finite values instead of coercing them", () => {
    const out = normalizeProfile({
      profile: {
        age: 121,
        educationClass: -1,
        loanAmount: 2_000_000_000,
        projectCost: "500000",
        annualIncome: Number.NaN,
        gender: "robot",
        areaType: "",
        sector: null,
        enterpriseForm: 3,
        isTraditionalArtisan: "true",
        hasLoanDefault: 0,
        hasSimilarSchemeLoan: undefined,
      },
    });
    expect(out).toEqual({});
    expect(normalizeProfile({ profile: { age: Infinity } })).toEqual({});
    expect(normalizeProfile({ profile: { age: -Infinity } })).toEqual({});
    expect(normalizeProfile({ profile: { age: 120, educationClass: 15 } })).toEqual({ age: 120, educationClass: 15 });
    expect(normalizeProfile({ profile: { age: 0 } })).toEqual({ age: 0 });
  });

  it("floors whole-number fields and rounds rupee amounts", () => {
    const out = normalizeProfile({ profile: { age: 29.9, educationClass: 10.7, loanAmount: 100_000.6, projectCost: 50_000.4, annualIncome: 120_000.5 } });
    expect(out).toEqual({ age: 29, educationClass: 10, loanAmount: 100_001, projectCost: 50_000, annualIncome: 120_001 });
    expect(Object.is(normalizeProfile({ profile: { age: -0 } }).age, 0)).toBe(true);
  });

  it("derives annualIncome from the applicant's monthly income", () => {
    expect(normalizeProfile({ applicant: { monthlyIncome: 25_000 } })).toEqual({ annualIncome: 300_000 });
    expect(normalizeProfile({ applicant: { monthlyIncome: 10_000.4 } })).toEqual({ annualIncome: 120_005 });
    for (const bad of [0, -5, Number.NaN, Infinity, "25000", null, undefined, 1e9])
      expect(normalizeProfile({ applicant: { monthlyIncome: bad } })).toEqual({});
  });

  it("derives loanAmount from the goal", () => {
    expect(normalizeProfile({ goal: { amount: 500_000 } })).toEqual({ loanAmount: 500_000 });
    expect(normalizeProfile({ goal: { amount: 99_999.5 } })).toEqual({ loanAmount: 100_000 });
    for (const bad of [0, -1, 0.2, Number.NaN, Infinity, "5000", null, 2e9])
      expect(normalizeProfile({ goal: { amount: bad } })).toEqual({});
  });

  it("does not override values the profile supplied", () => {
    const out = normalizeProfile({
      profile: { annualIncome: 100_000, loanAmount: 200_000 },
      applicant: { monthlyIncome: 50_000 },
      goal: { amount: 900_000 },
    });
    expect(out).toEqual({ annualIncome: 100_000, loanAmount: 200_000 });
  });

  it("derives when the supplied value was invalid and so dropped", () => {
    const out = normalizeProfile({ profile: { annualIncome: "lots", loanAmount: -5 }, applicant: { monthlyIncome: 10_000 }, goal: { amount: 300_000 } });
    expect(out).toEqual({ annualIncome: 120_000, loanAmount: 300_000 });
  });

  it("keeps a supplied zero rather than deriving over it", () => {
    expect(normalizeProfile({ profile: { annualIncome: 0 }, applicant: { monthlyIncome: 10_000 } })).toEqual({ annualIncome: 0 });
  });

  it("output keys follow PROFILE_FIELD_KEYS order regardless of input order", () => {
    const a = normalizeProfile({ profile: { hasLoanDefault: false, gender: "male", age: 30 }, goal: { amount: 1000 } });
    const b = normalizeProfile({ goal: { amount: 1000 }, profile: { age: 30, gender: "male", hasLoanDefault: false } });
    expect(Object.keys(a)).toEqual(Object.keys(b));
    expect(Object.keys(a)).toEqual(PROFILE_FIELD_KEYS.filter((k) => k in a));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("only ever contains PROFILE_FIELDS keys, and the output is a valid profile", () => {
    const out = normalizeProfile({
      profile: { ...PROFILE_FITS_A, extra: 1, score: 700, pd: 0.1, utilization: 0.3, late30: 2, approved: true },
      applicant: { monthlyIncome: 20_000, utilization: 0.4, debtRatio: 0.2 } as never,
      goal: { amount: 250_000, termMonths: 36 } as never,
    });
    for (const k of Object.keys(out)) expect(Object.keys(PROFILE_FIELDS)).toContain(k);
    expect(profileSchema.safeParse(out).success).toBe(true);
  });

  it("survives a throwing getter", () => {
    const profile = {
      get age(): number {
        throw new Error("boom");
      },
      gender: "female",
    };
    expect(normalizeProfile({ profile })).toEqual({ gender: "female" });
  });
});

describe("credit fields never reach scheme matching", () => {
  const base = { profile: { ...PROFILE_FITS_A }, applicant: { monthlyIncome: 20_000 }, goal: { amount: 500_000 } };
  const credit = { score: 812, pd: 0.01, utilization: 0.95, late30: 3, late60: 1, late90: 1, approved: false, debtRatio: 2, openCreditLines: 9 };

  it("is ignored in the profile, the applicant and the goal", () => {
    const withCredit = {
      profile: { ...base.profile, ...credit },
      applicant: { ...base.applicant, ...credit },
      goal: { ...base.goal, ...credit },
      ...credit,
    };
    expect(normalizeProfile(withCredit as never)).toEqual(normalizeProfile(base));
  });

  it("gives an identical matching result for two inputs that differ only in credit fields", () => {
    const good = { ...base, applicant: { ...base.applicant, utilization: 0.05, late30: 0, debtRatio: 0 }, score: 850, pd: 0.001, approved: true };
    const poor = { ...base, applicant: { ...base.applicant, utilization: 1.4, late30: 9, debtRatio: 3 }, score: 300, pd: 0.9, approved: false };
    const a = matchSchemes(TEST_SCHEMES, normalizeProfile(good as never));
    const b = matchSchemes(TEST_SCHEMES, normalizeProfile(poor as never));
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
