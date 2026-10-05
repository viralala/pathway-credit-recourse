import { NextResponse } from "next/server";
import { trustedOrigin } from "@/lib/security/origin";
import { isSameOriginRequest } from "@/lib/security/sameOrigin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /auth/signout, from the sign-out form on "My plans". POST and same-origin only, so no
 * other site (and no link prefetch) can sign a visitor out. Ends this browser's session and goes
 * home with a 303, so the browser follows with a GET.
 */
export async function POST(req: Request) {
  const origin = trustedOrigin(req.headers);
  if (!isSameOriginRequest(req.headers)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
