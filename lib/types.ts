/**
 * What an applicant provides: the seven inputs the model reads. Age, dependents and
 * real-estate loans are not here because the model does not use them (see EXCLUDED_FEATURES
 * in ml/features.py).
 */
export type FeatureKey =
  | "utilization"
  | "late30"
  | "debtRatio"
  | "monthlyIncome"
  | "openCreditLines"
  | "late90"
  | "late60";

/** 0/1 flags the cleaning step works out from the inputs. Nobody types these in. */
export type DerivedFeatureKey = "lateSpecialCode" | "incomeMissing" | "incomePlaceholder";

/** The ten features the Logistic Regression is fitted on. */
export type ModelFeatureKey = FeatureKey | DerivedFeatureKey;

/**
 * One applicant, in the units of the Give Me Some Credit dataset.
 * `monthlyIncome: NaN` means the income was not provided; every other field must be a number.
 */
export type Applicant = Record<FeatureKey, number>;

/** An applicant after cleaning (lib/model.ts `clean`): the values the model is actually given. */
export type ModelInput = Record<ModelFeatureKey, number>;

export interface ModelFeature {
  key: ModelFeatureKey;
  label: string;
  source: string;
  clip: [number, number];
  log1p: boolean;
  mean: number;
  std: number;
  coef: number;
}

export interface CreditModel {
  version: number;
  trainedAt: string;
  dataSource: "kaggle" | "synthetic";
  target: string;
  intercept: number;
  threshold: number;
  thresholdScore: number;
  pointsToDoubleOdds: number;
  incomeImputation: number;
  features: ModelFeature[];
}

/** How an applicant input may be used in a plan. */
export type FeatureClass = "actionable" | "slow-moving";

/** Loan category: secured with collateral backing vs unsecured. */
export type LoanType = "secured" | "unsecured";

export interface LoanDetails {
  loanType: LoanType;
  loanAmount: number;
  collateralValue?: number | null;
}

/** Loan-specific contextual assessment produced separately from the credit-risk ML model. */
export interface LoanAssessment {
  loanType: LoanType;
  loanTypeLabel: string;
  loanAmount: number;
  collateralValue: number | null;
  ltv: number | null;
  foir: number;
  collateralBacking: boolean;
  riskContext: string;
  underwritingFocus: string;
  relevantFactors: string[];
  assessmentNotes: string[];
  warnings: string[];
  eligibilityContext: string;
  collateralConsideration: string;
  disclaimer: string;
}
