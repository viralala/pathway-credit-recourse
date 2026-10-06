import "server-only";
import { getSetuConfig } from "./config";

/**
 * Low-level HTTP client for Setu AA Gateway API.
 * Never logs or exposes credentials in outgoing logs or error traces.
 */
export async function setuFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  const config = getSetuConfig();
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("x-product-instance-id", config.productInstanceId);
  headers.set("client_id", config.clientId);
  headers.set("client_secret", config.clientSecret);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const status = response.status;
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok) {
      const errObj = json as { error?: { message?: string; code?: string }; message?: string } | null;
      const sanitizedMessage =
        errObj?.error?.message ||
        errObj?.message ||
        `Setu API returned HTTP error ${status}`;

      return {
        success: false,
        error: sanitizedMessage,
        status,
      };
    }

    return {
      success: true,
      data: json as T,
      status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error contacting Setu AA Gateway";
    return {
      success: false,
      error: message,
      status: 502,
    };
  }
}
