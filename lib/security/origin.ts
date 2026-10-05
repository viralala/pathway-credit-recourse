/**
 * The address Google sign-in sends people back to.
 *
 * Built from an allow-list, not from whatever Host a request claims: the configured site URL, the
 * production address, the deployment's own addresses (set by Vercel, so a preview returns to
 * itself) and localhost in development. Anything else gets the canonical origin. Supabase's own
 * Redirect URL list is the second lock.
 */
export const DEFAULT_ORIGIN = "https://pathway-credit-recourse.vercel.app";

type Env = Partial<
  Record<"NEXT_PUBLIC_SITE_URL" | "VERCEL_URL" | "VERCEL_BRANCH_URL" | "VERCEL_PROJECT_PRODUCTION_URL" | "NODE_ENV", string>
>;

function originOf(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const v = value.trim();
    return new URL(v.includes("://") ? v : `https://${v}`).origin;
  } catch {
    return null;
  }
}

export function allowedOrigins(env: Env = process.env): Set<string> {
  const out = new Set([DEFAULT_ORIGIN]);
  for (const v of [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    const o = originOf(v);
    if (o) out.add(o);
  }
  if (env.NODE_ENV !== "production") {
    out.add("http://localhost:3000");
    out.add("http://127.0.0.1:3000");
  }
  return out;
}

export function canonicalOrigin(env: Env = process.env): string {
  return originOf(env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_ORIGIN;
}

/** The origin to build a return address from. Only an allow-listed host is believed. */
export function trustedOrigin(headers: { get(name: string): string | null }, env: Env = process.env): string {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const claimed = (headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim().toLowerCase();
  const proto = claimed === "http" ? "http" : "https";
  if (host && /^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) {
    const candidate = `${proto}://${host}`;
    if (allowedOrigins(env).has(candidate)) return candidate;
  }
  return canonicalOrigin(env);
}
