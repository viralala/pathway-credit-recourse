import { apiError, apiSuccess } from "@/lib/security/api-response";
import { safeLogSetuEvent, verifySetuWebhook } from "@/lib/setu/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload in webhook", 400);
    }

    const verification = verifySetuWebhook(req.headers, rawBody);
    if (!verification.valid || !verification.payload) {
      return apiError("VALIDATION_ERROR", verification.error || "Webhook verification failed", 400);
    }

    const payload = verification.payload;
    const consentId = payload.consentId;
    const incomingStatus = payload.status;

    safeLogSetuEvent("Setu webhook notification received", {
      type: payload.type,
      consentId,
      status: incomingStatus,
    });

    if (consentId && incomingStatus) {
      try {
        const adminSupabase = createAdminClient();
        const validStatus = incomingStatus.toUpperCase() as "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED" | "FAILED";
        await adminSupabase
          .from("aa_consents")
          .update({
            status: validStatus,
            approved_at: validStatus === "ACTIVE" ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("consent_id", consentId);
      } catch {
        // Idempotent and non-blocking if admin client is not initialized in dev
      }
    }

    return apiSuccess({
      received: true,
      type: payload.type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error processing Setu webhook";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
