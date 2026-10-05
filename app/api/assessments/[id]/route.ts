import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { uuidSchema } from "@/lib/security/zod-schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parseId = uuidSchema.safeParse(id);
    if (!parseId.success) {
      return apiError("VALIDATION_ERROR", "Invalid assessment ID format", 400);
    }

    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to view this assessment", 401);
    }

    const { data: assessment, error } = await supabase
      .from("assessments")
      .select(`
        *,
        recourse_plans (*),
        simulations (*),
        pricing_results (*),
        outcomes (*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !assessment) {
      return apiError("NOT_FOUND", "Assessment not found or access denied", 404);
    }

    return apiSuccess(assessment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parseId = uuidSchema.safeParse(id);
    if (!parseId.success) {
      return apiError("VALIDATION_ERROR", "Invalid assessment ID format", 400);
    }

    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to delete this assessment", 401);
    }

    const { error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return apiError("INTERNAL_ERROR", "Failed to delete assessment", 500, error.message);
    }

    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
