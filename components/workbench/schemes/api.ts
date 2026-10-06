import type { MatchRequest, MatchResponse, MatchStatus, SchemeMatch } from "@/lib/schemes/types";

export type MatchFailure = "unavailable" | "rateLimited" | "failed" | "network";
export type MatchResult = { ok: true; data: MatchResponse } | { ok: false; reason: MatchFailure };

const STATUSES: readonly MatchStatus[] = ["appears_relevant", "needs_more_information", "not_matched"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * `data` of a successful response, checked just enough to render safely: a list of matches that each
 * have a scheme, a status and an evaluation. A malformed match is dropped rather than crashing the page.
 */
export function parseMatchResponse(data: unknown): MatchResponse | null {
  if (!isObject(data) || !Array.isArray(data.matches)) return null;
  const matches = data.matches.filter(
    (m): m is SchemeMatch =>
      isObject(m) &&
      isObject(m.scheme) &&
      typeof m.scheme.name === "string" &&
      STATUSES.includes(m.status as MatchStatus) &&
      isObject(m.evaluation),
  );
  return {
    matches,
    profile: isObject(data.profile) ? (data.profile as MatchResponse["profile"]) : {},
    missingFields: Array.isArray(data.missingFields) ? (data.missingFields as MatchResponse["missingFields"]) : [],
    evaluatedAt: typeof data.evaluatedAt === "string" ? data.evaluatedAt : "",
    saved: data.saved === true,
  };
}

/**
 * POST /api/schemes/match. Never throws: every failure is a `reason` the UI has a message for.
 * Returns null when `signal` was aborted (a newer check replaced this one), so a stale answer is ignored.
 */
export async function requestMatches(body: MatchRequest, signal: AbortSignal): Promise<MatchResult | null> {
  try {
    const res = await fetch("/api/schemes/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (signal.aborted) return null;
    if (res.status === 503) return { ok: false, reason: "unavailable" };
    if (res.status === 429) return { ok: false, reason: "rateLimited" };

    const json: unknown = await res.json().catch(() => null);
    if (signal.aborted) return null;

    if (!res.ok) {
      const code = isObject(json) && isObject(json.error) ? json.error.code : undefined;
      return { ok: false, reason: code === "SERVICE_UNAVAILABLE" ? "unavailable" : "failed" };
    }
    const data = isObject(json) && json.success === true ? parseMatchResponse(json.data) : null;
    return data ? { ok: true, data } : { ok: false, reason: "failed" };
  } catch {
    return signal.aborted ? null : { ok: false, reason: "network" };
  }
}
