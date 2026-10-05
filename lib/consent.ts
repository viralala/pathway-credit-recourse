import { useSyncExternalStore } from "react";
import { CONSENT_COOKIE } from "./storage-keys";

/**
 * The cookie notice, kept deliberately small.
 *
 * Pathway sets no analytics, advertising or tracking cookies, and stores nothing optional, so
 * there is nothing to opt in to: the banner is a notice, not a choice. Once dismissed, a
 * first-party cookie remembers that so the notice is not shown on every page. Signing in adds the
 * Supabase session cookies, which are strictly necessary for the account to work.
 *
 * Value: encodeURIComponent(JSON.stringify({ v: 2, ts })), Path=/, Max-Age 180 days,
 * SameSite=Lax, Secure on https. Version 1 cookies (from the old consent dialog) count as seen.
 *
 * useNoticeSeen() is SSR-safe: it reports `ready: false` on the server and during hydration, so the
 * notice renders nothing until the browser is known.
 */

export { CONSENT_COOKIE };
export const CONSENT_VERSION = 2;
/** 180 days, in seconds. */
export const CONSENT_MAX_AGE = 15_552_000;

export interface NoticeSeen {
  v: number;
  /** ISO-8601 time the notice was dismissed. */
  ts: string;
}

/** The cookie value: encodeURIComponent(JSON.stringify(seen)). */
export function serializeNotice(seen: NoticeSeen): string {
  return encodeURIComponent(JSON.stringify({ v: seen.v, ts: seen.ts }));
}

/** Parses a raw (URI-encoded) cookie value. Anything malformed is treated as "not seen". */
export function parseNotice(raw: string | null | undefined): NoticeSeen | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    if ((d.v !== 1 && d.v !== CONSENT_VERSION) || typeof d.ts !== "string") return null;
    if (Number.isNaN(Date.parse(d.ts))) return null;
    return { v: d.v, ts: d.ts };
  } catch {
    return null;
  }
}

/** Extracts the raw `pathway_consent` value from a cookie string such as document.cookie or a Cookie header. */
export function consentValueFrom(cookies: string): string | null {
  for (const part of cookies.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === CONSENT_COOKIE) return part.slice(eq + 1).trim();
  }
  return null;
}

/** The full `document.cookie` assignment string. */
export function noticeCookie(seen: NoticeSeen, secure: boolean): string {
  return `${CONSENT_COOKIE}=${serializeNotice(seen)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

/* ---------------------------------------------------------------------------------------------
 * Tiny external store so the notice hides as soon as it is dismissed, without a provider.
 * ------------------------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: NoticeSeen | null } = { raw: null, value: null };

/** Cached client snapshot: the same object is returned until the cookie value changes. */
export function getNoticeSnapshot(): NoticeSeen | null {
  if (typeof document === "undefined") return null;
  const raw = consentValueFrom(document.cookie);
  if (raw !== cache.raw) cache = { raw, value: parseNotice(raw) };
  return cache.value;
}

export function subscribeNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Remember that the notice was dismissed. */
export function dismissNotice(now: Date = new Date()): NoticeSeen {
  const seen: NoticeSeen = { v: CONSENT_VERSION, ts: now.toISOString() };
  if (typeof document === "undefined") return seen;
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = noticeCookie(seen, secure);
  for (const l of [...listeners]) l();
  return seen;
}

const serverSnapshot = (): NoticeSeen | null | undefined => undefined;

/** `ready` is false on the server and during hydration; `seen` is true once dismissed. */
export function useNoticeSeen(): { ready: boolean; seen: boolean } {
  const snap = useSyncExternalStore<NoticeSeen | null | undefined>(subscribeNotice, getNoticeSnapshot, serverSnapshot);
  return { ready: snap !== undefined, seen: !!snap };
}
