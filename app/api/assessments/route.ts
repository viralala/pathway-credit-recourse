import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createAssessmentSchema } from "@/lib/security/zod-schemas";
import { assess, MODEL } from "@/lib/model";
import type { Applicant } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to create and persist an assessment", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parseResult = createAssessmentSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid assessment input parameters", 400, parseResult.error.flatten());
    }

    const { applicant, applicantName } = parseResult.data;

    // Server-side calculation using existing TypeScript ML inference
    const result = assess(applicant as Applicant, MODEL);
    const decision = result.approved ? "approved" : "declined";
    const modelVersion = `v${MODEL.version}`;

    // Defensively ensure user profile exists in public.profiles to satisfy foreign key
    const userMeta = user.user_metadata || {};
    const fullName = userMeta.full_name || userMeta.name || user.email?.split("@")[0] || applicantName || "Applicant";
    const avatarUrl = userMeta.avatar_url || userMeta.picture || null;

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    // Persist to Supabase
    const { data: savedAssessment, error: dbError } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        monthly_income: applicant.monthlyIncome,
        utilization: applicant.utilization,
        debt_ratio: applicant.debtRatio,
        age: applicant.age,
        open_credit_lines: applicant.openCreditLines,
        late_30: applicant.late30,
        late_60: applicant.late60,
        late_90: applicant.late90,
        dependents: applicant.dependents,
        real_estate_loans: applicant.realEstateLoans,
        applicant_name: applicantName || "Applicant",
        predicted_score: result.score,
        pd: result.pd,
        decision,
        reasons: result.reasons,
        model_version: modelVersion,
      })
      .select()
      .single();

    if (dbError || !savedAssessment) {
      return apiError("INTERNAL_ERROR", dbError?.message || "Failed to save assessment to database", 500, dbError);
    }

    return apiSuccess({
      assessment: savedAssessment,
      score: result.score,
      decision,
      pd: result.pd,
      reasons: result.reasons,
      modelVersion,
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}

export async function GET() {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to view assessments", 401);
    }

    // Query user's assessments (enforced both in query and by RLS)
    const { data: assessments, error } = await supabase
      .from("assessments")
      .select(`
        *,
        recourse_plans (*),
        simulations (*),
        pricing_results (*),
        outcomes (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("INTERNAL_ERROR", "Failed to load assessments", 500, error.message);
    }

    return apiSuccess(assessments || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
