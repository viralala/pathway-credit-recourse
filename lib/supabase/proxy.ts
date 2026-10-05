import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Refreshes the session on the way past, and reports whether one exists.
 *
 * Access tokens are short-lived and Server Components cannot write cookies, so something upstream
 * has to refresh them and put the new pair on the response. getClaims verifies the token's
 * signature (locally for asymmetric signing keys, with the auth server otherwise) and refreshes a
 * token that is about to expire. The response also carries the no-store headers the library asks
 * for, so a CDN never caches one visitor's tokens.
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });
  if (!ACCOUNTS_ENABLED) return { response, signedIn: false };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, { ...options, httpOnly: true });
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  try {
    const { data } = await supabase.auth.getClaims();
    return { response, signedIn: !!data?.claims };
  } catch {
    return { response, signedIn: false };
  }
}
