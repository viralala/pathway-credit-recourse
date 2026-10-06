import type { Criterion, EligibilityRule, EligibilityRules, ProfileFieldKey, RuleOperator, RuleValue, Scheme } from "@/lib/schemes/types";

/**
 * Fictional schemes for the engine's tests. None of them is a real scheme: real schemes exist only
 * as rows in the database, never in code.
 */

/** A criterion with a placeholder label; `id` defaults to field-op so ids stay unique inside one scheme. */
export function crit(field: ProfileFieldKey, op: RuleOperator, value?: RuleValue, id?: string): Criterion {
  return {
    type: "criterion",
    id: id ?? `${field}-${op}`.toLowerCase().replace(/_/g, "-"),
    field,
    op,
    ...(value !== undefined && { value }),
    label: `Test criterion on ${field}`,
  };
}

export const all = (...rules: EligibilityRule[]): EligibilityRule => ({ type: "all", rules });
export const any = (...rules: EligibilityRule[]): EligibilityRule => ({ type: "any", rules });
export const not = (rule: EligibilityRule): EligibilityRule => ({ type: "not", rule });

export function eligibility(required: EligibilityRule, preferred?: Criterion[]): EligibilityRules {
  return { schemaVersion: 1, required, ...(preferred && { preferred }) };
}

export function makeScheme(overrides: Partial<Scheme> & Pick<Scheme, "slug" | "eligibility">): Scheme {
  return {
    id: `00000000-0000-4000-8000-${String(Math.abs(hash(overrides.slug + (overrides.version ?? 1)))).padStart(12, "0").slice(0, 12)}`,
    version: 1,
    isCurrent: true,
    status: "active",
    name: `Fixture ${overrides.slug}`,
    shortName: overrides.slug.toUpperCase(),
    schemeType: "loan",
    summary: "A fictional scheme used only by tests.",
    benefits: ["A fictional benefit"],
    implementingAgency: "Test Agency",
    ministry: null,
    minLoanAmount: null,
    maxLoanAmount: null,
    howToApply: null,
    applicationUrl: null,
    officialUrl: "https://example.org/test-scheme",
    sources: [{ title: "Test source", url: "https://example.org/test-scheme" }],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "unverified",
    effectiveFrom: null,
    ...overrides,
  };
}

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 999_999_999_989;
  return h;
}

/** Preferred criteria, amount bounds on both sides, a nested `any`. */
export const TEST_SCHEME_A = makeScheme({
  slug: "test-scheme-a",
  name: "Test Scheme A",
  minLoanAmount: 100_000,
  maxLoanAmount: 2_500_000,
  eligibility: eligibility(
    all(
      crit("age", "between", [18, 50]),
      crit("businessStage", "eq", "new"),
      crit("educationClass", "gte", 8),
      any(crit("areaType", "eq", "rural"), crit("annualIncome", "lte", 300_000)),
    ),
    [crit("socialCategory", "in", ["sc", "st"]), crit("gender", "eq", "female")],
  ),
});

/** No preferred criteria and no amount bounds: both weights go to `required`. */
export const TEST_SCHEME_B = makeScheme({
  slug: "test-scheme-b",
  name: "Test Scheme B",
  eligibility: eligibility(
    all(
      crit("sector", "in", ["manufacturing", "services"]),
      crit("isGovernmentEmployee", "is_false"),
      crit("hasLoanDefault", "is_false"),
      crit("age", "gte", 21),
    ),
  ),
});

/** Preferred criteria, only an upper amount bound, a nested group. */
export const TEST_SCHEME_C = makeScheme({
  slug: "test-scheme-c",
  name: "Test Scheme C",
  maxLoanAmount: 1_000_000,
  eligibility: eligibility(
    all(
      crit("enterpriseForm", "not_in", ["company", "trust"]),
      crit("projectCost", "lt", 5_000_000),
      all(crit("hasAvailedGovtSubsidy", "is_false"), crit("hasSimilarSchemeLoan", "is_false")),
    ),
    [crit("isTraditionalArtisan", "is_true"), crit("educationClass", "gt", 4)],
  ),
});

/** One rule, a lower bound only. */
export const TEST_SCHEME_D = makeScheme({
  slug: "test-scheme-d",
  name: "Test Scheme D",
  minLoanAmount: 50_000,
  eligibility: eligibility(crit("socialCategory", "neq", "general")),
});

export const TEST_SCHEMES: Scheme[] = [TEST_SCHEME_A, TEST_SCHEME_B, TEST_SCHEME_C, TEST_SCHEME_D];

/** Two versions of one slug: v2 widens the age range and drops the education rule. */
export const TEST_SCHEME_V1 = makeScheme({
  slug: "test-scheme-versioned",
  name: "Test Scheme Versioned",
  version: 1,
  isCurrent: false,
  status: "retired",
  eligibility: eligibility(all(crit("age", "between", [18, 35]), crit("educationClass", "gte", 8))),
});

export const TEST_SCHEME_V2 = makeScheme({
  slug: "test-scheme-versioned",
  name: "Test Scheme Versioned",
  version: 2,
  eligibility: eligibility(crit("age", "between", [18, 45])),
});

/** A person who satisfies Test Scheme A in full. */
export const PROFILE_FITS_A = {
  age: 30,
  businessStage: "new",
  educationClass: 10,
  areaType: "rural",
  socialCategory: "sc",
  gender: "female",
  loanAmount: 500_000,
} as const;

/** One row of `government_schemes` exactly as the database returns it. */
export function validSchemeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "test-scheme-row",
    version: 1,
    is_current: true,
    status: "active",
    name: "Test Scheme Row",
    short_name: "TSR",
    scheme_type: "loan",
    summary: "A fictional scheme used only by tests.",
    benefits: ["A fictional benefit"],
    implementing_agency: "Test Agency",
    ministry: null,
    min_loan_amount: "50000",
    max_loan_amount: 2_500_000,
    eligibility_rules: { schemaVersion: 1, required: crit("age", "gte", 18), preferred: [crit("gender", "eq", "female")] },
    how_to_apply: null,
    application_url: null,
    official_url: "https://example.org/test-scheme",
    sources: [{ title: "Test source", url: "https://example.org/test-scheme" }],
    last_verified_at: "2026-01-01",
    verification_status: "unverified",
    effective_from: null,
    ...overrides,
  };
}
