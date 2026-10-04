import { useSyncExternalStore } from "react";
import { CONSENT_COOKIE, CURSOR_STORAGE_KEY } from "./storage-keys";

/**
 * Cookie consent, kept deliberately small.
 *
 * Pathway sets no analytics, advertising or tracking cookies. There are two categories:
 *   - Strictly necessary (always on): the consent cookie itself, `pathway_consent`.
 *   - Functional (opt-in): remembering the money-cursor on/off choice in localStorage
 *     under `pathway_cursor`.
 *
 * The decision lives in a first-party cookie, value encodeURIComponent(JSON.stringify(
 * { v: 1, functional, ts })), Path=/, Max-Age 180 days, SameSite=Lax, Secure on https.
 * Withdrawing functional consent deletes `pathway_cursor`.
 *
 * Pure helpers (parse/serialize/cookie string) work anywhere; readConsent/writeConsent touch
 * `document` and are no-ops on the server. useConsent() is SSR-safe: it reports `ready: false`
 * on the server and during hydration, so consent UI renders nothing until the browser is known.
 */

export { CONSENT_COOKIE, CURSOR_STORAGE_KEY };
export const CONSENT_VERSION = 1;
/** 180 days, in seconds. */
export const CONSENT_MAX_AGE = 15_552_000;
/** Window event that asks the consent dialog to open (see openConsentSettings). */
export const OPEN_CONSENT_EVENT = "pathway:open-consent";

export interface Consent {
  v: typeof CONSENT_VERSION;
  functional: boolean;
  /** ISO-8601 time the decision was made. */
  ts: string;
}

/** The cookie value: encodeURIComponent(JSON.stringify(consent)). */
export function serializeConsent(consent: Consent): string {
  return encodeURIComponent(JSON.stringify({ v: consent.v, functional: consent.functional, ts: consent.ts }));
}

/** Parses a raw (URI-encoded) cookie value. Anything malformed or from another version is treated as "no decision". */
export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    if (d.v !== CONSENT_VERSION || typeof d.functional !== "boolean" || typeof d.ts !== "string") return null;
    if (Number.isNaN(Date.parse(d.ts))) return null;
    return { v: CONSENT_VERSION, functional: d.functional, ts: d.ts };
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

/** The full `document.cookie` assignment string for a decision. */
export function consentCookie(consent: Consent, secure: boolean): string {
  return `${CONSENT_COOKIE}=${serializeConsent(consent)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

export function makeConsent(functional: boolean, now: Date = new Date()): Consent {
  return { v: CONSENT_VERSION, functional, ts: now.toISOString() };
}

/**
 * The stored decision, or null when none was made (or it is unreadable / outdated).
 * Pass a cookie string to read from it instead of document.cookie (for example a request's
 * Cookie header on the server). Without one, returns null on the server.
 */
export function readConsent(cookies?: string): Consent | null {
  if (cookies !== undefined) return parseConsent(consentValueFrom(cookies));
  if (typeof document === "undefined") return null;
  return parseConsent(consentValueFrom(document.cookie));
}

/** True only when the visitor explicitly allowed functional storage. */
export function hasFunctionalConsent(): boolean {
  return getConsentSnapshot()?.functional === true;
}

/* ---------------------------------------------------------------------------------------------
 * Tiny external store so every component sees the same decision without a context provider.
 * ------------------------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Consent | null } = { raw: null, value: null };

/** Cached client snapshot: the same object is returned until the cookie value changes. */
export function getConsentSnapshot(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = consentValueFrom(document.cookie);
  if (raw !== cache.raw) cache = { raw, value: parseConsent(raw) };
  return cache.value;
}

function emit() {
  for (const l of [...listeners]) l();
}

/** Subscribe to consent changes in this tab (and re-check when the tab regains focus). */
export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("focus", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("focus", listener);
  };
}

/**
 * Store a decision. Withdrawing functional consent deletes the remembered money-cursor choice.
 * Returns the stored decision.
 */
export function writeConsent(functional: boolean): Consent {
  const consent = makeConsent(functional);
  if (typeof document === "undefined") return consent;
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = consentCookie(consent, secure);
  if (!functional) {
    try {
      localStorage.removeItem(CURSOR_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode, blocked site data). Nothing to delete then.
    }
  }
  emit();
  return consent;
}

/** Ask the cookie settings dialog to open (used by the footer's "Cookie settings" button). */
export function openConsentSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

const serverSnapshot = (): Consent | null | undefined => undefined;

/**
 * React hook for the current decision.
 *   ready      false on the server and during hydration: render nothing consent-related yet.
 *   consent    the decision, or null when the visitor has not chosen.
 *   functional true only when functional storage was allowed.
 */
export function useConsent(): { ready: boolean; consent: Consent | null; functional: boolean } {
  const snap = useSyncExternalStore<Consent | null | undefined>(subscribeConsent, getConsentSnapshot, serverSnapshot);
  return { ready: snap !== undefined, consent: snap ?? null, functional: snap?.functional === true };
}
