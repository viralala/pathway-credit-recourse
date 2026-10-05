import { NextResponse } from "next/server";
import { readBodyWithLimit } from "./body";
import { clientKey, type RateLimiter } from "./rateLimit";
import { isSameOriginRequest } from "./sameOrigin";
import { isJsonContentType } from "./validate";

export const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export type ApiError =
  | "forbidden"
  | "rate_limited"
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_request"
  | "unauthorized"
  | "not_found"
  | "limit_reached"
  | "unavailable"
  | "internal_error";

export function apiError(error: ApiError, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });
}

/**
 * The checks every state-changing JSON endpoint runs, in order: same origin, rate limit,
 * JSON content type, bounded body, valid JSON. Returns the parsed body or the error response.
 */
export async function readJsonRequest(
  req: Request,
  limiter: RateLimiter,
  maxBytes: number,
): Promise<{ ok: true; json: unknown } | { ok: false; response: NextResponse }> {
  if (!isSameOriginRequest(req.headers)) return { ok: false, response: apiError("forbidden", 403) };
  const rate = limiter.check(clientKey(req.headers));
  if (!rate.ok) return { ok: false, response: apiError("rate_limited", 429, { "Retry-After": String(rate.retryAfterSeconds) }) };
  if (!isJsonContentType(req.headers.get("content-type"))) return { ok: false, response: apiError("unsupported_media_type", 415) };
  const body = await readBodyWithLimit(req, maxBytes);
  if (!body.ok) return { ok: false, response: body.status === 413 ? apiError("payload_too_large", 413) : apiError("invalid_request", 400) };
  try {
    return { ok: true, json: JSON.parse(body.text) };
  } catch {
    return { ok: false, response: apiError("invalid_request", 400) };
  }
}
