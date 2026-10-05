import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createRecourseSchema } from "@/lib/security/zod-schemas";
import { findRecourse } from "@/lib/recourse";
import { MODEL } from "@/lib/model";
import { ASSUMPTIONS } from "@/lib/config";
import type { Applicant } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to generate a recourse plan", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parseResult = createRecourseSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid recourse request parameters", 400, parseResult.error.flatten());
    }

    const { assessmentId, targetScore } = parseResult.data;

    // Load and verify ownership of the assessment
    const { data: assessment, error: fetchError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !assessment) {
      return apiError("NOT_FOUND", "Assessment not found or access denied", 404);
    }

    // Reconstruct applicant features
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

    // Calculate recourse plan using existing business logic
    const recourseResult = findRecourse(applicant, MODEL, ASSUMPTIONS, { targetScore });

    const status = recourseResult.status;
    const plan = status === "plan" ? recourseResult.plan : status === "infeasible" ? recourseResult.closest : null;

    const targetScoreValue = targetScore ?? MODEL.thresholdScore;
    const projectedScore = plan ? plan.scoreAfter : assessment.predicted_score;
    const actions = plan ? plan.actions : [];
    const estimatedMonths = plan ? plan.months : 0;
    const effortScore = plan ? plan.effort : 0;
    const flipsDecision = plan ? plan.flipsDecision : (status === "approved");
    const targetFeatures = plan ? plan.target : applicant;

    // Persist to recourse_plans
    const { data: savedPlan, error: saveError } = await supabase
      .from("recourse_plans")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        target_score: targetScoreValue,
        projected_score: projectedScore,
        status,
        actions,
        estimated_months: estimatedMonths,
        effort_score: effortScore,
        flips_decision: flipsDecision,
        target_features: targetFeatures,
      })
      .select()
      .single();

    if (saveError || !savedPlan) {
      return apiError("INTERNAL_ERROR", "Failed to save recourse plan", 500, saveError?.message);
    }

    return apiSuccess({
      recourse: recourseResult,
      plan: savedPlan,
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
