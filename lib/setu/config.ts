import "server-only";
import type { SetuConfig } from "./types";

/**
 * Setu AA Server-Only Configuration Layer.
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Credentials must NEVER be bundled into client-side code.
 * - Variables MUST NOT be prefixed with NEXT_PUBLIC_.
 * - Credentials MUST NOT be logged or echoed in API responses.
 * - Missing credentials fail gracefully with sanitized error descriptors.
 */

const DEFAULT_SANDBOX_BASE_URL = "https://fiu-sandbox.setu.co";

/**
 * Validates whether Setu AA credentials are present in the server environment.
 */
export function isSetuConfigured(): boolean {
  const clientId = process.env.SETU_CLIENT_ID?.trim();
  const clientSecret = process.env.SETU_CLIENT_SECRET?.trim();
  const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID?.trim();

  return Boolean(clientId && clientSecret && productInstanceId);
}

/**
 * Returns the Setu configuration for server execution.
 * Throws a sanitized configuration error if required environment variables are missing.
 */
export function getSetuConfig(): SetuConfig {
  const clientId = process.env.SETU_CLIENT_ID?.trim();
  const clientSecret = process.env.SETU_CLIENT_SECRET?.trim();
  const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID?.trim();
  const baseUrl = (process.env.SETU_BASE_URL?.trim() || DEFAULT_SANDBOX_BASE_URL).replace(/\/$/, "");

  if (!clientId || !clientSecret || !productInstanceId) {
    const missing: string[] = [];
    if (!clientId) missing.push("SETU_CLIENT_ID");
    if (!clientSecret) missing.push("SETU_CLIENT_SECRET");
    if (!productInstanceId) missing.push("SETU_PRODUCT_INSTANCE_ID");

    throw new Error(
      `Setu Account Aggregator is not properly configured. Missing required server environment variables: ${missing.join(", ")}`
    );
  }

  return {
    clientId,
    clientSecret,
    productInstanceId,
    baseUrl,
  };
}

/**
 * Safe metadata for UI/debugging without leaking secret values.
 */
export function getSafeSetuStatus() {
  const configured = isSetuConfigured();
  const baseUrl = process.env.SETU_BASE_URL?.trim() || DEFAULT_SANDBOX_BASE_URL;
  const isSandbox = baseUrl.includes("sandbox");

  return {
    configured,
    environment: isSandbox ? ("sandbox" as const) : ("production" as const),
    baseUrl: isSandbox ? DEFAULT_SANDBOX_BASE_URL : "https://fiu.setu.co",
  };
}
