import { z } from "zod";
import { aaErrorResponse, getProvider, guardRequest } from "@/lib/aa";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { createRateLimiter } from "@/lib/security/rateLimit";

/**
 * GET /api/aa/data/[id]
 * Response: { success: true, data: AAFetchResult } (see lib/aa/types.ts)
 * The financial data is fetched, reduced to the seven model inputs and returned in the same request.
 * It is never logged or stored, and the response is no-store.
 */
export const maxDuration = 60;

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{6,128}$/);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const blocked = guardRequest(req, limiter);
    if (blocked) return blocked;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return apiError("VALIDATION_ERROR", "Invalid consent id", 400);
    return apiSuccess(await getProvider().fetchData(id.data));
  } catch (err) {
    return aaErrorResponse(err);
  }
}
