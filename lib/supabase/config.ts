/**
 * Where the database lives, from the environment.
 *
 * Accounts are optional. Without these two variables the site still works in full; the sign-in
 * link, "Save plan" and "My plans" simply do not appear. Both values are public by design (they
 * are compiled into the browser bundle): the URL is a hostname, and the publishable key grants
 * nothing that row level security does not already allow. The service role key is never used.
 *
 *   NEXT_PUBLIC_SUPABASE_URL              https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  sb_publishable_... (or a legacy anon key)
 *
 * NEXT_PUBLIC_ values are inlined at build time, so redeploy after setting them.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
export const SUPABASE_PUBLISHABLE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

/** A URL we would actually send a session to: https, or http only for a local Supabase. */
export function usableSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

/** True when both values are present, so accounts are switched on. */
export const ACCOUNTS_ENABLED = usableSupabaseUrl(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY.length > 0;
