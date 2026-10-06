import type { Applicant, LoanType } from "@/lib/types";
import type { NormalizedApplicantSchemeProfile } from "./types";

/**
 * Normalizes disparate application inputs into a standardized applicant scheme profile.
 *
 * DATA PRIVACY & MINIMIZATION:
 * - Collects only fields necessary for eligibility rule evaluation.
 * - Never infers or invents sensitive attributes (e.g. caste, gender) without explicit user declaration.
 */
export function normalizeApplicantForSchemes(params: {
  applicant?: Partial<Applicant>;
  loanType?: LoanType;
  loanAmount?: number;
  collateralValue?: number | null;
  state?: string;
  district?: string;
  age?: number;
  residenceType?: "rural" | "urban" | "semi_urban";
  loanPurpose?: string;
  businessStage?: "new" | "existing" | "expansion";
  businessType?: "manufacturing" | "services" | "trading" | "agriculture" | "handicrafts";
  employmentStatus?: "employed" | "self_employed" | "business_owner" | "unemployed" | "student" | "artisan";
  socialCategory?: "general" | "obc" | "sc" | "st" | "minority" | "women" | "differently_abled";
  gender?: "male" | "female" | "transgender" | "prefer_not_to_say";
  artisanStatus?: boolean;
  firstTimeEntrepreneur?: boolean;
  existingBusiness?: boolean;
  creditScore?: number;
  setuVerified?: boolean;
}): NormalizedApplicantSchemeProfile {
  const monthlyIncome =
    typeof params.applicant?.monthlyIncome === "number" && Number.isFinite(params.applicant.monthlyIncome)
      ? params.applicant.monthlyIncome
      : undefined;

  const annualIncome = monthlyIncome !== undefined ? monthlyIncome * 12 : undefined;

  const loanAmount =
    typeof params.loanAmount === "number" && Number.isFinite(params.loanAmount) && params.loanAmount > 0
      ? params.loanAmount
      : 500_000;

  const loanType = params.loanType || "unsecured";
  const hasCollateral =
    loanType === "secured" ||
    (typeof params.collateralValue === "number" && Number.isFinite(params.collateralValue) && params.collateralValue > 0);

  return {
    age: typeof params.age === "number" && Number.isFinite(params.age) ? params.age : 28, // Sensible default if not provided
    state: params.state?.trim() || undefined,
    district: params.district?.trim() || undefined,
    residenceType: params.residenceType || undefined,
    monthlyIncome,
    annualIncome,
    employmentStatus: params.employmentStatus || undefined,
    businessType: params.businessType || undefined,
    businessStage: params.businessStage || undefined,
    loanPurpose: (params.loanPurpose || "business").toLowerCase(),
    loanAmount,
    loanType,
    collateralValue: params.collateralValue,
    hasCollateral,
    socialCategory: params.socialCategory || undefined,
    gender: params.gender || undefined,
    artisanStatus: params.artisanStatus ?? false,
    firstTimeEntrepreneur: params.firstTimeEntrepreneur ?? undefined,
    existingBusiness: params.existingBusiness ?? undefined,
    creditScore: params.creditScore,
    setuVerified: params.setuVerified ?? false,
  };
}
