import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Ensure profile exists in profiles table
      const user = data.user;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Applicant";
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        email: user.email ?? null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      // Prevent open redirects
      const safeRedirect = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  // Return to login with error if auth failed
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
