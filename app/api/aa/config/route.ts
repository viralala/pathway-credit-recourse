import { aaErrorResponse, getMode, guardRequest } from "@/lib/aa";
import { apiSuccess } from "@/lib/security/api-response";
import { createRateLimiter } from "@/lib/security/rateLimit";

/**
 * GET /api/aa/config
 * Response: { success: true, data: { mode: "sandbox" | "setu" } }
 * "setu" only when SETU_AA_CLIENT_ID, SETU_AA_CLIENT_SECRET and SETU_AA_PRODUCT_INSTANCE_ID are all set.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function GET(req: Request) {
  try {
    const blocked = guardRequest(req, limiter);
    if (blocked) return blocked;
    return apiSuccess({ mode: getMode() });
  } catch (err) {
    return aaErrorResponse(err);
  }
}
