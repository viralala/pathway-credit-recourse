/**
 * Government Scheme Matching Engine - Domain Types & Interfaces.
 *
 * Designed for transparent, data-driven matching of verified Indian Government
 * credit support, subsidy, and credit-guarantee schemes.
 */

export type GovernmentLevel = "central" | "state";

export type SchemeCategory =
  | "business"
  | "msme"
  | "artisan"
  | "agriculture"
  | "education"
  | "housing"
  | "women_entrepreneur"
  | "general";

export type RuleOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "contains"
  | "boolean"
  | "range"
  | "exists";

export interface SchemeRule {
  /** Target applicant field path (e.g. 'loanPurpose', 'state', 'annualIncome', 'age', 'businessStage') */
  field: string;
  /** Comparison operator */
  operator: RuleOperator;
  /** Expected value, array of values, or [min, max] range */
  value: unknown;
  /** Whether this rule is a strict requirement (failure causes not_matching/insufficient_info) */
  isRequired?: boolean;
  /** Human-readable explanation of this rule */
  label: string;
  /** Category grouping for explainability */
  category?: "demographic" | "financial" | "enterprise" | "location" | "documentation";
}

export interface SchemeRuleGroup {
  combinator?: "AND" | "OR";
  rules: SchemeRule[];
}

export interface SchemeBenefit {
  type: "subsidy" | "credit_guarantee" | "interest_subvention" | "collateral_free_loan" | "composite_loan" | "skill_grant";
  summary: string;
  maxLoanAmount?: number;
  subsidyPercentage?: number;
  maxSubsidyAmount?: number;
  interestSubsidyPercentage?: number;
  collateralFreeLimit?: number;
  moratoriumMonths?: number;
}

export interface Scheme {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  detailedDescription: string;
  governmentLevel: GovernmentLevel;
  ministry?: string;
  state?: string;
  category: SchemeCategory;
  purposes: string[];
  beneficiaryTypes: string[];
  benefits: SchemeBenefit[];
  eligibilityRules: SchemeRuleGroup;
  requiredDocuments: string[];
  applicationUrl?: string;
  officialSourceUrl: string;
  sourceType: "official_gazette" | "ministry_portal" | "open_data" | "myScheme_reference";
  sourceName: string;
  version: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  lastVerifiedAt: string;
  active: boolean;
  priority: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Normalized Applicant Profile for scheme eligibility evaluation.
 * Minimizes required data and avoids collecting unnecessary sensitive PII.
 */
export interface NormalizedApplicantSchemeProfile {
  age?: number;
  state?: string;
  district?: string;
  residenceType?: "rural" | "urban" | "semi_urban";
  monthlyIncome?: number;
  annualIncome?: number;
  occupation?: string;
  employmentStatus?: "employed" | "self_employed" | "business_owner" | "unemployed" | "student" | "artisan";
  businessType?: "manufacturing" | "services" | "trading" | "agriculture" | "handicrafts";
  businessStage?: "new" | "existing" | "expansion";
  loanPurpose?: string;
  loanAmount?: number;
  loanType?: "secured" | "unsecured";
  collateralValue?: number | null;
  hasCollateral?: boolean;
  socialCategory?: "general" | "obc" | "sc" | "st" | "minority" | "women" | "differently_abled";
  gender?: "male" | "female" | "transgender" | "prefer_not_to_say";
  artisanStatus?: boolean;
  firstTimeEntrepreneur?: boolean;
  existingBusiness?: boolean;
  creditScore?: number;
  setuVerified?: boolean;
}

export type SchemeMatchStatus =
  | "likely_match"
  | "potential_match"
  | "insufficient_information"
  | "not_matching"
  | "expired"
  | "inactive";

export interface SchemeMatchResult {
  schemeId: string;
  schemeName: string;
  schemeSlug: string;
  governmentLevel: GovernmentLevel;
  ministry?: string;
  state?: string;
  category: SchemeCategory;
  matchStatus: SchemeMatchStatus;
  /** Match strength score from 0 to 100 (Relevance, NOT approval probability) */
  matchStrength: number;
  matchedCriteria: string[];
  unmetCriteria: string[];
  missingInformation: string[];
  reasons: string[];
  benefits: SchemeBenefit[];
  requiredDocuments: string[];
  officialSourceUrl: string;
  applicationUrl?: string;
  lastVerifiedAt: string;
  schemeVersion: string;
}

export interface SchemeMatchingResponse {
  applicantSummary: {
    state?: string;
    loanPurpose?: string;
    loanAmount?: number;
    annualIncome?: number;
  };
  totalSchemesEvaluated: number;
  matchCount: number;
  matches: SchemeMatchResult[];
  disclaimer: string;
  evaluatedAt: string;
}

export interface SchemeFilter {
  state?: string;
  category?: SchemeCategory;
  governmentLevel?: GovernmentLevel;
  purpose?: string;
  activeOnly?: boolean;
}
