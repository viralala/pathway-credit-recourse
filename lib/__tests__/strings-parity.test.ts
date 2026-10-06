import { describe, expect, it } from "vitest";
import { connectStrings } from "../strings/connect";
import { whatIfStrings } from "../strings/whatif";

/** Every key path in a strings object, with array lengths, so hi and mr must match en exactly. */
function shape(v: unknown, path = ""): string[] {
  if (Array.isArray(v)) return [`${path}[${v.length}]`, ...v.flatMap((x, i) => (typeof x === "object" ? shape(x, `${path}[${i}]`) : []))];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, path ? `${path}.${k}` : k));
  return [`${path}:${typeof v}`];
}

describe.each([
  ["whatIf", whatIfStrings],
  ["connect", connectStrings],
] as const)("%s strings", (_name, get) => {
  it.each(["hi", "mr"] as const)("%s matches en key for key", (lang) => {
    expect(shape(get(lang)).sort()).toEqual(shape(get("en")).sort());
  });
  it("has no em dashes or empty strings", () => {
    for (const lang of ["en", "hi", "mr"] as const) {
      const json = JSON.stringify(get(lang));
      expect(json).not.toContain("\u2014");
      expect(json).not.toContain('""');
    }
  });
});
