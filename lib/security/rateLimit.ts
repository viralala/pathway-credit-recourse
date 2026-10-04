/**
 * In-memory sliding-window rate limiter.
 *
 * Best effort only: on serverless hosting every instance has its own memory, so the real limit is
 * "N per window per instance", and counters vanish when an instance is recycled. That is enough to
 * blunt casual abuse of a single endpoint. A shared store (for example a Redis-compatible KV) is the
 * upgrade path when the project gets a database.
 */

export interface RateLimitOptions {
  /** Requests allowed per window. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Upper bound on tracked keys, so a flood of distinct keys cannot exhaust memory. */
  maxKeys?: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  /** Requests still allowed in the current window after this one. */
  remaining: number;
  /** Seconds until the next request would be allowed (0 when ok). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  /** Number of keys currently tracked (for tests and diagnostics). */
  size(): number;
  reset(): void;
}

export function createRateLimiter({ limit = 10, windowMs = 60_000, maxKeys = 10_000 }: RateLimitOptions = {}): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("limit must be a positive integer");
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new RangeError("windowMs must be positive");
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= now - windowMs) hits.delete(key);
    }
    // Still too many live keys: drop the least recently used (Map keeps insertion order and
    // every check re-inserts its key, so the first entries are the stalest).
    while (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
  }

  return {
    check(key, now = Date.now()) {
      const since = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > since);
      hits.delete(key);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const retryMs = recent[0] + windowMs - now;
        return { ok: false, limit, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > maxKeys) prune(now);
      return { ok: true, limit, remaining: limit - recent.length, retryAfterSeconds: 0 };
    },
    size: () => hits.size,
    reset: () => hits.clear(),
  };
}

const IP_PATTERN = /^[0-9a-f:.]{2,45}$/i;

/**
 * Best-effort client address for rate limiting. Behind Vercel (and most reverse proxies) the platform
 * sets these headers itself; when running without a proxy they can be forged, which only lets a
 * caller spread requests across buckets, never gain access to anything.
 */
export function clientKey(headers: Headers): string {
  const candidates = [headers.get("x-real-ip"), headers.get("x-forwarded-for")?.split(",")[0]];
  for (const c of candidates) {
    const v = c?.trim();
    if (v && IP_PATTERN.test(v)) return v.toLowerCase();
  }
  return "unknown";
}
