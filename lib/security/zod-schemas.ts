import { z } from "zod";

export const applicantSchema = z.object({
  monthlyIncome: z.number().min(0).max(100_000),
  utilization: z.number().min(0).max(1.5),
  debtRatio: z.number().min(0).max(3),
  age: z.number().int().min(18).max(100),
  openCreditLines: z.number().int().min(0).max(30),
  late30: z.number().int().min(0).max(10),
  late60: z.number().int().min(0).max(10),
  late90: z.number().int().min(0).max(10),
  dependents: z.number().int().min(0).max(10),
  realEstateLoans: z.number().int().min(0).max(10),
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
