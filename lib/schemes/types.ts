/**
 * Government scheme matching: the domain model.
 *
 * The engine answers one question: "are there government-supported schemes whose PUBLISHED
 * eligibility criteria appear relevant to this person?" It never says anyone will be approved.
 * A scheme is a row in `public.government_schemes`; nothing about any scheme is written in code.
 *
 * Kept apart from the credit model on purpose: nothing here reads a Pathway score, a probability
 * of default or an approve/decline decision (see lib/schemes/normalizer.ts).
 */

// ---------------------------------------------------------------------------------------------
// The applicant, in the shape rules are written against
// ---------------------------------------------------------------------------------------------

export type Gender = "female" | "male" | "other";
export type SocialCategory = "general" | "obc" | "sc" | "st" | "minority";
export type AreaType = "rural" | "urban";
export type BusinessStage = "new" | "existing";
export type Sector = "manufacturing" | "services" | "trading" | "agri_allied";
export type EnterpriseForm = "individual" | "proprietorship" | "partnership" | "company" | "shg" | "cooperative" | "trust";

/**
 * Everything a published eligibility rule may refer to. Every field is optional: a value that is
 * absent (undefined) means "we do not know", which is never treated as "no".
 */
export interface ApplicantSchemeProfile {
  /** Completed years. */
  age?: number;
  gender?: Gender;
  socialCategory?: SocialCategory;
  areaType?: AreaType;
  /** A unit that does not exist yet ("new") or one already running ("existing"). */
  businessStage?: BusinessStage;
  sector?: Sector;
  enterpriseForm?: EnterpriseForm;
  /** Highest school class passed, 0 to 12; 15 for a graduate or above. */
  educationClass?: number;
  /** Loan the person is looking for, in rupees. */
  loanAmount?: number;
  /** Total cost of the project or unit, in rupees. */
  projectCost?: number;
  /** Yearly income in rupees. */
  annualIncome?: number;
  /** Works with hands and tools in a traditional family trade. */
  isTraditionalArtisan?: boolean;
  /** Already took a government subsidy for a unit under another scheme. */
  hasAvailedGovtSubsidy?: boolean;
  /** Took a loan under a similar government credit scheme in the last five years. */
  hasSimilarSchemeLoan?: boolean;
  /** The person, or a family member, is in government service. */
  isGovernmentEmployee?: boolean;
  /** In default to any bank or financial institution. */
  hasLoanDefault?: boolean;
}

export type ProfileFieldKey = keyof ApplicantSchemeProfile;
export type ProfileFieldType = "number" | "boolean" | "enum";

