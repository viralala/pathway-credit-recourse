import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CURSOR_STORAGE_KEY,
  OPEN_CONSENT_EVENT,
  consentCookie,
  consentValueFrom,
  getConsentSnapshot,
  makeConsent,
  openConsentSettings,
  parseConsent,
  readConsent,
  serializeConsent,
  subscribeConsent,
  writeConsent,
} from "../consent";

/** Minimal browser stand-ins: a cookie jar that behaves like document.cookie, plus localStorage. */
function fakeBrowser(protocol = "https:") {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  const store = new Map<string, string>();
  const doc = {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(line: string) {
      writes.push(line);
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
    },
  };
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const events = new EventTarget();
  const win = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("location", { protocol });
  vi.stubGlobal("window", win);
  return { jar, writes, store, win };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent cookie format", () => {
  it("round-trips through serialize and parse", () => {
    const c = makeConsent(true, new Date("2026-10-04T10:00:00.000Z"));
    expect(c).toEqual({ v: 1, functional: true, ts: "2026-10-04T10:00:00.000Z" });
    const raw = serializeConsent(c);
    expect(raw).toBe(encodeURIComponent(JSON.stringify(c)));
    expect(parseConsent(raw)).toEqual(c);
  });

  it("treats malformed, outdated or incomplete values as no decision", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("%E0%A4%A")).toBeNull(); // broken URI escape
    expect(parseConsent(encodeURIComponent("not json"))).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 2, functional: true, ts: "2026-01-01T00:00:00Z" })))).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 1, functional: "yes", ts: "2026-01-01T00:00:00Z" })))).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 1, functional: true, ts: "yesterday" })))).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify([1, 2])))).toBeNull();
  });

  it("builds the exact cookie attributes (180 days, Lax, Secure only on https)", () => {
    const c = makeConsent(false, new Date("2026-10-04T10:00:00.000Z"));
    expect(CONSENT_MAX_AGE).toBe(180 * 24 * 60 * 60);
    expect(consentCookie(c, true)).toBe(`pathway_consent=${serializeConsent(c)}; Path=/; Max-Age=15552000; SameSite=Lax; Secure`);
    expect(consentCookie(c, false)).not.toContain("Secure");
  });

  it("finds the consent cookie among others, including in a Cookie header", () => {
    const raw = serializeConsent(makeConsent(true));
    const header = `a=1; ${CONSENT_COOKIE}=${raw}; pathway_consent_old=x; b=2`;
    expect(consentValueFrom(header)).toBe(raw);
    expect(readConsent(header)?.functional).toBe(true);
    expect(readConsent("a=1; b=2")).toBeNull();
  });

  it("returns null when there is no document (server)", () => {
    expect(readConsent()).toBeNull();
    expect(getConsentSnapshot()).toBeNull();
  });
});

describe("writing and withdrawing consent", () => {
  it("stores the decision and notifies subscribers", () => {
    const { writes, win } = fakeBrowser("https:");
    const seen: number[] = [];
    const off = subscribeConsent(() => seen.push(1));
    expect(readConsent()).toBeNull();
    writeConsent(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/^pathway_consent=.+; Path=\/; Max-Age=15552000; SameSite=Lax; Secure$/);
    expect(readConsent()?.functional).toBe(true);
    expect(seen).toHaveLength(1);
    // Focus re-checks the cookie (another tab may have changed it).
    win.dispatchEvent(new Event("focus"));
    expect(seen).toHaveLength(2);
    off();
    writeConsent(false);
    expect(seen).toHaveLength(2);
  });

  it("omits Secure on plain http (local development)", () => {
    const { writes } = fakeBrowser("http:");
    writeConsent(false);
    expect(writes[0]).not.toContain("Secure");
  });

  it("deletes the remembered cursor choice when functional consent is withdrawn", () => {
    const { store } = fakeBrowser();
    writeConsent(true);
    store.set(CURSOR_STORAGE_KEY, "off");
    writeConsent(true);
    expect(store.get(CURSOR_STORAGE_KEY)).toBe("off");
    writeConsent(false);
    expect(store.has(CURSOR_STORAGE_KEY)).toBe(false);
  });

  it("returns a stable snapshot until the cookie changes", () => {
    fakeBrowser();
    writeConsent(true);
    const a = getConsentSnapshot();
    expect(getConsentSnapshot()).toBe(a);
    writeConsent(false);
    expect(getConsentSnapshot()).not.toBe(a);
    expect(getConsentSnapshot()?.functional).toBe(false);
  });

  it("opens the settings dialog through a window event", () => {
    const { win } = fakeBrowser();
    const opened = vi.fn();
    win.addEventListener(OPEN_CONSENT_EVENT, opened);
    openConsentSettings();
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
