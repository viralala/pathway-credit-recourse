import type { NextConfig } from "next";

/*
 * SECURITY HEADERS
 * ----------------
 * Sent on every response (pages, route handlers, metadata routes, static files).
 *
 * Content-Security-Policy: a static header, not a per-request nonce. The Next.js CSP guide is clear
 * that a nonce policy needs EVERY page to be dynamically rendered: a statically prerendered page
 * (the 404 page, the English-only legal pages, any client-only tool page) is built without a nonce,
 * and under 'strict-dynamic' its framework scripts would be blocked and the page would never hydrate.
 * The root layout is not dynamic, so a nonce would break real pages. Instead scripts are limited to
 * our own origin plus the inline bootstrap scripts Next.js writes ('unsafe-inline'); there is no
 * third-party script, frame, font or connection to allow. To move to nonces later: make the root
 * layout dynamic (await connection() or read headers()), then add proxy.ts from
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 *
 * Development (`next dev`) additionally needs 'unsafe-eval' (React rebuilds server error stacks with
 * eval) and websocket connections for hot reload.
 *
 * upgrade-insecure-requests and HSTS are production-only. upgrade-insecure-requests is limited to
 * HTTPS deployments (Vercel, or CSP_UPGRADE_INSECURE_REQUESTS=1 when self-hosting behind HTTPS),
 * because on `next start` over http://localhost it would rewrite every asset URL to https and break
 * the page.
 */
const isDev = process.env.NODE_ENV === "development";
const upgradeInsecure = !isDev && (process.env.VERCEL === "1" || process.env.CSP_UPGRADE_INSECURE_REQUESTS === "1");

const cspDirectives: string[][] = [
  ["default-src", "'self'"],
  ["script-src", "'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
  // Recharts and motion set inline style attributes; Next.js injects inline <style> for fonts.
  ["style-src", "'self'", "'unsafe-inline'"],
  ["img-src", "'self'", "data:", "blob:"],
  ["font-src", "'self'", "data:"],
  ["connect-src", "'self'", ...(isDev ? ["ws:", "wss:"] : [])],
  ["manifest-src", "'self'"],
  ["frame-src", "'none'"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'none'"],
  ...(upgradeInsecure ? [["upgrade-insecure-requests"]] : []),
];
const contentSecurityPolicy = cspDirectives.map((d) => d.join(" ")).join("; ");

/** Powerful browser features this site never uses, switched off for every frame. */
const permissionsPolicy = [
  "camera",
  "microphone",
  "geolocation",
  "payment",
  "usb",
  "serial",
  "hid",
  "bluetooth",
  "midi",
  "magnetometer",
  "gyroscope",
  "accelerometer",
  "display-capture",
  "idle-detection",
  "xr-spatial-tracking",
  "browsing-topics",
]
  .map((feature) => `${feature}=()`)
  .join(", ");

const securityHeaders: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // API responses are per-request and must never be cached or indexed (this also covers the
        // automatic 405 / OPTIONS responses that Next.js generates for route handlers).
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