export interface ProfileFieldSpec {
  type: ProfileFieldType;
  /** Allowed values of an enum field. */
  values?: readonly string[];
  /** Inclusive bounds of a number field. */
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------------------------
// Eligibility rules, as stored in government_schemes.eligibility_rules (JSONB)
// ---------------------------------------------------------------------------------------------

export type RuleOperator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "between"
  | "is_true"
  | "is_false";

export type RuleValue = string | number | string[] | number[] | [number, number];

/** One published criterion: a single comparison of one profile field. */
export interface Criterion {
  type: "criterion";
  /** Unique inside the scheme, e.g. "age-min". */
  id: string;
  field: ProfileFieldKey;
  op: RuleOperator;
  /** Absent for is_true / is_false; [min, max] (inclusive) for between; a list for in / not_in. */
  value?: RuleValue;
  /** The criterion in plain words, as the official source states it. Shown to the person. */
  label: string;
  /** Where in the official source this comes from (a clause, section or page). */
  sourceRef?: string;
}

export type EligibilityRule =
  | Criterion
  | { type: "all"; rules: EligibilityRule[] }
  | { type: "any"; rules: EligibilityRule[] }
  | { type: "not"; rule: EligibilityRule };

export interface EligibilityRules {
  /** Format of this document, so the rule language can change without breaking old rows. */
  schemaVersion: 1;
  /** Must hold for the scheme to appear relevant. */
  required: EligibilityRule;
  /** Published priorities (not conditions). They only move a scheme up or down the list. */
  preferred?: Criterion[];
}

// ---------------------------------------------------------------------------------------------
// A scheme
// ---------------------------------------------------------------------------------------------

export type SchemeType = "loan" | "credit_guarantee" | "credit_linked_subsidy" | "composite";
export type SchemeStatus = "draft" | "active" | "retired";
/** "verified": a person read the official source on `lastVerifiedAt` and the row matches it. */
export type VerificationStatus = "verified" | "unverified";

export interface SchemeSource {
  title: string;
  /** https only. */
  url: string;
}

export interface Scheme {
  id: string;
  /** Stable across versions, e.g. "pmegp". */
  slug: string;
  /** 1, 2, 3 … A change to the rules is a new row with the next version, never an edit. */
  version: number;
  isCurrent: boolean;
  status: SchemeStatus;
  name: string;
  shortName: string;
  schemeType: SchemeType;
  summary: string;
  benefits: string[];
  implementingAgency: string;
  ministry: string | null;
  /** Rupees; null when the scheme publishes no bound. */
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  eligibility: EligibilityRules;
  howToApply: string | null;
  /** Where to apply (official portal), if different from `officialUrl`. */
  applicationUrl: string | null;
  officialUrl: string;
  sources: SchemeSource[];
  /** YYYY-MM-DD: the day the row was last checked against the official source. */
  lastVerifiedAt: string;
  verificationStatus: VerificationStatus;
  /** YYYY-MM-DD, or null. */
  effectiveFrom: string | null;
}

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

/** Three-valued on purpose: "unknown" (we were not told) is never folded into "fail". */
export type Outcome = "pass" | "fail" | "unknown";

export interface CriterionResult {
  id: string;
  field: ProfileFieldKey;
  label: string;
  sourceRef?: string;
  importance: "required" | "preferred";
  outcome: Outcome;
  /** What the person told us, or undefined when they did not. */
  actual?: string | number | boolean;
}

export interface SchemeEvaluation {
  /** Outcome of the whole `required` rule. */
  outcome: Outcome;
  /** Every criterion in the scheme, in the order the rules list them: required first, then preferred. */
  criteria: CriterionResult[];
  /**
   * Fields that, if filled in, could still change `outcome`. Empty unless `outcome` is "unknown".
   * A field inside an `any` branch is not listed once another branch has already passed.
   */
  missingFields: ProfileFieldKey[];
}

/**
 * - appears_relevant: every required criterion is confirmed by what the person told us.
 * - needs_more_information: nothing rules the scheme out, but some required criteria are unknown.
 * - not_matched: at least one required criterion is not met by what the person told us.
 * None of these is a decision, an approval or a probability.
 */
export type MatchStatus = "appears_relevant" | "needs_more_information" | "not_matched";

export interface RelevanceFactor {
  key: "required" | "preferred" | "amount";
  /** Points this factor contributed and the most it could have. */
  points: number;
  max: number;
}

export interface Relevance {
  /** 0 to 100: how much of the published criteria is confirmed. NOT a chance of approval. */
  score: number;
  factors: RelevanceFactor[];
}

export interface SchemeMatch {
  scheme: Scheme;
  status: MatchStatus;
  relevance: Relevance;
  evaluation: SchemeEvaluation;
}

// ---------------------------------------------------------------------------------------------
// API contract
// ---------------------------------------------------------------------------------------------

/** POST /api/schemes/match request body. Every part is optional. */
export interface MatchRequest {
  /** What the person typed into the scheme form. */
  profile?: ApplicantSchemeProfile;
  /** From the applicant form. Only the income is read; credit behaviour is not. */
  applicant?: { monthlyIncome?: number };
  /** From the goal planner. */
  goal?: { amount?: number };
  /** Signed-in people only: keep this result in their match history. Ignored when signed out. */
  save?: boolean;
}

/** `data` of a successful POST /api/schemes/match (wrapped by apiSuccess). */
export interface MatchResponse {
  /** Ranked: appears_relevant, then needs_more_information, then not_matched. */
  matches: SchemeMatch[];
  /** The profile the rules were evaluated against, after normalizing. */
  profile: ApplicantSchemeProfile;
  /** Fields worth asking for next, most useful first (across all schemes). */
  missingFields: ProfileFieldKey[];
  /** ISO timestamp. */
  evaluatedAt: string;
  /** True when the result was written to the person's match history. */
  saved: boolean;
}

/** `data` of a successful GET /api/schemes. */
export interface SchemeListResponse {
  schemes: Scheme[];
}
