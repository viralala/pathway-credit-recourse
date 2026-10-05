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
      monthlyIncome: 56000,
      utilization: 0.97,
      debtRatio: 0.62,
      openCreditLines: 4,
      late30: 2,
      late60: 1,
      late90: 0,
    },
  },
  {
    id: "borderline",
    name: "Rohan",
    tagline: "Just under the line: high card balance",
    applicant: {
      monthlyIncome: 92000,
      utilization: 0.75,
      debtRatio: 0.42,
      openCreditLines: 6,
      late30: 1,
      late60: 0,
      late90: 0,
    },
  },
  {
    id: "approved",
    name: "Meera",
    tagline: "Low utilization, clean history",
    applicant: {
      monthlyIncome: 130000,
      utilization: 0.18,
      debtRatio: 0.28,
      openCreditLines: 9,
      late30: 0,
      late60: 0,
      late90: 0,
    },
  },
];

export const DEFAULT_SAMPLE = SAMPLES[1];

export function getSample(id: string | undefined | null): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
