import { NextResponse } from "next/server";
import { score } from "@/lib/model";
import { MAX_PLAN_BODY_BYTES, parseSavePlan } from "@/lib/security/accountInput";
import { apiError, NO_STORE, readJsonRequest } from "@/lib/security/jsonRequest";
import { createRateLimiter } from "@/lib/security/rateLimit";
import { createClient, getViewer } from "@/lib/supabase/server";

/**
 * POST /api/plans
 *
 * Request:  { name?: string, applicant: Applicant, lang?: "en" | "hi" | "mr" }  (JSON, at most 4 KB)
 * Response: { id: string }  with 201
 * Errors:   { error } with 403 / 429 / 415 / 413 / 400 / 401 (not signed in) / 409 (50-plan limit)
 *           / 503 (accounts off) / 500.
 *
 * Saves the profile as a plan and records it as the first check-in, so progress starts from today.
 * The insert runs as the signed-in user, so row level security decides what it may write.
 */
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  try {
    const read = await readJsonRequest(req, limiter, MAX_PLAN_BODY_BYTES);
    if (!read.ok) return read.response;
    const parsed = parseSavePlan(read.json);
    if (!parsed.ok) return apiError("invalid_request", 400);

    const supabase = await createClient();
    if (!supabase) return apiError("unavailable", 503);
    const viewer = await getViewer(supabase);
    if (!viewer) return apiError("unauthorized", 401);

    const { name, applicant, lang } = parsed.value;
    const { data: plan, error } = await supabase
      .from("saved_plans")
      .insert({ user_id: viewer.id, name, applicant, lang })
      .select("id")
      .single();
    if (error || !plan) return error?.message.includes("plan_limit") ? apiError("limit_reached", 409) : apiError("internal_error", 500);

    const { error: checkinError } = await supabase
      .from("plan_checkins")
      .insert({ plan_id: plan.id, user_id: viewer.id, applicant, score: Math.round(score(applicant)) });
    if (checkinError) return apiError("internal_error", 500);

    return NextResponse.json({ id: plan.id }, { status: 201, headers: NO_STORE });
  } catch {
    return apiError("internal_error", 500);
  }
}
