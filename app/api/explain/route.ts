import { NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { MAX_BODY_BYTES, readBodyWithLimit } from "@/lib/security/body";
import { acceptRewrite, REWRITE_MAX_TOKENS, rewritePrompt, serverSummary, type ServerSummary } from "@/lib/security/explain";
import { clientKey, createRateLimiter } from "@/lib/security/rateLimit";
import { isSameOriginRequest } from "@/lib/security/sameOrigin";
import { isJsonContentType, parseExplainRequest } from "@/lib/security/validate";

/**
 * POST /api/explain
 *
 * Request:  { applicant: Applicant, name?: string, lang?: "en" | "hi" | "mr" }   (application/json, at most 4 KB)
 * Response: { text: string, source: "ai" | "template" }
 * Errors:   { error: "forbidden" | "rate_limited" | "unsupported_media_type" | "payload_too_large"
 *                    | "invalid_request" | "internal_error" }  with 403 / 429 / 415 / 413 / 400 / 500.
 *
 * The server validates the numbers, rebuilds the plain-language summary itself with the same
 * functions the page uses, and only then (when ANTHROPIC_API_KEY is set) asks Claude to reword it.
 * Client-supplied text is never forwarded, so the endpoint cannot be used as a general-purpose
 * LLM proxy. Any AI failure falls back to the template. Only POST is exported, so Next.js answers
 * every other method with 405.
 */

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;
const AI_TIMEOUT_MS = 10_000;
const DEFAULT_MODEL = "claude-haiku-4-5";

type ErrorCode =
  | "forbidden"
  | "rate_limited"
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_request"
  | "internal_error";

function fail(error: ErrorCode, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...headers } });
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req.headers)) return fail("forbidden", 403);

    const rate = limiter.check(clientKey(req.headers));
    if (!rate.ok) return fail("rate_limited", 429, { "Retry-After": String(rate.retryAfterSeconds) });

    if (!isJsonContentType(req.headers.get("content-type"))) return fail("unsupported_media_type", 415);

    const body = await readBodyWithLimit(req, MAX_BODY_BYTES);
    if (!body.ok) return body.status === 413 ? fail("payload_too_large", 413) : fail("invalid_request", 400);

    let json: unknown;
    try {
      json = JSON.parse(body.text);
    } catch {
      return fail("invalid_request", 400);
    }
    const parsed = parseExplainRequest(json);
    if (!parsed.ok) return fail("invalid_request", 400);

    const { applicant, name, lang } = parsed.value;
    const summary = serverSummary(applicant, name, lang);
    const rewritten = await rewriteWithClaude(summary, lang);
    return NextResponse.json(
      rewritten ? { text: rewritten, source: "ai" } : { text: summary.text, source: "template" },
      { headers: NO_STORE },
    );
  } catch {
    return fail("internal_error", 500);
  }
}

/** Plain-language rewrite via the Anthropic Messages API. Returns null on any problem. */
async function rewriteWithClaude(summary: ServerSummary, lang: Lang): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const { system, user } = rewritePrompt(summary.text, lang);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
        max_tokens: REWRITE_MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
    if (data.stop_reason !== "end_turn") return null;
    const text = data.content?.find((c) => c.type === "text")?.text;
    return acceptRewrite(text, summary.keyNumbers);
  } catch {
    return null;
  }
}
