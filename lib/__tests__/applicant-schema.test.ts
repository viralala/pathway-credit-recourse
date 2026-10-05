import { describe, expect, it } from "vitest";
import { applicantSchema } from "../security/zod-schemas";
import { validateApplicant, MIN_MONTHLY_INCOME } from "../security/validate";

const ok = { utilization: 0.2, late30: 0, late60: 0, late90: 0, monthlyIncome: 500_000, debtRatio: 0.3, openCreditLines: 8 };

describe("API applicant schema matches validateApplicant", () => {
  it("accepts a normal applicant", () => {
    expect(applicantSchema.safeParse(ok).success).toBe(true);
    expect(validateApplicant(ok).ok).toBe(true);
  });

  const bad: [string, Record<string, number>][] = [
    ["income 0 (the model's placeholder for missing)", { monthlyIncome: 0 }],
    ["income just below the minimum", { monthlyIncome: MIN_MONTHLY_INCOME - 1 }],
    ["NaN income", { monthlyIncome: NaN }],
    ["utilization 5000", { utilization: 5000 }],
    ["negative utilization", { utilization: -0.5 }],
    ["debt ratio 3000", { debtRatio: 3000 }],
    ["late count 98 (bureau special code)", { late30: 98 }],
    ["31 credit lines", { openCreditLines: 31 }],
    ["fractional late count", { late60: 1.5 }],
  ];
  it.each(bad)("rejects %s in both validators", (_n, patch) => {
    const a = { ...ok, ...patch };
    expect(applicantSchema.safeParse(a).success).toBe(false);
    expect(validateApplicant(a).ok).toBe(false);
  });
});
