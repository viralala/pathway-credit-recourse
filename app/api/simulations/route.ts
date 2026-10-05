import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createSimulationSchema } from "@/lib/security/zod-schemas";
import { simulate } from "@/lib/timeline";
import { simulateUncertainty } from "@/lib/montecarlo";
import { MODEL } from "@/lib/model";
import { ASSUMPTIONS, UNCERTAINTY } from "@/lib/config";
import type { Applicant } from "@/lib/types";
import type { RecoursePlan } from "@/lib/recourse";

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to run simulations", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parseResult = createSimulationSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid simulation request parameters", 400, parseResult.error.flatten());
    }

    const { assessmentId, runs } = parseResult.data;

    // Load and verify assessment ownership
    const { data: assessment, error: fetchError } = await supabase
      .from("assessments")
      .select(`
        *,
        recourse_plans (*)
      `)
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !assessment) {
      return apiError("NOT_FOUND", "Assessment not found or access denied", 404);
    }

    // Reconstruct applicant
    const applicant: Applicant = {
      monthlyIncome: Number(assessment.monthly_income),
      utilization: Number(assessment.utilization),
      debtRatio: Number(assessment.debt_ratio),
      age: Number(assessment.age),
      openCreditLines: Number(assessment.open_credit_lines),
      late30: Number(assessment.late_30),
      late60: Number(assessment.late_60),
      late90: Number(assessment.late_90),
      dependents: Number(assessment.dependents),
      realEstateLoans: Number(assessment.real_estate_loans),
    };

    // Get latest recourse plan if available
    const latestPlanRecord = assessment.recourse_plans?.[0];
    const targetFeatures = (latestPlanRecord?.target_features as unknown as Partial<Applicant>) || null;
    const plan: RecoursePlan | null = latestPlanRecord && latestPlanRecord.actions ? {
      utilizationTarget: targetFeatures?.utilization ?? applicant.utilization,
      debtPaymentCut: 0,
      incomeGrowth: 0,
      openLineChange: (targetFeatures?.openCreditLines ?? applicant.openCreditLines) - applicant.openCreditLines,
      waitMonths: latestPlanRecord.estimated_months ?? 0,
      target: (targetFeatures as Applicant) ?? applicant,
      actions: latestPlanRecord.actions as unknown as RecoursePlan["actions"],
      effort: Number(latestPlanRecord.effort_score),
      months: Number(latestPlanRecord.estimated_months),
      scoreBefore: Number(assessment.predicted_score),
      scoreAfter: Number(latestPlanRecord.projected_score),
      flipsDecision: Boolean(latestPlanRecord.flips_decision),
    } : null;

    // Run deterministic timeline and Monte Carlo uncertainty simulations
    const timeline = simulate(applicant, plan, MODEL, ASSUMPTIONS);
    const uncertainty = simulateUncertainty(applicant, plan, {
      model: MODEL,
      assumptions: ASSUMPTIONS,
      uncertainty: { ...UNCERTAINTY, runs: runs ?? UNCERTAINTY.runs },
    });

    // Persist simulation
    const { data: savedSim, error: saveError } = await supabase
      .from("simulations")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        likely_month: uncertainty.months.mid,
        best_month: uncertainty.months.low,
        worst_month: uncertainty.months.high,
        simulation_count: runs ?? UNCERTAINTY.runs,
        approval_within_horizon: uncertainty.approvalWithinHorizon,
        simulation_result: { timeline, uncertainty },
      })
      .select()
      .single();

    if (saveError || !savedSim) {
      return apiError("INTERNAL_ERROR", "Failed to save simulation", 500, saveError?.message);
    }

    return apiSuccess({
      timeline,
      uncertainty,
      simulation: savedSim,
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
