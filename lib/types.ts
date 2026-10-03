export type FeatureKey =
  | "utilization"
  | "age"
  | "late30"
  | "debtRatio"
  | "monthlyIncome"
  | "openCreditLines"
  | "late90"
  | "realEstateLoans"
  | "late60"
  | "dependents";

/** One applicant, in the units of the Give Me Some Credit dataset. */
export type Applicant = Record<FeatureKey, number>;

export interface ModelFeature {
  key: FeatureKey;
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

/** How a feature may be used in a plan. */
export type FeatureClass = "immutable" | "actionable" | "slow-moving";
