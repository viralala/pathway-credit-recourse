import { ACCOUNTS_ENABLED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { parseSchemeRow } from "./schema";
import type { Scheme } from "./types";

/**
 * Where schemes come from. The matching engine never reads a database itself: it is handed a list of
 * schemes by a SchemeProvider, so the source (Supabase today, something else tomorrow) can change
 * without touching the rules, the ranker or the routes. No scheme is written in code; every scheme
 * is a row somebody published.
 */

export type ProviderResult =
  | { ok: true; schemes: Scheme[]; /** Rows that failed validation and were left out. */ skipped: number }
  | { ok: false; reason: "not_configured" | "unavailable" };

export interface SchemeProvider {
  /** The current version of every active scheme, ordered by slug. */
  listCurrent(): Promise<ProviderResult>;
}

/** How long the scheme list is reused between requests. Schemes change rarely; a new version shows up within this time. */
export const SCHEME_CACHE_TTL_MS = 5 * 60_000;

/** The columns read from `government_schemes`. Listed one by one: a column added later is never exposed by accident. */
export const SCHEME_COLUMNS = [
  "id",
  "slug",
  "version",
  "is_current",
  "status",
  "name",
  "short_name",
  "scheme_type",
  "summary",
  "benefits",
  "implementing_agency",
  "ministry",
  "min_loan_amount",
  "max_loan_amount",
  "eligibility_rules",
  "how_to_apply",
  "application_url",
  "official_url",
  "sources",
  "last_verified_at",
  "verification_status",
  "effective_from",
].join(", ");

// ---------------------------------------------------------------------------------------------
// Shared rules: the same filtering and validation whatever the source
// ---------------------------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A slug that is safe to put in a log line, or "?" when the row has none. */
function slugForLog(row: unknown): string {
  const slug = isRecord(row) ? row.slug : undefined;
  return typeof slug === "string" && /^[a-z0-9-]{1,60}$/.test(slug) ? slug : "?";
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Raw rows -> the schemes that may be offered. Defence in depth: row level security already hides
 * everything but active, current rows, and this still drops anything else, validates each row
 * (a bad row is skipped and counted, never trusted), and keeps one row per slug, the highest version.
 */
function schemesFromRows(rows: unknown[]): { schemes: Scheme[]; skipped: number } {
  const valid: Scheme[] = [];
  const invalidSlugs: string[] = [];

  for (const row of rows) {
    // A row that is plainly not offered is dropped without comment; it is not a data problem.
    if (isRecord(row) && ((row.status !== undefined && row.status !== "active") || (row.is_current !== undefined && row.is_current !== true))) continue;
    const scheme = parseSchemeRow(row);
    if (scheme === null) {
      invalidSlugs.push(slugForLog(row));
      continue;
    }
    if (scheme.status !== "active" || !scheme.isCurrent) continue;
    valid.push(scheme);
  }

  const newest = new Map<string, Scheme>();
  for (const scheme of valid) {
    const held = newest.get(scheme.slug);
    if (!held || scheme.version > held.version || (scheme.version === held.version && compareText(scheme.id, held.id) < 0)) {
      newest.set(scheme.slug, scheme);
    }
  }

  if (invalidSlugs.length > 0) {
    console.warn(`[schemes] skipped ${invalidSlugs.length} invalid scheme row(s): ${invalidSlugs.join(", ")}`);
  }
  return { schemes: [...newest.values()].sort((a, b) => compareText(a.slug, b.slug)), skipped: invalidSlugs.length };
}

// ---------------------------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------------------------

/** The part of a Supabase query builder this module uses. */
export interface SchemeQueryBuilder extends PromiseLike<{ data: unknown[] | null; error: unknown }> {
  eq(column: string, value: string | boolean): SchemeQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): SchemeQueryBuilder;
}

/** Minimal structural type of what is needed from a Supabase client, so tests can pass a fake. */
export interface SchemeClientLike {
  from(table: string): { select(columns: string): SchemeQueryBuilder };
}

export function createSupabaseSchemeProvider(client: SchemeClientLike): SchemeProvider {
  return {
    async listCurrent() {
      try {
        const { data, error } = await client
          .from("government_schemes")
          .select(SCHEME_COLUMNS)
          .eq("status", "active")
          .eq("is_current", true)
          .order("slug", { ascending: true });
        if (error || !Array.isArray(data)) return { ok: false, reason: "unavailable" };
        return { ok: true, ...schemesFromRows(data) };
      } catch {
        // The error text is never logged or returned: it may carry connection details.
        return { ok: false, reason: "unavailable" };
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// In memory
// ---------------------------------------------------------------------------------------------

/** For tests and future sources. Rows are database rows (snake_case); the filtering and validation are the Supabase provider's. */
export function createInMemorySchemeProvider(rows: unknown[]): SchemeProvider {
  return {
    async listCurrent() {
      return { ok: true, ...schemesFromRows(rows) };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------------------------

/**
 * Remembers a successful result for `ttlMs`. A failure is never remembered, so the next call tries
 * again. Calls that arrive while a request is already in flight share it.
 */
export function withCache(provider: SchemeProvider, ttlMs: number, now: () => number = Date.now): SchemeProvider {
  let held: { result: Extract<ProviderResult, { ok: true }>; expiresAt: number } | null = null;
  let inFlight: Promise<ProviderResult> | null = null;

  return {
    listCurrent() {
      if (held && now() < held.expiresAt) return Promise.resolve(held.result);
      if (inFlight) return inFlight;

      const request = (async (): Promise<ProviderResult> => {
        try {
          const result = await provider.listCurrent();
          if (result.ok) held = { result, expiresAt: now() + ttlMs };
          return result;
        } catch {
          return { ok: false, reason: "unavailable" };
        } finally {
          inFlight = null;
        }
      })();
      inFlight = request;
      return request;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The server default
// ---------------------------------------------------------------------------------------------

const NOT_CONFIGURED: SchemeProvider = { listCurrent: async () => ({ ok: false, reason: "not_configured" }) };

/**
 * The scheme list is public reference data, so it is cached for the whole server process. The
 * Supabase client is not: it is built from the request's cookies, so it is created only on a miss.
 */
const cachedSupabaseProvider = withCache(
  {
    async listCurrent() {
      const client = await createClient();
      return createSupabaseSchemeProvider(client as unknown as SchemeClientLike).listCurrent();
    },
  },
  SCHEME_CACHE_TTL_MS,
);

/** No database configured is a normal state, not an error: the provider simply says so. */
export async function getSchemeProvider(): Promise<SchemeProvider> {
  return ACCOUNTS_ENABLED ? cachedSupabaseProvider : NOT_CONFIGURED;
}
