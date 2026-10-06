import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { isSetuConfigured } from "@/lib/setu/config";
import { getSetuConsentStatus } from "@/lib/setu/consent";
import { safeLogSetuEvent } from "@/lib/setu/security";
import type { SetuConsentStatus } from "@/lib/setu/types";

export async function GET(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to check consent status", 401);
    }

    const { searchParams } = new URL(req.url);
    const consentId = searchParams.get("consentId")?.trim();

    if (!consentId) {
      return apiError("VALIDATION_ERROR", "Missing required query parameter 'consentId'", 400);
    }

    // Verify user authorization: consent must belong to this authenticated user
    const { data: consentRecord } = await supabase
      .from("aa_consents")
      .select("id, status, user_id, approved_at, expires_at")
      .eq("consent_id", consentId)
      .eq("user_id", user.id)
      .maybeSingle();

    let currentStatus: SetuConsentStatus = (consentRecord?.status as SetuConsentStatus) || "PENDING";
    let approvedAt = consentRecord?.approved_at || undefined;
    let expiresAt = consentRecord?.expires_at || undefined;

    if (isSetuConfigured()) {
      const statusRes = await getSetuConsentStatus(consentId);
      if (statusRes.success && statusRes.status) {
        currentStatus = statusRes.status as SetuConsentStatus;
        approvedAt = statusRes.approvedAt || (currentStatus === "ACTIVE" ? new Date().toISOString() : undefined);
        expiresAt = statusRes.expiresAt;
      }
    } else {
      // In sandbox development without live credentials, transition PENDING to ACTIVE
      if (currentStatus === "PENDING") {
        currentStatus = "ACTIVE";
        approvedAt = new Date().toISOString();
      }
    }

    // Update database record if status changed
    if (consentRecord && (consentRecord.status !== currentStatus || approvedAt)) {
      try {
        await supabase
          .from("aa_consents")
          .update({
            status: currentStatus,
            approved_at: approvedAt,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("consent_id", consentId)
          .eq("user_id", user.id);
      } catch {
        // Non-blocking update
      }
    }

    safeLogSetuEvent("Setu consent status check", {
      consentId,
      status: currentStatus,
    });

    return apiSuccess({
      consentId,
      status: currentStatus,
      approvedAt,
      expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error checking Setu consent status";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
