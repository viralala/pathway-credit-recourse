import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCOUNTS_ENABLED } from "@/lib/supabase/config";
import { createClient, getViewer } from "@/lib/supabase/server";
import { NO_STORE } from "@/lib/security/jsonRequest";

/**
 * GET /api/session → { enabled, signedIn, name }
 *
 * Lets the static pages show "Sign in" or "My plans" and the save button without rendering per
 * request. Nothing private is returned beyond the signed-in person's own first name.
 */
export async function GET() {
  if (!ACCOUNTS_ENABLED) return NextResponse.json({ enabled: false, signedIn: false, name: null }, { headers: NO_STORE });

  // No Supabase cookie at all: signed out, without a round trip to the auth server.
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.startsWith("sb-"))) {
    return NextResponse.json({ enabled: true, signedIn: false, name: null }, { headers: NO_STORE });
  }

  const supabase = await createClient();
  const viewer = supabase ? await getViewer(supabase) : null;
  const first = viewer?.name?.trim().split(/\s+/)[0]?.slice(0, 40) ?? null;
  return NextResponse.json({ enabled: true, signedIn: !!viewer, name: viewer ? first : null }, { headers: NO_STORE });
}
