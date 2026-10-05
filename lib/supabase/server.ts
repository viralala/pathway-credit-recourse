import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ACCOUNTS_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/** Every database call gets a deadline, so a slow database turns into an error, not a hung page. */
export function withDeadline(ms: number): typeof fetch {
  return (input, init) => {
    const deadline = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return fetch(input, { ...init, signal });
  };
}

const sessionFetch = withDeadline(12_000);

/**
 * The server client, bound to this request's cookies. A new one per request: the cookie jar
 * belongs to one request, and sharing it would hand one visitor another visitor's session.
 * Returns null when accounts are not configured.
 *
 * httpOnly is forced on for the session cookies. Nothing in the browser reads the session: every
 * read and write goes through this server, so no script on the page can reach the tokens.
 *
 * Setting cookies from a Server Component is not allowed, so setAll throws there and is
 * swallowed; proxy.ts refreshes the session on the routes that read it.
 */
export async function createClient() {
  if (!ACCOUNTS_ENABLED) return null;
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: sessionFetch },
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) jar.set(name, value, { ...options, httpOnly: true });
        } catch {
          // Called from a Server Component: the proxy already refreshed the session.
        }
      },
    },
  });
}

export type ServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export interface Viewer {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * The signed-in user, checked with the auth server (getUser), or null. Used wherever a decision
 * depends on who is asking; the cookie alone is never trusted.
 */
export async function getViewer(supabase: ServerClient): Promise<Viewer | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
    return { id: data.user.id, email: data.user.email ?? null, name };
  } catch {
    return null;
  }
}
