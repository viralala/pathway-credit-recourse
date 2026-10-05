import { NextResponse } from "next/server";
import { score } from "@/lib/model";
import { MAX_PLAN_BODY_BYTES, isUuid, parseCheckin } from "@/lib/security/accountInput";
import { apiError, NO_STORE, readJsonRequest } from "@/lib/security/jsonRequest";
import { createRateLimiter } from "@/lib/security/rateLimit";
import { createClient, getViewer } from "@/lib/supabase/server";

/**
 * POST /api/plans/{id}/checkins
 *
 * Request:  { applicant: Applicant }  (JSON, at most 4 KB)
 * Response: { score: number }  with 201
 * Errors:   { error } with 403 / 429 / 415 / 413 / 400 / 401 / 404 (not your plan) / 409 (120 limit)
 *           / 503 / 500.
 *
 * Records today's numbers against a saved plan. Row level security only lets a person add a
 * check-in to a plan they own; the explicit lookup below turns "not yours" into a clear 404.
 */
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const read = await readJsonRequest(req, limiter, MAX_PLAN_BODY_BYTES);
    if (!read.ok) return read.response;
    if (!isUuid(id)) return apiError("not_found", 404);
    const parsed = parseCheckin(read.json);
    if (!parsed.ok) return apiError("invalid_request", 400);

    const supabase = await createClient();
    if (!supabase) return apiError("unavailable", 503);
    const viewer = await getViewer(supabase);
    if (!viewer) return apiError("unauthorized", 401);

    const { data: plan } = await supabase.from("saved_plans").select("id").eq("id", id).maybeSingle();
    if (!plan) return apiError("not_found", 404);

    const { applicant } = parsed.value;
    const s = Math.round(score(applicant));
    const { error } = await supabase.from("plan_checkins").insert({ plan_id: id, user_id: viewer.id, applicant, score: s });
    if (error) return error.message.includes("checkin_limit") ? apiError("limit_reached", 409) : apiError("internal_error", 500);

    return NextResponse.json({ score: s }, { status: 201, headers: NO_STORE });
  } catch {
    return apiError("internal_error", 500);
  }
}
