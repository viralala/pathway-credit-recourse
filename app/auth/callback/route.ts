import { NextResponse, type NextRequest } from "next/server";
import { trustedOrigin } from "@/lib/security/origin";
import { safeNextPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sign-in comes back to: with a `code` to trade for a session, or with an `error`
 * when the person cancelled or the provider refused. Either way the person lands on a page that
 * explains itself. The provider's own error text is never shown: it is written for developers,
 * and it arrives in a URL anybody can write.
 */
export async function GET(request: NextRequest) {
  const origin = trustedOrigin(request.headers);
  const params = request.nextUrl.searchParams;
  const fail = (code: string) => NextResponse.redirect(`${origin}/signin?error=${code}`);

  if (params.get("error") || params.get("error_description")) {
    return fail(params.get("error") === "access_denied" ? "cancelled" : "provider-failed");
  }

  const code = params.get("code");
  if (!code) return NextResponse.redirect(`${origin}/signin`);

  const supabase = await createClient();
  if (!supabase) return fail("unavailable");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("session-failed");

  const next = safeNextPath(params.get("next")) ?? "/account";
  return NextResponse.redirect(`${origin}${next}`);
}
