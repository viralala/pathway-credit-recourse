import { z } from "zod";
import { aaErrorResponse, getProvider, readGuardedJson } from "@/lib/aa";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createRateLimiter } from "@/lib/security/rateLimit";

/**
 * POST /api/aa/consent
 * Body:     { demoProfile?: "salaried" | "stretched" | "thin-file", mobile?: string }
 * Response: { success: true, data: { consentId, mode, redirectUrl } }
 * Sandbox mode needs demoProfile; Setu mode needs a 10-digit Indian mobile number. The number is passed
 * to Setu once and is never stored, logged or returned.
 */
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const bodySchema = z.object({
  demoProfile: z.enum(["salaried", "stretched", "thin-file"]).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
});

export async function POST(req: Request) {
  try {
    const read = await readGuardedJson(req, limiter);
    if (!read.ok) return read.response;
    const parsed = bodySchema.safeParse(read.json);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid request", 400);
    return apiSuccess(await getProvider().createConsent({ ...parsed.data, origin: new URL(req.url).origin }));
  } catch (err) {
    return aaErrorResponse(err);
  }
}
