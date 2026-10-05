import { z } from "zod";

import { APPLICANT_LIMITS as L } from "@/lib/security/validate";

/** Same limits as validateApplicant (lib/security/validate.ts): one source, so the API and the form cannot drift apart. */
export const applicantSchema = z.object({
  monthlyIncome: z.number().finite().min(L.monthlyIncome.min).max(L.monthlyIncome.max),
  utilization: z.number().finite().min(L.utilization.min).max(L.utilization.max),
  debtRatio: z.number().finite().min(L.debtRatio.min).max(L.debtRatio.max),
  openCreditLines: z.number().int().min(L.openCreditLines.min).max(L.openCreditLines.max),
  late30: z.number().int().min(L.late30.min).max(L.late30.max),
  late60: z.number().int().min(L.late60.min).max(L.late60.max),
  late90: z.number().int().min(L.late90.min).max(L.late90.max),
});

export const createAssessmentSchema = z.object({
  applicant: applicantSchema,
  applicantName: z.string().max(40).optional(),
});

export const createRecourseSchema = z.object({
  assessmentId: z.string().uuid(),
  targetScore: z.number().min(300).max(900).optional(),
});

export const createSimulationSchema = z.object({
  assessmentId: z.string().uuid(),
  runs: z.number().int().min(10).max(2000).optional().default(500),
});

export const createPricingSchema = z.object({
  assessmentId: z.string().uuid(),
  loanAmount: z.number().min(100).max(500_000).optional(),
  termMonths: z.number().int().min(6).max(120).optional(),
});

export const createOutcomeSchema = z.object({
  assessmentId: z.string().uuid(),
  actualOutcome: z.string().min(1).max(200),
  actualScore: z.number().min(300).max(900).optional(),
  notes: z.string().max(1000).optional(),
});

export const uuidSchema = z.string().uuid();
