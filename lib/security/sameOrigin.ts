/**
 * Same-origin check for state-changing or cost-incurring endpoints.
 *
 * A browser always sends `Origin` on a cross-origin request and on same-origin POST/fetch calls, and
 * modern browsers also send `Sec-Fetch-Site`. The request is accepted only when the Origin's host
 * equals the host the request was sent to. A request with neither header (curl, scripts) is
 * rejected: the endpoint exists for the Pathway page, not as a public API.
 */
export function isSameOriginRequest(headers: Headers): boolean {
  const fetchSite = headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = headers.get("origin")?.trim();
  if (!origin) return fetchSite === "same-origin";
  if (origin === "null") return false;

  let originHost: string;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    originHost = url.host.toLowerCase();
  } catch {
    return false;
  }

  return requestHosts(headers).includes(originHost);
}

/** Hosts this request was addressed to: `Host` and, behind a proxy, the first `X-Forwarded-Host`. */
export function requestHosts(headers: Headers): string[] {
  const hosts = [headers.get("host"), headers.get("x-forwarded-host")?.split(",")[0]];
  return hosts.map((h) => h?.trim().toLowerCase()).filter((h): h is string => Boolean(h));
}
