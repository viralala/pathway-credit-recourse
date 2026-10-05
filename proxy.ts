import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Keeps sign-in sessions fresh on the pages that read them, and sends signed-out visitors from
 * "My plans" to the sign-in page. This is an optimistic check that saves a render; the account
 * pages ask the auth server again before showing anything. Public pages are not matched, so they
 * stay static.
 */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && (pathname === "/account" || pathname.startsWith("/account/"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/signin";
    to.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(to);
    // Keep any cookie the refresh just cleared or rotated.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/account", "/account/:path*"],
};
