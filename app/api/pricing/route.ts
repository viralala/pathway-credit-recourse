import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createPricingSchema } from "@/lib/security/zod-schemas";
import { moneySaved, PRICING } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to calculate pricing", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parseResult = createPricingSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid pricing request parameters", 400, parseResult.error.flatten());
    }

    const { assessmentId, loanAmount, termMonths } = parseResult.data;

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

    const scoreToday = Number(assessment.predicted_score);
    const latestPlan = assessment.recourse_plans?.[0];
    const scoreAfter = latestPlan ? Number(latestPlan.projected_score) : scoreToday;

    const amount = loanAmount ?? PRICING.defaultLoan.amount;
    const term = termMonths ?? PRICING.defaultLoan.termMonths;

    const savings = moneySaved({
      scoreToday,
      scoreAfter,
      amount,
      termMonths: term,
    }, PRICING);

    // Persist pricing result
    const { data: savedPricing, error: saveError } = await supabase
      .from("pricing_results")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        loan_amount: savings.amount,
        loan_term_months: savings.termMonths,
        current_apr: savings.todayApr,
        projected_apr: savings.planApr,
        current_emi: savings.todayEmi,
        projected_emi: savings.planEmi,
        current_interest: savings.todayInterest,
        projected_interest: savings.planInterest,
        estimated_savings: savings.saved,
      })
      .select()
      .single();

    if (saveError || !savedPricing) {
      return apiError("INTERNAL_ERROR", "Failed to save pricing results", 500, saveError?.message);
    }

    return apiSuccess({
      savings,
      pricing: savedPricing,
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
