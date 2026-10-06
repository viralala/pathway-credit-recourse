import { describe, expect, it } from "vitest";
import { evaluateRuleOperator, evaluateSchemeEligibility } from "@/lib/schemes/matcher";
import { CuratedSchemeProvider } from "@/lib/schemes/provider";
import { rankSchemeMatches } from "@/lib/schemes/ranker";
import { SEED_GOVERNMENT_SCHEMES } from "@/lib/schemes/seed-data";
import type { NormalizedApplicantSchemeProfile, Scheme } from "@/lib/schemes/types";
import { schemeSchema, applicantSchemeProfileSchema } from "@/lib/schemes/validation";
import { assess, MODEL } from "@/lib/model";
import { analyze } from "@/lib/analyze";
import type { Applicant } from "@/lib/types";

describe("Scheme Data Model & Validation", () => {
  it("validates all seeded schemes against the schema", () => {
    for (const scheme of SEED_GOVERNMENT_SCHEMES) {
      const result = schemeSchema.safeParse(scheme);
      expect(result.success, `Scheme '${scheme.name}' failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      expect(scheme.officialSourceUrl).toMatch(/^https?:\/\//);
      expect(scheme.lastVerifiedAt).toBeDefined();
      expect(scheme.version).toBeDefined();
    }
  });

  it("rejects invalid or malformed scheme structures", () => {
    const invalidScheme = {
      id: "not-a-uuid",
      name: "X", // too short
      slug: "invalid",
      officialSourceUrl: "not-a-valid-url",
    };

    const res = schemeSchema.safeParse(invalidScheme);
    expect(res.success).toBe(false);
  });

  it("validates and sanitizes applicant profiles", () => {
    const validProfile = {
      age: 32,
      state: "Maharashtra",
      loanPurpose: "business",
      loanAmount: 800_000,
      monthlyIncome: 60_000,
    };

    const res = applicantSchemeProfileSchema.safeParse(validProfile);
    expect(res.success).toBe(true);

    const invalidProfile = {
      age: 14, // below minimum 16
      loanAmount: -500, // negative loan amount
    };

    const invalidRes = applicantSchemeProfileSchema.safeParse(invalidProfile);
    expect(invalidRes.success).toBe(false);
  });
});

describe("Generic Rule Engine & Operator Evaluation", () => {
  it("evaluates equality operators ('equals', 'notEquals')", () => {
    expect(evaluateRuleOperator("Maharashtra", "equals", "maharashtra")).toBe(true);
    expect(evaluateRuleOperator("Gujarat", "equals", "Maharashtra")).toBe(false);
    expect(evaluateRuleOperator("business", "notEquals", "personal")).toBe(true);
    expect(evaluateRuleOperator("business", "notEquals", "business")).toBe(false);
  });

  it("evaluates numerical inequality operators ('greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual')", () => {
    expect(evaluateRuleOperator(25, "greaterThanOrEqual", 18)).toBe(true);
    expect(evaluateRuleOperator(17, "greaterThanOrEqual", 18)).toBe(false);
    expect(evaluateRuleOperator(100_000, "lessThanOrEqual", 500_000)).toBe(true);
    expect(evaluateRuleOperator(600_000, "lessThanOrEqual", 500_000)).toBe(false);
    expect(evaluateRuleOperator(30, "greaterThan", 20)).toBe(true);
    expect(evaluateRuleOperator(10, "lessThan", 15)).toBe(true);
  });

  it("evaluates collection operators ('in', 'notIn', 'contains')", () => {
    expect(evaluateRuleOperator("manufacturing", "in", ["manufacturing", "services"])).toBe(true);
    expect(evaluateRuleOperator("agriculture", "in", ["manufacturing", "services"])).toBe(false);
    expect(evaluateRuleOperator("personal", "notIn", ["business", "msme"])).toBe(true);
    expect(evaluateRuleOperator(["business", "export"], "contains", "business")).toBe(true);
  });

  it("evaluates range and boolean operators ('range', 'boolean', 'exists')", () => {
    expect(evaluateRuleOperator(35, "range", [18, 45])).toBe(true);
    expect(evaluateRuleOperator(50, "range", [18, 45])).toBe(false);
    expect(evaluateRuleOperator(true, "boolean", true)).toBe(true);
    expect(evaluateRuleOperator(false, "boolean", true)).toBe(false);
    expect(evaluateRuleOperator("some-doc", "exists", true)).toBe(true);
    expect(evaluateRuleOperator(undefined, "exists", true)).toBe(false);
  });
});

describe("Deterministic Eligibility Matching & Missing Information Handling", () => {
  const pmegp = SEED_GOVERNMENT_SCHEMES.find((s) => s.slug === "pmegp")!;
  const pmmy = SEED_GOVERNMENT_SCHEMES.find((s) => s.slug === "pmmy-mudra")!;
  const cmegp = SEED_GOVERNMENT_SCHEMES.find((s) => s.slug === "maha-cmegp")!;
  const vishwakarma = SEED_GOVERNMENT_SCHEMES.find((s) => s.slug === "pm-vishwakarma")!;

  it("Applicant A: Maharashtra business applicant matching PMEGP, PMMY, and CMEGP", () => {
    const profile: NormalizedApplicantSchemeProfile = {
      age: 30,
      state: "Maharashtra",
      loanPurpose: "business",
      loanAmount: 500_000,
      businessStage: "new",
      firstTimeEntrepreneur: true,
      artisanStatus: false,
    };

    const pmegpMatch = evaluateSchemeEligibility(pmegp, profile);
    const pmmyMatch = evaluateSchemeEligibility(pmmy, profile);
    const cmegpMatch = evaluateSchemeEligibility(cmegp, profile);

    expect(pmegpMatch.matchStatus).toBe("likely_match");
    expect(pmegpMatch.matchStrength).toBeGreaterThanOrEqual(80);
    expect(pmegpMatch.matchedCriteria.length).toBeGreaterThan(0);
    expect(pmegpMatch.unmetCriteria.length).toBe(0);

    expect(pmmyMatch.matchStatus).toBe("likely_match");
    expect(pmmyMatch.matchStrength).toBeGreaterThanOrEqual(80);

    expect(cmegpMatch.matchStatus).toBe("likely_match");
    expect(cmegpMatch.matchedCriteria).toContain("Applicant must be a permanent resident / domicile of Maharashtra state.");
  });

  it("Applicant B: Missing artisan details yields 'insufficient_information' rather than false rejection", () => {
    const profile: NormalizedApplicantSchemeProfile = {
      age: 28,
      loanPurpose: "artisan",
      loanAmount: 150_000,
      // artisanStatus is undefined
    };

    const vishwakarmaMatch = evaluateSchemeEligibility(vishwakarma, profile);

    expect(vishwakarmaMatch.matchStatus).toBe("potential_match");
    expect(vishwakarmaMatch.missingInformation.length).toBeGreaterThan(0);
    expect(vishwakarmaMatch.missingInformation).toContain(
      "Applicant must be engaged in one of the 18 notified traditional trades on hands and tools basis."
    );
  });

  it("Hard Exclusion: State-specific scheme (CMEGP) rejects non-Maharashtra applicant", () => {
    const profile: NormalizedApplicantSchemeProfile = {
      age: 30,
      state: "Gujarat", // Not Maharashtra
      loanPurpose: "business",
      loanAmount: 500_000,
    };

    const cmegpMatch = evaluateSchemeEligibility(cmegp, profile);

    expect(cmegpMatch.matchStatus).toBe("not_matching");
    expect(cmegpMatch.unmetCriteria).toContain("Scheme is exclusive to Maharashtra state residents.");
  });

  it("Hard Exclusion: Loan amount exceeding scheme ceiling rejects match", () => {
    const profile: NormalizedApplicantSchemeProfile = {
      age: 30,
      loanPurpose: "business",
      loanAmount: 2_500_000, // ₹25 Lakh exceeds MUDRA limit of ₹10 Lakh
    };

    const pmmyMatch = evaluateSchemeEligibility(pmmy, profile);
    expect(pmmyMatch.matchStatus).toBe("not_matching");
    expect(pmmyMatch.unmetCriteria).toContain("MUDRA standard product ceiling is ₹10 Lakh (Shishu: ≤₹50k, Kishore: ≤₹5L, Tarun: ≤₹10L).");
  });

  it("handles inactive and expired schemes gracefully", () => {
    const inactiveScheme: Scheme = {
      ...pmmy,
      id: "11111111-1111-1111-1111-111111111111",
      active: false,
    };

    const expiredScheme: Scheme = {
      ...pmmy,
      id: "22222222-2222-2222-2222-222222222222",
      effectiveUntil: "2020-01-01",
    };

    const profile: NormalizedApplicantSchemeProfile = { age: 30, loanPurpose: "business", loanAmount: 200_000 };

    expect(evaluateSchemeEligibility(inactiveScheme, profile).matchStatus).toBe("inactive");
    expect(evaluateSchemeEligibility(expiredScheme, profile).matchStatus).toBe("expired");
  });
});

describe("Ranking & Relevance Scoring", () => {
  it("ranks likely matches higher than potential matches and unmet criteria", async () => {
    const provider = new CuratedSchemeProvider();
    const allSchemes = await provider.getSchemes();

    const profile: NormalizedApplicantSchemeProfile = {
      age: 32,
      state: "Maharashtra",
      loanPurpose: "business",
      loanAmount: 600_000,
      businessStage: "new",
      firstTimeEntrepreneur: true,
      artisanStatus: false,
    };

    const matches = allSchemes.map((s) => evaluateSchemeEligibility(s, profile));
    const response = rankSchemeMatches(matches, profile);

    expect(response.matches.length).toBe(allSchemes.length);
    expect(response.matches[0].matchStrength).toBeGreaterThanOrEqual(response.matches[response.matches.length - 1].matchStrength);

    // Disclaimer must be present
    expect(response.disclaimer).toContain("Scheme matches are based on the information provided");
  });
});

describe("Credit Score Independence & ML Model Invariance", () => {
  it("CRITICAL RULE: Scheme eligibility matching does NOT alter or use credit score as universal gate", () => {
    const applicantWithLowScore: NormalizedApplicantSchemeProfile = {
      age: 30,
      state: "Maharashtra",
      loanPurpose: "business",
      loanAmount: 400_000,
      creditScore: 520, // Low credit score
    };

    const applicantWithHighScore: NormalizedApplicantSchemeProfile = {
      age: 30,
      state: "Maharashtra",
      loanPurpose: "business",
      loanAmount: 400_000,
      creditScore: 810, // High credit score
    };

    const pmegp = SEED_GOVERNMENT_SCHEMES.find((s) => s.slug === "pmegp")!;

    const matchLow = evaluateSchemeEligibility(pmegp, applicantWithLowScore);
    const matchHigh = evaluateSchemeEligibility(pmegp, applicantWithHighScore);

    // Both should receive the exact same match status based on published government criteria
    expect(matchLow.matchStatus).toBe(matchHigh.matchStatus);
    expect(matchLow.matchedCriteria).toEqual(matchHigh.matchedCriteria);
  });

  it("CRITICAL INVARIANCE: Pathway Credit Model predictions and recourse remain 100% untouched", () => {
    const testApplicant: Applicant = {
      monthlyIncome: 70_000,
      utilization: 0.28,
      debtRatio: 0.18,
      openCreditLines: 6,
      late30: 0,
      late60: 0,
      late90: 0,
    };

    const analysis = analyze(testApplicant, { loanType: "unsecured", loanAmount: 500_000 });
    const rawML = assess(testApplicant, MODEL);

    expect(analysis.assessment.score).toBe(rawML.score);
    expect(analysis.assessment.pd).toBe(rawML.pd);
    expect(analysis.assessment.approved).toBe(rawML.approved);
    expect(analysis.recourse.status).toBeDefined();
    expect(analysis.timeline.approvalMonth).toBeDefined();
    expect(analysis.thresholdScore).toBe(MODEL.thresholdScore);
    expect(analysis.loanAssessment.loanType).toBe("unsecured");
  });
});
