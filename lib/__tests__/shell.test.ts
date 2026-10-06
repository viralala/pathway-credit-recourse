import { describe, expect, it } from "vitest";
import { isActivePath, primaryNav, switchLangHref, withLang } from "@/components/site/nav";
import { LANGS } from "../i18n";
import { SHELL } from "../strings/shell";

/** Every key path of a nested strings object, e.g. "footer.terms". */
function keyPaths(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keyPaths(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("shell strings", () => {
  it("define the same keys in every language", () => {
    const en = keyPaths(SHELL.en).sort();
    for (const { id } of LANGS) expect(keyPaths(SHELL[id]).sort()).toEqual(en);
  });

  it("leave no string empty except the English legal note", () => {
    for (const { id } of LANGS) {
      for (const path of keyPaths(SHELL[id])) {
        const value = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], SHELL[id]);
        if (id === "en" && path === "footer.legalNote") continue;
        expect(String(value).trim(), `${id}.${path}`).not.toBe("");
      }
    }
  });

  it("builds the primary nav items in every language", () => {
    for (const { id } of LANGS) {
      const nav = primaryNav(id);
      expect(nav.map((n) => n.href)).toEqual(["/", "/goal", "/offer-check", "/fairness", "/report", "/schemes", "/method"]);
      for (const n of nav) expect(n.label.length).toBeGreaterThan(0);
    }
  });
});

describe("nav links", () => {
  it("adds ?lang= except for English, keeping query and hash", () => {
    expect(withLang("/", "en")).toBe("/");
    expect(withLang("/", "hi")).toBe("/?lang=hi");
    expect(withLang("/report?sample=b", "mr")).toBe("/report?sample=b&lang=mr");
    expect(withLang("/privacy#cookies", "hi")).toBe("/privacy?lang=hi#cookies");
    expect(withLang("/privacy?lang=hi#cookies", "en")).toBe("/privacy#cookies");
  });

  it("switches language on the current page and keeps other params", () => {
    expect(switchLangHref("/report", "sample=b", "hi")).toBe("/report?sample=b&lang=hi");
    expect(switchLangHref("/report", "sample=b&lang=hi", "en")).toBe("/report?sample=b");
    expect(switchLangHref("/", "lang=mr", "en")).toBe("/");
  });

  it("marks only the matching section as active", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/goal", "/")).toBe(false);
    expect(isActivePath("/report", "/report?sample=b")).toBe(true);
    expect(isActivePath("/goal/step", "/goal")).toBe(true);
    expect(isActivePath("/goals", "/goal")).toBe(false);
  });
});
