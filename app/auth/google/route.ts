import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { trustedOrigin } from "@/lib/security/origin";
import { safeNextPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/google?next=/check → Google's sign-in screen.
 *
 * Supabase writes the PKCE code verifier into a cookie here (the route handler can set cookies)
 * and returns Google's address. Google sends the person back to /auth/callback, which trades the
 * code for a session. Reached by an ordinary link, so it works without JavaScript; starting a
 * sign-in on someone's behalf only shows them Google's own consent screen.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) redirect("/signin?error=unavailable");

  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const origin = trustedOrigin(request.headers);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    const disabled = error?.message.toLowerCase().includes("not enabled");
    redirect(`/signin?error=${disabled ? "provider-disabled" : "provider-failed"}`);
  }
  redirect(data.url);
}
