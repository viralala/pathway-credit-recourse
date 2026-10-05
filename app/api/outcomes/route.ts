import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createOutcomeSchema } from "@/lib/security/zod-schemas";

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to submit an outcome", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parseResult = createOutcomeSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid outcome request parameters", 400, parseResult.error.flatten());
    }

    const { assessmentId, actualOutcome, actualScore, notes } = parseResult.data;

    // Verify assessment ownership
    const { data: assessment, error: fetchError } = await supabase
      .from("assessments")
      .select("id")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !assessment) {
      return apiError("NOT_FOUND", "Assessment not found or access denied", 404);
    }

    // Security requirement: verified must ALWAYS be false when submitted by user
    const { data: savedOutcome, error: saveError } = await supabase
      .from("outcomes")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        actual_outcome: actualOutcome,
        actual_score: actualScore ?? null,
        notes: notes ?? null,
        verified: false, // User cannot arbitrarily verify outcomes
      })
      .select()
      .single();

    if (saveError || !savedOutcome) {
      return apiError("INTERNAL_ERROR", "Failed to record outcome", 500, saveError?.message);
    }

    return apiSuccess(savedOutcome, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}

export async function GET() {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to view outcomes", 401);
    }

    const { data: outcomes, error } = await supabase
      .from("outcomes")
      .select(`
        *,
        assessments (predicted_score, decision, model_version, created_at)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("INTERNAL_ERROR", "Failed to load outcomes", 500, error.message);
    }

    return apiSuccess(outcomes || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
