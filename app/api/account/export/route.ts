import { NextResponse } from "next/server";
import { apiError, NO_STORE } from "@/lib/security/jsonRequest";
import { createClient, getViewer } from "@/lib/supabase/server";

/**
 * GET /api/account/export → a JSON file of everything Pathway stores about the signed-in person:
 * their profile, saved plans and check-ins. Linked from "My plans" (the right to access your data).
 * Same-origin only, so another site cannot make a signed-in visitor download it in the background.
 */
export async function GET(req: Request) {
  try {
    // A link on our own page sends same-origin; a typed or bookmarked address sends none.
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") return apiError("forbidden", 403);

    const supabase = await createClient();
    if (!supabase) return apiError("unavailable", 503);
    const viewer = await getViewer(supabase);
    if (!viewer) return apiError("unauthorized", 401);

    const [profile, plans, checkins] = await Promise.all([
      supabase.from("profiles").select("id, display_name, created_at").eq("id", viewer.id).maybeSingle(),
      supabase.from("saved_plans").select("id, name, applicant, lang, created_at, updated_at").order("created_at"),
      supabase.from("plan_checkins").select("id, plan_id, applicant, score, created_at").order("created_at"),
    ]);
    if (profile.error || plans.error || checkins.error) return apiError("internal_error", 500);

    const body = {
      exportedAt: new Date().toISOString(),
      account: { id: viewer.id, email: viewer.email, name: viewer.name },
      profile: profile.data,
      savedPlans: plans.data,
      checkins: checkins.data,
      units: { monthlyIncome: "rupees per month", utilization: "fraction of card limits", debtRatio: "FOIR, fraction of income" },
    };
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="pathway-my-data.json"',
      },
    });
  } catch {
    return apiError("internal_error", 500);
  }
}
