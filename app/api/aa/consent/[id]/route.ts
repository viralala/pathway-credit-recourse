import { z } from "zod";
import { aaErrorResponse, getProvider, guardRequest } from "@/lib/aa";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createRateLimiter } from "@/lib/security/rateLimit";

/**
 * GET /api/aa/consent/[id]
 * Response: { success: true, data: { status: "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED", mode } }
 * Sandbox consent ids are always ACTIVE.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{6,128}$/);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const blocked = guardRequest(req, limiter);
    if (blocked) return blocked;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return apiError("VALIDATION_ERROR", "Invalid consent id", 400);
    return apiSuccess(await getProvider().consentStatus(id.data));
  } catch (err) {
    return aaErrorResponse(err);
  }
}
