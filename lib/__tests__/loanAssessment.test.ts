import { describe, expect, it } from "vitest";
import { assessLoan } from "@/lib/loanAssessment";
import { assess, MODEL } from "@/lib/model";
import { moneySaved, PRICING } from "@/lib/pricing";
import { analyze } from "@/lib/analyze";
import { SAMPLES } from "@/lib/samples";
import type { Applicant, LoanType } from "@/lib/types";

const sampleApplicant: Applicant = SAMPLES[0].applicant;

describe("Loan Type Assessment Layer (Secured vs Unsecured)", () => {
  it("generates structured assessment for secured loans with collateral context", () => {
    const assessment = assess(sampleApplicant, MODEL);
    const loanAssessment = assessLoan({
      loanType: "secured",
      applicant: sampleApplicant,
      predictedScore: assessment.score,
      pd: assessment.pd,
      decision: assessment.approved ? "approved" : "declined",
    });

    expect(loanAssessment.loanType).toBe("secured");
    expect(loanAssessment.loanTypeLabel).toBe("Secured Loan");
    expect(loanAssessment.collateralBacking).toBe(true);
    expect(loanAssessment.riskContext).toContain("collateral");
    expect(loanAssessment.underwritingFocus).toContain("Collateral");
    expect(loanAssessment.relevantFactors.length).toBeGreaterThan(0);
    expect(loanAssessment.assessmentNotes.length).toBeGreaterThan(0);
    expect(loanAssessment.disclaimer).toContain("considered separately from the credit-risk model");
  });

  it("generates structured assessment for unsecured loans with cash-flow focus", () => {
    const assessment = assess(sampleApplicant, MODEL);
    const loanAssessment = assessLoan({
      loanType: "unsecured",
      applicant: sampleApplicant,
      predictedScore: assessment.score,
      pd: assessment.pd,
      decision: assessment.approved ? "approved" : "declined",
    });

    expect(loanAssessment.loanType).toBe("unsecured");
    expect(loanAssessment.loanTypeLabel).toBe("Unsecured Loan");
    expect(loanAssessment.collateralBacking).toBe(false);
    expect(loanAssessment.riskContext).toContain("Unsecured");
    expect(loanAssessment.underwritingFocus).toContain("Cash flow");
    expect(loanAssessment.relevantFactors.length).toBeGreaterThan(0);
    expect(loanAssessment.assessmentNotes.length).toBeGreaterThan(0);
    expect(loanAssessment.disclaimer).toContain("considered separately from the credit-risk model");
  });

  it("correctly calculates server-side LTV for secured loans (e.g. ₹5,00,000 / ₹8,00,000 = 62.5%)", () => {
    const loanAssessment = assessLoan({
      loanType: "secured",
      loanAmount: 500_000,
      collateralValue: 800_000,
      applicant: sampleApplicant,
    });

    expect(loanAssessment.loanAmount).toBe(500_000);
    expect(loanAssessment.collateralValue).toBe(800_000);
    expect(loanAssessment.ltv).toBe(62.5);
    expect(loanAssessment.collateralBacking).toBe(true);
  });

  it("strictly returns null collateralValue and null LTV for unsecured loans", () => {
    const loanAssessment = assessLoan({
      loanType: "unsecured",
      loanAmount: 750_000,
      collateralValue: 1_200_000, // Stale/inadvertent collateral passed in
      applicant: sampleApplicant,
    });

    expect(loanAssessment.loanAmount).toBe(750_000);
    expect(loanAssessment.collateralValue).toBeNull();
    expect(loanAssessment.ltv).toBeNull();
    expect(loanAssessment.collateralBacking).toBe(false);
  });

  it("evaluates FOIR and debt obligations context from applicant", () => {
    const applicantWithDebt: Applicant = {
      ...sampleApplicant,
      debtRatio: 0.45,
    };
    const loanAssessment = assessLoan({
      loanType: "unsecured",
      loanAmount: 300_000,
      applicant: applicantWithDebt,
    });

    expect(loanAssessment.foir).toBe(45);
    expect(loanAssessment.relevantFactors).toContain("FOIR / Debt Ratio: 45%");
  });

  it("CRITICAL INVARIANCE: ML model prediction is 100% identical for secured and unsecured loan types", () => {
    // Exact same financial applicant
    const applicant: Applicant = {
      monthlyIncome: 45000,
      utilization: 0.42,
      debtRatio: 0.38,
      openCreditLines: 6,
      late30: 1,
      late60: 0,
      late90: 0,
    };

    // 1. Evaluate ML model independently
    const baseModelResult = assess(applicant, MODEL);

    // 2. Evaluate analyze with loanType = "secured", loanAmount = 10,00,000, collateral = 15,00,000
    const analysisSecured = analyze(applicant, {
      loanType: "secured",
      loanAmount: 1_000_000,
      collateralValue: 1_500_000,
    });

    // 3. Evaluate analyze with loanType = "unsecured", loanAmount = 2,00,000
    const analysisUnsecured = analyze(applicant, {
      loanType: "unsecured",
      loanAmount: 200_000,
    });

    // Core ML Score & Probabilities MUST be strictly identical
    expect(analysisSecured.assessment.score).toBe(analysisUnsecured.assessment.score);
    expect(analysisSecured.assessment.score).toBe(baseModelResult.score);
    expect(analysisSecured.assessment.pd).toBe(analysisUnsecured.assessment.pd);
    expect(analysisSecured.assessment.pd).toBe(baseModelResult.pd);
    expect(analysisSecured.assessment.approved).toBe(analysisUnsecured.assessment.approved);
    expect(analysisSecured.assessment.approved).toBe(baseModelResult.approved);

    // Feature reason point values must be strictly identical
    expect(analysisSecured.assessment.reasons).toEqual(analysisUnsecured.assessment.reasons);
    expect(analysisSecured.assessment.reasons).toEqual(baseModelResult.reasons);

    // Threshold score must remain unchanged
    expect(analysisSecured.thresholdScore).toBe(analysisUnsecured.thresholdScore);
    expect(analysisSecured.thresholdScore).toBe(MODEL.thresholdScore);

    // Recourse plans must be identical
    expect(analysisSecured.recourse.status).toBe(analysisUnsecured.recourse.status);

    // Timeline must be identical
    expect(analysisSecured.timeline.approvalMonth).toBe(analysisUnsecured.timeline.approvalMonth);

    // Only the separate loanAssessment context differs
    expect(analysisSecured.loanType).toBe("secured");
    expect(analysisUnsecured.loanType).toBe("unsecured");
    expect(analysisSecured.loanAssessment.collateralBacking).toBe(true);
    expect(analysisUnsecured.loanAssessment.collateralBacking).toBe(false);
    expect(analysisSecured.loanAssessment.ltv).toBe(66.67);
    expect(analysisUnsecured.loanAssessment.ltv).toBeNull();
  });

  it("MODEL INTEGRITY: loanType, loanAmount, collateralValue, and LTV are NOT in the ML feature vector", () => {
    const modelFeatureKeys = MODEL.features.map((f) => f.key);

    // Explicit check that loan assessment fields are not model features
    expect(modelFeatureKeys).not.toContain("loanType");
    expect(modelFeatureKeys).not.toContain("loanAmount");
    expect(modelFeatureKeys).not.toContain("collateralValue");
    expect(modelFeatureKeys).not.toContain("ltv");
    expect(modelFeatureKeys.length).toBe(10);
  });

  it("verifies across all demo samples that ML model outputs never drift by loan type", () => {
    for (const sample of SAMPLES) {
      const secured = analyze(sample.applicant, {
        loanType: "secured",
        loanAmount: 600_000,
        collateralValue: 1_000_000,
      });
      const unsecured = analyze(sample.applicant, {
        loanType: "unsecured",
        loanAmount: 600_000,
      });

      expect(secured.assessment.score).toBeCloseTo(unsecured.assessment.score, 10);
      expect(secured.assessment.pd).toBeCloseTo(unsecured.assessment.pd, 10);
      expect(secured.assessment.approved).toBe(unsecured.assessment.approved);
      expect(secured.assessment.reasons.length).toBe(unsecured.assessment.reasons.length);
    }
  });

  it("preserves recourse, timeline, monte carlo, and pricing logic under both loan types", () => {
    for (const loanType of ["secured", "unsecured"] as LoanType[]) {
      const analysis = analyze(sampleApplicant, {
        loanType,
        loanAmount: 500_000,
        collateralValue: loanType === "secured" ? 800_000 : null,
      });

      // Recourse
      expect(analysis.recourse).toBeDefined();
      expect(["approved", "plan", "infeasible"]).toContain(analysis.recourse.status);

      // Timeline
      expect(analysis.timeline.points.length).toBeGreaterThan(0);

      // Monte Carlo
      expect(analysis.uncertainty.runs).toBeGreaterThan(0);
      expect(analysis.uncertainty.approvalWithinHorizon).toBeGreaterThanOrEqual(0);

      // Pricing calculation works alongside
      const savings = moneySaved(
        {
          scoreToday: analysis.assessment.score,
          scoreAfter: analysis.plan ? analysis.plan.scoreAfter : analysis.assessment.score,
          amount: 200000,
          termMonths: 36,
        },
        PRICING
      );
      expect(savings.todayApr).toBeGreaterThan(0);
      expect(savings.todayEmi).toBeGreaterThan(0);
    }
  });

  describe("Recent Hard Credit Inquiries Assessment Logic", () => {
    it("evaluates 0 inquiries as Low recent inquiry activity", () => {
      const loanAssessment = assessLoan({
        loanType: "unsecured",
        loanAmount: 200_000,
        recentHardInquiries: 0,
        applicant: sampleApplicant,
      });

      expect(loanAssessment.recentHardInquiries).toBe(0);
      expect(loanAssessment.inquiryActivity).toBeDefined();
      expect(loanAssessment.inquiryActivity?.count).toBe(0);
      expect(loanAssessment.inquiryActivity?.level).toBe("low");
      expect(loanAssessment.inquiryActivity?.label).toBe("Low recent inquiry activity");
      expect(loanAssessment.inquiryActivity?.explanation).toContain("No recent hard inquiries in the past 6 months");
      expect(loanAssessment.relevantFactors).toContain("Recent Hard Inquiries (6M): 0 (Low recent inquiry activity)");
    });

    it("evaluates 1 inquiry as Moderate recent inquiry activity", () => {
      const loanAssessment = assessLoan({
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: 800_000,
        recentHardInquiries: 1,
        applicant: sampleApplicant,
      });

      expect(loanAssessment.recentHardInquiries).toBe(1);
      expect(loanAssessment.inquiryActivity?.count).toBe(1);
      expect(loanAssessment.inquiryActivity?.level).toBe("moderate");
      expect(loanAssessment.inquiryActivity?.label).toBe("Moderate recent inquiry activity");
      expect(loanAssessment.inquiryActivity?.explanation).toContain("Recent inquiry activity is considered alongside the overall credit profile");
    });

    it("evaluates 2 inquiries as Moderate recent inquiry activity", () => {
      const loanAssessment = assessLoan({
        loanType: "unsecured",
        loanAmount: 300_000,
        recentHardInquiries: 2,
        applicant: sampleApplicant,
      });

      expect(loanAssessment.recentHardInquiries).toBe(2);
      expect(loanAssessment.inquiryActivity?.count).toBe(2);
      expect(loanAssessment.inquiryActivity?.level).toBe("moderate");
      expect(loanAssessment.inquiryActivity?.label).toBe("Moderate recent inquiry activity");
      expect(loanAssessment.inquiryActivity?.explanation).toContain("does not independently determine approval");
    });

    it("evaluates 3+ inquiries as Higher recent inquiry activity", () => {
      for (const count of [3, 4, 5, 8, 12]) {
        const loanAssessment = assessLoan({
          loanType: "unsecured",
          loanAmount: 400_000,
          recentHardInquiries: count,
          applicant: sampleApplicant,
        });

        expect(loanAssessment.recentHardInquiries).toBe(count);
        expect(loanAssessment.inquiryActivity?.count).toBe(count);
        expect(loanAssessment.inquiryActivity?.level).toBe("high");
        expect(loanAssessment.inquiryActivity?.label).toBe("Higher recent inquiry activity");
        expect(loanAssessment.inquiryActivity?.explanation).toContain("Higher recent inquiry activity may indicate multiple recent credit applications");
        expect(loanAssessment.inquiryActivity?.explanation).not.toContain("rejection");
        expect(loanAssessment.inquiryActivity?.explanation).not.toContain("guaranteed");
      }
    });

    it("handles default inquiry count of 0 when omitted", () => {
      const loanAssessment = assessLoan({
        loanType: "unsecured",
        loanAmount: 500_000,
        applicant: sampleApplicant,
      });

      expect(loanAssessment.recentHardInquiries).toBe(0);
      expect(loanAssessment.inquiryActivity?.level).toBe("low");
    });

    it("CRITICAL ML INVARIANT TEST: Applicant A (inquiries = 0) and Applicant B (inquiries = 5) have 100% identical ML predictions", () => {
      const baseApplicant: Applicant = {
        monthlyIncome: 65000,
        utilization: 0.35,
        debtRatio: 0.28,
        openCreditLines: 8,
        late30: 0,
        late60: 0,
        late90: 0,
      };

      // Applicant A with 0 inquiries
      const analysisA = analyze(baseApplicant, {
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: 800_000,
        recentHardInquiries: 0,
      });

      // Applicant B with 5 inquiries
      const analysisB = analyze(baseApplicant, {
        loanType: "secured",
        loanAmount: 500_000,
        collateralValue: 800_000,
        recentHardInquiries: 5,
      });

      // Raw ML model inference
      const rawML = assess(baseApplicant, MODEL);

      // Score, PD, Decision, Reasons must be EXACTLY identical
      expect(analysisA.assessment.score).toBe(analysisB.assessment.score);
      expect(analysisA.assessment.score).toBe(rawML.score);
      expect(analysisA.assessment.pd).toBe(analysisB.assessment.pd);
      expect(analysisA.assessment.pd).toBe(rawML.pd);
      expect(analysisA.assessment.approved).toBe(analysisB.assessment.approved);
      expect(analysisA.assessment.approved).toBe(rawML.approved);
      expect(analysisA.assessment.reasons).toEqual(analysisB.assessment.reasons);
      expect(analysisA.assessment.reasons).toEqual(rawML.reasons);

      // Recourse and timeline must remain invariant
      expect(analysisA.recourse.status).toBe(analysisB.recourse.status);
      expect(analysisA.timeline.approvalMonth).toBe(analysisB.timeline.approvalMonth);

      // Only the contextual inquiry activity differs
      expect(analysisA.loanAssessment.recentHardInquiries).toBe(0);
      expect(analysisA.loanAssessment.inquiryActivity?.level).toBe("low");
      expect(analysisB.loanAssessment.recentHardInquiries).toBe(5);
      expect(analysisB.loanAssessment.inquiryActivity?.level).toBe("high");
    });

    it("MODEL INTEGRITY: recentHardInquiries is NOT in the ML feature vector", () => {
      const featureKeys = MODEL.features.map((f) => f.key);
      expect(featureKeys).not.toContain("recentHardInquiries");
      expect(featureKeys).not.toContain("recent_hard_inquiries");
      expect(featureKeys).not.toContain("inquiries");
      expect(featureKeys.length).toBe(10);
    });
  });
});
