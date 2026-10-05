import type { Applicant } from "./types";

export interface Sample {
  id: "clear-rejection" | "borderline" | "approved";
  name: string;
  tagline: string;
  applicant: Applicant;
}

export const SAMPLES: Sample[] = [
  {
    id: "clear-rejection",
    name: "Asha",
    tagline: "Maxed-out cards and recent late payments",
    applicant: {
      age: 29,
      monthlyIncome: 56000,
      utilization: 0.97,
      debtRatio: 0.62,
      openCreditLines: 4,
      realEstateLoans: 0,
      late30: 2,
      late60: 1,
      late90: 0,
      dependents: 2,
    },
  },
  {
    id: "borderline",
    name: "Rohan",
    tagline: "Just under the line: high card balance",
    applicant: {
      age: 36,
      monthlyIncome: 92000,
      utilization: 0.55,
      debtRatio: 0.42,
      openCreditLines: 6,
      realEstateLoans: 0,
      late30: 0,
      late60: 0,
      late90: 0,
      dependents: 1,
    },
  },
  {
    id: "approved",
    name: "Meera",
    tagline: "Low utilization, clean history",
    applicant: {
      age: 46,
      monthlyIncome: 130000,
      utilization: 0.18,
      debtRatio: 0.28,
      openCreditLines: 9,
      realEstateLoans: 1,
      late30: 0,
      late60: 0,
      late90: 0,
      dependents: 2,
    },
  },
];

export const DEFAULT_SAMPLE = SAMPLES[1];

export function getSample(id: string | undefined | null): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
