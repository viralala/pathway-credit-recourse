import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";

export async function DELETE() {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to delete your data", 401);
    }

    // Deleting profile cascades to assessments, recourse_plans, simulations, pricing_results, outcomes
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      return apiError("INTERNAL_ERROR", "Failed to delete user profile and records", 500, profileError.message);
    }

    // Sign out session
    await supabase.auth.signOut();

    return apiSuccess({
      deleted: true,
      userId: user.id,
      message: "All user records and associated data have been permanently deleted.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
