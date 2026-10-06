import { normalizeProfile } from "@/lib/schemes/normalizer";
import { getSchemeProvider } from "@/lib/schemes/provider";
import { matchSchemes, missingFieldsAcross } from "@/lib/schemes/ranker";
import { matchRequestSchema } from "@/lib/schemes/schema";
import type { ApplicantSchemeProfile, MatchResponse, SchemeMatch } from "@/lib/schemes/types";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { readBodyWithLimit } from "@/lib/security/body";
import { clientKey, createRateLimiter } from "@/lib/security/rateLimit";
import { isSameOriginRequest } from "@/lib/security/sameOrigin";
import { isJsonContentType } from "@/lib/security/validate";

/**
 * POST /api/schemes/match
 *
 * Request:  { profile?, applicant?: { monthlyIncome }, goal?: { amount }, save?: boolean }  (application/json, at most 8 KB)
 * Response: { success: true, data: MatchResponse }  or  { success: false, error: { code, message } }
 *
 * Says which government schemes' PUBLISHED eligibility criteria appear relevant. It never says a
 * person will be approved. Schemes come only from the database (through the provider); the credit
 * model is not involved and no credit score is accepted (unknown top-level keys are rejected).
 *
 * Saving is opt-in and best effort: only with `save: true`, only for a signed-in person, using their
 * own session (row level security applies) and the user id from the verified session. Signed out,
 * or if the write fails for any reason, the result is still returned with `saved: false`.
 */

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
const MAX_MATCH_BODY_BYTES = 8 * 1024;

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req.headers)) return apiError("FORBIDDEN", "Cross-origin requests are not allowed.", 403);

    const rate = limiter.check(clientKey(req.headers));
    if (!rate.ok) {
      return apiError("RATE_LIMITED", "Too many requests. Please try again shortly.", 429, undefined, {
        "Retry-After": String(rate.retryAfterSeconds),
      });
    }

    if (!isJsonContentType(req.headers.get("content-type"))) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.", 415);
    }

    const body = await readBodyWithLimit(req, MAX_MATCH_BODY_BYTES);
    if (!body.ok) {
      return body.status === 413
        ? apiError("PAYLOAD_TOO_LARGE", "The request is too large.", 413)
        : apiError("VALIDATION_ERROR", "The request body could not be read.", 400);
    }

    let json: unknown;
    try {
      json = JSON.parse(body.text);
    } catch {
      return apiError("VALIDATION_ERROR", "The request body is not valid JSON.", 400);
    }

    const parsed = matchRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "The request has fields that are unknown or out of range.", 400, {
        issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const request = parsed.data;

    const provider = await getSchemeProvider();
    const listed = await provider.listCurrent();
    if (!listed.ok) {
      return apiError("SERVICE_UNAVAILABLE", "Government scheme data is not available right now.", 503);
    }

    const profile = normalizeProfile({ profile: request.profile, applicant: request.applicant, goal: request.goal });
    const matches = matchSchemes(listed.schemes, profile);
    const missingFields = missingFieldsAcross(matches);
    const evaluatedAt = new Date().toISOString();
    const saved = request.save === true ? await saveMatches(matches, profile) : false;

    return apiSuccess<MatchResponse>({ matches, profile, missingFields, evaluatedAt, saved });
  } catch {
    return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
}

/** Writes the relevant matches to the signed-in person's history. Never throws; false means nothing was saved. */
async function saveMatches(matches: SchemeMatch[], profile: ApplicantSchemeProfile): Promise<boolean> {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) return false;

    const rows = matches
      .filter((m) => m.status !== "not_matched")
      .map((m) => ({
        user_id: user.id,
        scheme_id: m.scheme.id,
        scheme_slug: m.scheme.slug,
        scheme_version: m.scheme.version,
        status: m.status,
        relevance_score: m.relevance.score,
        profile: profile as Record<string, unknown>,
        evaluation: m.evaluation as unknown as Record<string, unknown>,
      }));
    if (rows.length === 0) return false;

    const { error } = await supabase.from("scheme_matches").insert(rows);
    return !error;
  } catch {
    return false;
  }
}
