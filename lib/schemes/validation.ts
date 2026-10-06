import { z } from "zod";

export const ruleOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "in",
  "notIn",
  "contains",
  "boolean",
  "range",
  "exists",
]);

export const schemeRuleSchema = z.object({
  field: z.string().min(1),
  operator: ruleOperatorSchema,
  value: z.unknown(),
  isRequired: z.boolean().optional().default(true),
  label: z.string().min(1),
  category: z.enum(["demographic", "financial", "enterprise", "location", "documentation"]).optional(),
});

export const schemeRuleGroupSchema = z.object({
  combinator: z.enum(["AND", "OR"]).optional().default("AND"),
  rules: z.array(schemeRuleSchema),
});

export const schemeBenefitSchema = z.object({
  type: z.enum(["subsidy", "credit_guarantee", "interest_subvention", "collateral_free_loan", "composite_loan", "skill_grant"]),
  summary: z.string().min(1),
  maxLoanAmount: z.number().positive().optional(),
  subsidyPercentage: z.number().min(0).max(100).optional(),
  maxSubsidyAmount: z.number().positive().optional(),
  interestSubsidyPercentage: z.number().min(0).max(100).optional(),
  collateralFreeLimit: z.number().positive().optional(),
  moratoriumMonths: z.number().nonnegative().optional(),
});

export const schemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100),
  shortDescription: z.string().min(10),
  detailedDescription: z.string().min(20),
  governmentLevel: z.enum(["central", "state"]),
  ministry: z.string().optional(),
  state: z.string().optional(),
  category: z.enum([
    "business",
    "msme",
    "artisan",
    "agriculture",
    "education",
    "housing",
    "women_entrepreneur",
    "general",
  ]),
  purposes: z.array(z.string()).min(1),
  beneficiaryTypes: z.array(z.string()).min(1),
  benefits: z.array(schemeBenefitSchema).min(1),
  eligibilityRules: schemeRuleGroupSchema,
  requiredDocuments: z.array(z.string()).default([]),
  applicationUrl: z.string().url().optional(),
  officialSourceUrl: z.string().url(),
  sourceType: z.enum(["official_gazette", "ministry_portal", "open_data", "myScheme_reference"]),
  sourceName: z.string().min(2),
  version: z.string().min(1),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
  lastVerifiedAt: z.string(),
  active: z.boolean().default(true),
  priority: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Validation schema for applicant profiles submitted to the matching engine.
 */
export const applicantSchemeProfileSchema = z.object({
  age: z.number().int().min(16).max(120).optional(),
  state: z.string().min(2).max(100).optional(),
  district: z.string().max(100).optional(),
  residenceType: z.enum(["rural", "urban", "semi_urban"]).optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  annualIncome: z.number().nonnegative().optional(),
  occupation: z.string().max(100).optional(),
  employmentStatus: z.enum(["employed", "self_employed", "business_owner", "unemployed", "student", "artisan"]).optional(),
  businessType: z.enum(["manufacturing", "services", "trading", "agriculture", "handicrafts"]).optional(),
  businessStage: z.enum(["new", "existing", "expansion"]).optional(),
  loanPurpose: z.string().max(100).optional(),
  loanAmount: z.number().positive().max(1_000_000_000).optional(),
  loanType: z.enum(["secured", "unsecured"]).optional(),
  collateralValue: z.number().nonnegative().nullable().optional(),
  hasCollateral: z.boolean().optional(),
  socialCategory: z.enum(["general", "obc", "sc", "st", "minority", "women", "differently_abled"]).optional(),
  gender: z.enum(["male", "female", "transgender", "prefer_not_to_say"]).optional(),
  artisanStatus: z.boolean().optional(),
  firstTimeEntrepreneur: z.boolean().optional(),
  existingBusiness: z.boolean().optional(),
  creditScore: z.number().min(300).max(900).optional(),
  setuVerified: z.boolean().optional(),
  assessmentId: z.string().uuid().optional(),
});

export const matchRequestBodySchema = z.object({
  applicant: applicantSchemeProfileSchema,
  filters: z
    .object({
      state: z.string().optional(),
      category: z
        .enum(["business", "msme", "artisan", "agriculture", "education", "housing", "women_entrepreneur", "general"])
        .optional(),
      governmentLevel: z.enum(["central", "state"]).optional(),
      purpose: z.string().optional(),
    })
    .optional(),
  saveMatch: z.boolean().optional().default(false),
});
