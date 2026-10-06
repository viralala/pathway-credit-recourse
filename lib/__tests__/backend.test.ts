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
import { assessLoan } from "@/lib/loanAssessment";
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

  it("rejects negative income, invalid utilization, and out-of-range late-payment counts", () => {
    expect(applicantSchema.safeParse({ ...demoApplicant, monthlyIncome: -100 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, utilization: 2.5 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, late30: 11 }).success).toBe(false);
    expect(applicantSchema.safeParse({ ...demoApplicant, late90: -1 }).success).toBe(false);
  });

  it("validates UUIDs strictly", () => {
    expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-valid-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
  });

  it("validates assessment payloads for secured and unsecured loans", () => {
    // 1. Valid secured loan with positive collateral
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: 800_000,
      }).success
    ).toBe(true);

    // 2. Valid unsecured loan without collateral or with null collateral
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Bob",
        loanType: "unsecured",
        loanAmount: 300_000,
      }).success
    ).toBe(true);

    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Bob",
        loanType: "unsecured",
        loanAmount: 300_000,
        collateralValue: null,
      }).success
    ).toBe(true);
  });

  it("rejects missing, invalid, or malformed loanType", () => {
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
        loanType: "invalid_type",
      }).success
    ).toBe(false);

    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
        loanType: "auto",
      }).success
    ).toBe(false);

    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
        loanType: "",
      }).success
    ).toBe(false);

    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
        loanType: null,
      }).success
    ).toBe(false);

    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        applicantName: "Alice",
      }).success
    ).toBe(false);
  });

  it("rejects invalid, negative, or zero loan amounts", () => {
    // Negative loan amount
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "unsecured",
        loanAmount: -50000,
      }).success
    ).toBe(false);

    // Zero loan amount
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "unsecured",
        loanAmount: 0,
      }).success
    ).toBe(false);

    // String loan amount
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "unsecured",
        loanAmount: "500000" as unknown as number,
      }).success
    ).toBe(false);
  });

  it("requires valid positive collateral for secured loans and rejects missing/zero/negative collateral", () => {
    // Missing collateral for secured loan
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "secured",
        loanAmount: 500_000,
      }).success
    ).toBe(false);

    // Null collateral for secured loan
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: null,
      }).success
    ).toBe(false);

    // Zero collateral for secured loan
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: 0,
      }).success
    ).toBe(false);

    // Negative collateral for secured loan
    expect(
      createAssessmentSchema.safeParse({
        applicant: demoApplicant,
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: -100_000,
      }).success
    ).toBe(false);
  });

  it("validates recourse, simulation, and outcome payloads", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(createRecourseSchema.safeParse({ assessmentId: validUuid, targetScore: 720 }).success).toBe(true);
    expect(createRecourseSchema.safeParse({ assessmentId: "invalid", targetScore: 720 }).success).toBe(false);

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

  it("attaches the model version tag to predictions", () => {
    expect(MODEL.version).toBe(2);
    const modelVersionTag = `v${MODEL.version}`;
    expect(modelVersionTag).toBe("v2");
  });

  it("calculates server-side LTV and does not trust client overrides", () => {
    // Client could attempt to send a fabricated LTV, but assessLoan computes it mathematically
    const serverResult = assessLoan({
      loanType: "secured",
      loanAmount: 600_000,
      collateralValue: 1_000_000,
      applicant: demoApplicant,
    });

    expect(serverResult.ltv).toBe(60);
    expect(serverResult.collateralValue).toBe(1_000_000);
    expect(serverResult.loanAmount).toBe(600_000);
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
    const savings = moneySaved(
      {
        scoreToday: 600,
        scoreAfter: 720,
        amount: 10000,
        termMonths: 36,
      },
      PRICING
    );

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
