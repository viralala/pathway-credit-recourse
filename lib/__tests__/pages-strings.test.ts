import { describe, expect, it } from "vitest";
import { describeAssumptions } from "../config";
import { LANGS } from "../i18n";
import { assumptionItems, groupLabel, hrefWithLang, PAGES } from "../strings/pages";

/** Every leaf path in a nested strings object, e.g. "crumbs.home". */
function leafPaths(v: unknown, prefix = ""): string[] {
  if (typeof v !== "object" || v === null) return [prefix];
  return Object.entries(v as Record<string, unknown>)
    .flatMap(([k, child]) => leafPaths(child, prefix ? `${prefix}.${k}` : k))
    .sort();
}

describe("page strings (fairness, report, method)", () => {
  it("define the same keys in every language", () => {
    const en = leafPaths(PAGES.en);
    for (const l of LANGS) expect(leafPaths(PAGES[l.id])).toEqual(en);
  });

  it("leave no string empty", () => {
    const empty = (v: unknown, path: string): string[] =>
      typeof v === "string"
        ? v.trim() === ""
          ? [path]
          : []
        : typeof v === "object" && v !== null
          ? Object.entries(v).flatMap(([k, c]) => empty(c, `${path}.${k}`))
          : [];
    for (const l of LANGS) expect(empty(PAGES[l.id], l.id)).toEqual([]);
  });

  it("keeps the English assumption list identical to describeAssumptions()", () => {
    expect(assumptionItems("en").map(({ label, value }) => ({ label, value }))).toEqual(describeAssumptions());
    for (const l of LANGS) expect(assumptionItems(l.id)).toHaveLength(describeAssumptions().length);
  });

  it("localizes the evaluator's income band labels and leaves unknown ones alone", () => {
    expect(groupLabel("en", "Under $3,000/mo")).toContain("$3,000");
    expect(groupLabel("en", "$3,000–6,000/mo")).toContain("6,000");
    expect(groupLabel("en", "$6,000+/mo")).toContain("$6,000");
    for (const l of LANGS) {
      expect(groupLabel(l.id, "Under $3,000/mo")).toContain("$3,000");
      expect(groupLabel(l.id, "Something else")).toBe("Something else");
    }
  });

  it("adds ?lang= except for English and keeps existing query params", () => {
    expect(hrefWithLang("/fairness", "en")).toBe("/fairness");
    expect(hrefWithLang("/fairness", "hi")).toBe("/fairness?lang=hi");
    expect(hrefWithLang("/report?sample=approved", "mr")).toBe("/report?sample=approved&lang=mr");
    expect(hrefWithLang("/report?lang=hi", "mr")).toBe("/report?lang=mr");
  });
});
