import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  consentValueFrom,
  dismissNotice,
  getNoticeSnapshot,
  noticeCookie,
  parseNotice,
  serializeNotice,
  subscribeNotice,
} from "../consent";

/** A cookie jar that behaves like document.cookie. */
function fakeBrowser(protocol = "https:") {
  const jar = new Map<string, string>();
  const writes: string[] = [];
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
  vi.stubGlobal("document", doc);
  vi.stubGlobal("location", { protocol });
  return { jar, writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cookie notice format", () => {
  it("round-trips through serialize and parse", () => {
    const seen = { v: 2, ts: "2026-10-05T10:00:00.000Z" };
    expect(parseNotice(serializeNotice(seen))).toEqual(seen);
  });

  it("accepts the old version 1 consent cookie as already seen", () => {
    const v1 = encodeURIComponent(JSON.stringify({ v: 1, functional: false, ts: "2026-10-04T10:00:00.000Z" }));
    expect(parseNotice(v1)).toEqual({ v: 1, ts: "2026-10-04T10:00:00.000Z" });
  });

  it("treats malformed or unknown values as not seen", () => {
    for (const raw of [null, "", "%", "not-json", encodeURIComponent("[]"), encodeURIComponent(JSON.stringify({ v: 9, ts: "2026-10-04T10:00:00Z" })), encodeURIComponent(JSON.stringify({ v: 2, ts: "yesterday" }))]) {
      expect(parseNotice(raw)).toBeNull();
    }
  });

  it("builds the exact cookie attributes (180 days, Lax, Secure only on https)", () => {
    const seen = { v: 2, ts: "2026-10-05T10:00:00.000Z" };
    expect(noticeCookie(seen, true)).toBe(`${CONSENT_COOKIE}=${serializeNotice(seen)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax; Secure`);
    expect(noticeCookie(seen, false)).not.toContain("Secure");
    expect(CONSENT_MAX_AGE).toBe(180 * 24 * 60 * 60);
  });

  it("finds the cookie among others", () => {
    expect(consentValueFrom(`a=1; ${CONSENT_COOKIE}=xyz; b=2`)).toBe("xyz");
    expect(consentValueFrom("a=1")).toBeNull();
  });
});

describe("dismissing the notice", () => {
  it("returns null when there is no document (server)", () => {
    expect(getNoticeSnapshot()).toBeNull();
  });

  it("stores the dismissal and notifies subscribers", () => {
    const { writes } = fakeBrowser();
    const calls: number[] = [];
    const off = subscribeNotice(() => calls.push(1));
    expect(getNoticeSnapshot()).toBeNull();
    dismissNotice(new Date("2026-10-05T10:00:00.000Z"));
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("; Secure");
    expect(getNoticeSnapshot()).toEqual({ v: 2, ts: "2026-10-05T10:00:00.000Z" });
    expect(calls).toHaveLength(1);
    off();
  });

  it("omits Secure on plain http (local development)", () => {
    const { writes } = fakeBrowser("http:");
    dismissNotice();
    expect(writes[0]).not.toContain("Secure");
  });

  it("returns a stable snapshot until the cookie changes", () => {
    fakeBrowser();
    dismissNotice(new Date("2026-10-05T10:00:00.000Z"));
    const a = getNoticeSnapshot();
    expect(getNoticeSnapshot()).toBe(a);
    dismissNotice(new Date("2026-10-06T10:00:00.000Z"));
    expect(getNoticeSnapshot()).not.toBe(a);
  });
});
