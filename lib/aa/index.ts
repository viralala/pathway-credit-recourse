import "server-only";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/security/api-response";
import { MAX_BODY_BYTES, readBodyWithLimit } from "@/lib/security/body";
import { clientKey, type RateLimiter } from "@/lib/security/rateLimit";
import { isSameOriginRequest } from "@/lib/security/sameOrigin";
import { isJsonContentType } from "@/lib/security/validate";
import { AAError, type AAProvider } from "./provider";
import { sandboxProvider } from "./sandbox";
import { createSetuProvider, readSetuConfig } from "./setu";
import type { AAMode } from "./types";

export type { AAFetchResult, AAMode, ConsentStatus, DemoProfile, FieldSource, LinkedAccount } from "./types";
export { AAError } from "./provider";

/** Setu when all three SETU_AA_* credentials are set, otherwise the fictional sandbox. Server only. */
export function getProvider(env: Record<string, string | undefined> = process.env): AAProvider {
  const config = readSetuConfig(env);
  return config ? createSetuProvider(config) : sandboxProvider;
}

export const getMode = (env: Record<string, string | undefined> = process.env): AAMode => getProvider(env).mode;

/** Same-origin and rate-limit checks shared by every /api/aa route. Returns an error response, or null to continue. */
export function guardRequest(req: Request, limiter: RateLimiter): NextResponse | null {
  if (!isSameOriginRequest(req.headers)) return apiError("FORBIDDEN", "Forbidden", 403);
  const rate = limiter.check(clientKey(req.headers));
  if (!rate.ok) return apiError("RATE_LIMITED", "Too many requests", 429, undefined, { "Retry-After": String(rate.retryAfterSeconds) });
  return null;
}

/** guardRequest plus a bounded, valid JSON body. */
export async function readGuardedJson(
  req: Request,
  limiter: RateLimiter,
): Promise<{ ok: true; json: unknown } | { ok: false; response: NextResponse }> {
  const blocked = guardRequest(req, limiter);
  if (blocked) return { ok: false, response: blocked };
  if (!isJsonContentType(req.headers.get("content-type"))) return { ok: false, response: apiError("UNSUPPORTED_MEDIA_TYPE", "Expected application/json", 415) };
  const body = await readBodyWithLimit(req, MAX_BODY_BYTES);
  if (!body.ok) {
    return { ok: false, response: body.status === 413 ? apiError("PAYLOAD_TOO_LARGE", "Body too large", 413) : apiError("VALIDATION_ERROR", "Invalid request", 400) };
  }
  try {
    return { ok: true, json: JSON.parse(body.text) };
  } catch {
    return { ok: false, response: apiError("VALIDATION_ERROR", "Invalid JSON", 400) };
  }
}

/** Turns a provider failure into a response. Messages are fixed strings, never user data. */
export function aaErrorResponse(err: unknown): NextResponse {
  if (err instanceof AAError) {
    switch (err.code) {
      case "invalid_request":
        return apiError("VALIDATION_ERROR", "Invalid request", 400);
      case "not_found":
        return apiError("NOT_FOUND", "Consent not found", 404);
      case "not_ready":
        return apiError("INTERNAL_ERROR", "Data is not ready yet, try again shortly", 409);
      case "upstream":
        return apiError("INTERNAL_ERROR", "The data provider is unavailable", 502);
    }
  }
  return apiError("INTERNAL_ERROR", "Something went wrong", 500);
}

