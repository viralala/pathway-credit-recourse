import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { clientKey } from "@/lib/security/rateLimit";
import { isSetuConfigured } from "@/lib/setu/config";
import { createSetuConsent } from "@/lib/setu/consent";
import { safeLogSetuEvent, setuApiRateLimiter } from "@/lib/setu/security";
import type { SetuConsentStatus } from "@/lib/setu/types";
import { z } from "zod";

const createConsentBodySchema = z.object({
  customerPhone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be a valid 10-digit number")
    .optional()
    .default("9876543210"),
  redirectUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError(
        "UNAUTHORIZED",
        "You must be signed in with your account to initiate financial data import via Setu Account Aggregator.",
        401
      );
    }

    const rateResult = setuApiRateLimiter.check(clientKey(req.headers));
    if (!rateResult.ok) {
      return apiError(
        "RATE_LIMITED",
        `Too many requests. Please wait ${rateResult.retryAfterSeconds} seconds before requesting a new consent.`,
        429
      );
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body to use defaults
    }

    const parsed = createConsentBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid consent request parameters", 400, parsed.error.flatten());
    }

    const { customerPhone, redirectUrl } = parsed.data;

    let consentResult: {
      success: boolean;
      consentId?: string;
      url?: string;
      status?: string;
      error?: string;
    };

    if (isSetuConfigured()) {
      consentResult = await createSetuConsent({
        customerPhone,
        redirectUrl,
        purposeText: "Credit assessment and loan recourse planning",
      });
    } else {
      // Safe sandbox mock fallback for local dev when Setu Bridge credentials are placeholder
      const mockConsentId = `setu_sbx_consent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      consentResult = {
        success: true,
        consentId: mockConsentId,
        url: `https://fiu-sandbox.setu.co/consents/${mockConsentId}`,
        status: "PENDING",
      };
    }

    if (!consentResult.success || !consentResult.consentId) {
      return apiError(
        "INTERNAL_ERROR",
        consentResult.error || "Failed to create consent request with Setu AA Gateway.",
        502
      );
    }

    // Persist consent tracking in Supabase aa_consents table
    try {
      await supabase.from("aa_consents").insert({
        user_id: user.id,
        consent_id: consentResult.consentId,
        status: (consentResult.status || "PENDING") as SetuConsentStatus,
        purpose: "Credit assessment and loan recourse planning",
        redirect_url: consentResult.url || null,
        requested_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking if table is being initialized
    }

    safeLogSetuEvent("Setu consent created", {
      consentId: consentResult.consentId,
      status: consentResult.status,
    });

    return apiSuccess(
      {
        consentId: consentResult.consentId,
        url: consentResult.url,
        status: consentResult.status,
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error creating Setu consent";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
