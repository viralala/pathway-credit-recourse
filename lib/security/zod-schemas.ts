import { z } from "zod";

export const applicantSchema = z
  .object({
    monthlyIncome: z.union([z.number().min(0).max(2_000_000), z.nan()]).default(45000),
    utilization: z.number().min(0).max(1.5),
    debtRatio: z.number().min(0).max(3),
    openCreditLines: z.number().int().min(0).max(30),
    late30: z.number().int().min(0).max(10),
    late60: z.number().int().min(0).max(10),
    late90: z.number().int().min(0).max(10),
  })
  .passthrough();

export const loanTypeSchema = z.enum(["secured", "unsecured"]);

export const createAssessmentSchema = z
  .object({
    applicant: applicantSchema,
    applicantName: z.string().max(100).optional(),
    loanType: loanTypeSchema,
    loanAmount: z.number().positive().max(100_000_000).default(500_000),
    collateralValue: z.number().positive().max(500_000_000).nullable().optional(),
    recentHardInquiries: z.number().int().min(0).max(50).default(0),
  })
  .passthrough()
  .refine(
    (data) => {
      if (data.loanType === "secured") {
        return (
          typeof data.collateralValue === "number" &&
          Number.isFinite(data.collateralValue) &&
          data.collateralValue > 0
        );
      }
      return true;
    },
    {
      message: "Collateral value is required and must be greater than 0 for secured loans",
      path: ["collateralValue"],
    }
  );

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
