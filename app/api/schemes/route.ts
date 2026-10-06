import { getSchemeProvider } from "@/lib/schemes/provider";
import type { SchemeListResponse } from "@/lib/schemes/types";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { clientKey, createRateLimiter } from "@/lib/security/rateLimit";

/**
 * GET /api/schemes
 *
 * The current version of every active government scheme, as published in the database.
 * Public reference data, so unlike the rest of the API it may be cached for a short while.
 * 429 with Retry-After when called too often; 503 SERVICE_UNAVAILABLE when no database is
 * configured or it cannot be reached. Only GET is exported, so every other method gets a 405.
 */

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const PUBLIC_CACHE = { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } as const;

export async function GET(req: Request) {
  try {
    const rate = limiter.check(clientKey(req.headers));
    if (!rate.ok) {
      return apiError("RATE_LIMITED", "Too many requests. Please try again shortly.", 429, undefined, {
        "Retry-After": String(rate.retryAfterSeconds),
      });
    }

    const provider = await getSchemeProvider();
    const result = await provider.listCurrent();
    if (!result.ok) {
      return apiError("SERVICE_UNAVAILABLE", "Government scheme data is not available right now.", 503);
    }

    return apiSuccess<SchemeListResponse>({ schemes: result.schemes }, 200, PUBLIC_CACHE);
  } catch {
    return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
}
