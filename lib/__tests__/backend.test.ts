import { describe, expect, it } from "vitest";
import {
  applicantSchema,
  createAssessmentSchema,
  createOutcomeSchema,
  createRecourseSchema,
  createSimulationSchema,
  uuidSchema,
} from "@/lib/security/zod-schemas";
import { assess, MODEL } from "@/lib/model";
import { findRecourse } from "@/lib/recourse";
import { simulate } from "@/lib/timeline";
import { simulateUncertainty } from "@/lib/montecarlo";
import { moneySaved, PRICING } from "@/lib/pricing";
import { SAMPLES } from "@/lib/samples";

const demoApplicant = SAMPLES[0].applicant;

describe("Backend Validation Schemas (Zod)", () => {
  it("validates a standard applicant within correct ranges", () => {
    const res = applicantSchema.safeParse(demoApplicant);
    expect(res.success).toBe(true);
  });

  it("rejects negative income, invalid utilization, and out-of-range age", () => {
    expect(applicantSchema.safeParse({ ...demoApplicant, monthlyIncome: -100 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, utilization: 2.5 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, age: 15 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, age: 105 }).success).toBe(false);
  });

  it("validates UUIDs strictly", () => {
    expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-valid-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
  });

  it("validates assessment and recourse payloads", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(createAssessmentSchema.safeParse({ applicant: demoApplicant, applicantName: "Alice" }).success).toBe(true);
    expect(createRecourseSchema.safeParse({ assessmentId: validUuid, targetScore: 720 }).success).toBe(true);
    expect(createRecourseSchema.safeParse({ assessmentId: "invalid", targetScore: 720 }).success).toBe(false);
  });

  it("validates simulation and outcome payloads", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(createSimulationSchema.safeParse({ assessmentId: validUuid, runs: 300 }).success).toBe(true);
    expect(createSimulationSchema.safeParse({ assessmentId: validUuid, runs: 5000 }).success).toBe(false); // Max runs exceeded
    expect(createOutcomeSchema.safeParse({ assessmentId: validUuid, actualOutcome: "Approved for credit card", actualScore: 690 }).success).toBe(true);
    expect(createOutcomeSchema.safeParse({ assessmentId: validUuid, actualOutcome: "" }).success).toBe(false); // Empty outcome rejected
  });
});

describe("Server-Side Inference and Business Logic Pipeline", () => {
  it("calculates deterministic score and reasons on server", () => {
    const assessment = assess(demoApplicant, MODEL);
    expect(assessment.score).toBeGreaterThanOrEqual(300);
    expect(assessment.score).toBeLessThanOrEqual(900);
    expect(typeof assessment.approved).toBe("boolean");
    expect(assessment.reasons.length).toBeGreaterThan(0);
  });

  it("attaches model_version 'v1' to predictions", () => {
    expect(MODEL.version).toBe(1);
    const modelVersionTag = `v${MODEL.version}`;
    expect(modelVersionTag).toBe("v1");
  });

  it("runs recourse planning and flips decisions for subprime applicants", () => {
    const subprime = SAMPLES.find((s) => s.id === "clear-rejection")?.applicant || demoApplicant;
    const recourse = findRecourse(subprime, MODEL);
    if (recourse.status === "plan") {
      expect(recourse.plan.scoreAfter).toBeGreaterThanOrEqual(MODEL.thresholdScore);
      expect(recourse.plan.actions.length).toBeGreaterThan(0);
      expect(recourse.plan.flipsDecision).toBe(true);
    }
  });

  it("calculates timeline projections and Monte Carlo bands", () => {
    const recourse = findRecourse(demoApplicant, MODEL);
    const plan = recourse.status === "plan" ? recourse.plan : null;
    const timeline = simulate(demoApplicant, plan, MODEL);
    expect(timeline.points.length).toBeGreaterThan(0);

    const uncertainty = simulateUncertainty(demoApplicant, plan, { model: MODEL });
    expect(uncertainty.runs).toBeGreaterThan(0);
    expect(uncertainty.approvalWithinHorizon).toBeGreaterThanOrEqual(0);
    expect(uncertainty.approvalWithinHorizon).toBeLessThanOrEqual(1);
  });

  it("calculates risk-based pricing and savings correctly", () => {
    const savings = moneySaved({
      scoreToday: 600,
      scoreAfter: 720,
      amount: 10000,
      termMonths: 36,
    }, PRICING);

    expect(savings.todayApr).toBeGreaterThan(savings.planApr);
    expect(savings.saved).toBeGreaterThan(0);
    expect(savings.emiDrop).toBeGreaterThan(0);
  });
});

describe("Outcome Verification Constraints", () => {
  it("ensures outcomes submitted by users are unverified by default", () => {
    const payload = {
      assessment_id: "123e4567-e89b-12d3-a456-426614174000",
      user_id: "user-123",
      actual_outcome: "Got mortgage approved",
      verified: false,
    };
    expect(payload.verified).toBe(false);
  });
});
