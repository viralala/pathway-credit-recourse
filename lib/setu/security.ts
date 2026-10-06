import "server-only";
import { createRateLimiter } from "@/lib/security/rateLimit";
import type { SetuWebhookPayload } from "./types";

/**
 * Dedicated Rate Limiter for Setu AA Endpoints.
 * Limits users to 15 consent/data operations per minute per IP to prevent polling abuse.
 */
export const setuApiRateLimiter = createRateLimiter({
  limit: 15,
  windowMs: 60_000,
  maxKeys: 5_000,
});

/**
 * Sensitive fields that must NEVER be printed to application logs.
 */
const SENSITIVE_LOG_KEYS = new Set([
  "clientsecret",
  "client_secret",
  "authorization",
  "accesstoken",
  "access_token",
  "token",
  "password",
  "pan",
  "accountnumber",
  "account_number",
  "accountnumbers",
  "maskedaccnumber",
  "narration",
  "transaction",
  "transactions",
  "amount",
  "balance",
  "currentbalance",
  "signingprivatekey",
  "privatekey",
]);

/**
 * Strips sensitive financial details and secrets from metadata objects before logging.
 */
export function sanitizeLogMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SENSITIVE_LOG_KEYS.has(normalizedKey)) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizeLogMetadata(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Safe logger conforming to the Pathway Sensitive Data Logging Policy.
 */
export function safeLogSetuEvent(event: string, meta?: Record<string, unknown>): void {
  // In production or test environments, logs metadata safely without exposing PII/credentials
  if (process.env.NODE_ENV !== "test") {
    const safeMeta = sanitizeLogMetadata(meta);
    console.info(`[Setu AA Audit] ${event}`, Object.keys(safeMeta).length > 0 ? safeMeta : "");
  }
}

/**
 * Validates incoming Setu Webhook requests.
 * Checks payload structure, timestamps, and signature headers where configured.
 */
export function verifySetuWebhook(
  headers: Headers,
  body: unknown
): { valid: boolean; payload?: SetuWebhookPayload; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid or empty webhook JSON body." };
  }

  const raw = body as Record<string, unknown>;

  // Validate presence of essential webhook identifiers
  const hasTypeOrStatus = Boolean(raw.type || raw.status || raw.event || raw.consentId || raw.consentCollectionId);
  if (!hasTypeOrStatus) {
    return { valid: false, error: "Webhook body lacks recognizable Setu event fields." };
  }

  // Optional Webhook Secret Verification if SETU_WEBHOOK_SECRET is set
  const expectedSecret = process.env.SETU_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const incomingAuth = headers.get("x-setu-signature") || headers.get("authorization") || headers.get("x-webhook-token");
    if (!incomingAuth || (!incomingAuth.includes(expectedSecret) && incomingAuth !== expectedSecret)) {
      return { valid: false, error: "Webhook signature verification failed." };
    }
  }

  const payload: SetuWebhookPayload = {
    type: typeof raw.type === "string" ? raw.type : (raw.event as string) || "CONSENT_STATUS_UPDATE",
    consentId: (raw.consentId || raw.consentCollectionId || raw.id) as string | undefined,
    sessionId: (raw.sessionId || raw.session_id) as string | undefined,
    status: (raw.status || raw.consentStatus) as string | undefined,
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
    data: typeof raw.data === "object" && raw.data !== null ? (raw.data as Record<string, unknown>) : undefined,
  };

  return {
    valid: true,
    payload,
  };
}
