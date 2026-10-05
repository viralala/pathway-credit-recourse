/**
 * Where a `next` parameter may send somebody after sign-in: a path on this site, and nothing else.
 *
 * "Starts with one slash, not two" is not enough, because browsers disagree with it: a backslash
 * counts as a slash (`/\evil.example` is `//evil.example`) and tabs or newlines inside a URL are
 * dropped (`/<tab>/evil.example` is `//evil.example`). So the value is resolved the way a browser
 * would, against a fixed origin, and accepted only if it is still on that origin. Anything with a
 * backslash or a control character is refused first, because no path this site writes has one.
 */
const BASE = "https://pathway.invalid";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.length > 2048) return null;
  if (/[\\\p{Cc}]/u.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (path.startsWith("//")) return null;
  // Never bounce back into the sign-in machinery itself.
  if (url.pathname.startsWith("/auth/") || url.pathname === "/signin") return null;
  return path;
}
