import { describe, expect, it } from "vitest";
import { LANGS } from "../i18n";
import { PROFILE_FIELDS, PROFILE_FIELD_KEYS } from "../schemes/schema";
import { SCHEME_STRINGS, schemeStrings } from "../strings/schemes";

/** Every leaf path in a nested strings object, e.g. "card.types.loan". */
function leafPaths(v: unknown, prefix = ""): string[] {
  if (typeof v !== "object" || v === null) return [prefix];
  return Object.entries(v as Record<string, unknown>)
    .flatMap(([k, child]) => leafPaths(child, prefix ? `${prefix}.${k}` : k))
    .sort();
}

/** Every string in a nested strings object. */
function leafStrings(v: unknown, path = ""): { path: string; text: string }[] {
  if (typeof v === "string") return [{ path, text: v }];
  if (typeof v !== "object" || v === null) return [];
  return Object.entries(v).flatMap(([k, c]) => leafStrings(c, path ? `${path}.${k}` : k));
}

describe("scheme strings", () => {
  it("define the same keys in every language", () => {
    const en = leafPaths(SCHEME_STRINGS.en);
    for (const l of LANGS) expect(leafPaths(SCHEME_STRINGS[l.id])).toEqual(en);
  });

  it("leave no string empty", () => {
    for (const l of LANGS) {
      const empty = leafStrings(SCHEME_STRINGS[l.id])
        .filter((x) => x.text.trim() === "")
        .map((x) => `${l.id}.${x.path}`);
      expect(empty).toEqual([]);
    }
  });

  it("returns the strings of the requested language", () => {
    for (const l of LANGS) expect(schemeStrings(l.id)).toBe(SCHEME_STRINGS[l.id]);
  });

  it("labels every profile field in every language", () => {
    for (const l of LANGS) {
      const fields = SCHEME_STRINGS[l.id].fields;
      for (const key of PROFILE_FIELD_KEYS) {
        expect(fields[key]?.label?.trim(), `${l.id}.fields.${key}.label`).toBeTruthy();
        expect(fields[key]?.hint?.trim(), `${l.id}.fields.${key}.hint`).toBeTruthy();
      }
      // No label for a field that does not exist.
      expect(Object.keys(fields).sort()).toEqual([...PROFILE_FIELD_KEYS].sort());
    }
  });

  it("labels every option of every choice field in every language", () => {
    for (const l of LANGS) {
      const options = SCHEME_STRINGS[l.id].options as Record<string, Record<string, string>>;
      for (const [key, spec] of Object.entries(PROFILE_FIELDS)) {
        if (spec.type !== "enum") continue;
        const values = (spec as { values: readonly string[] }).values;
        for (const value of values) expect(options[key]?.[value]?.trim(), `${l.id}.options.${key}.${value}`).toBeTruthy();
        expect(Object.keys(options[key] ?? {}).sort()).toEqual([...values].sort());
      }
    }
  });

  it("keeps the {placeholders} the same in every language", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const en = Object.fromEntries(leafStrings(SCHEME_STRINGS.en).map((x) => [x.path, placeholders(x.text)]));
    for (const l of LANGS) {
      for (const x of leafStrings(SCHEME_STRINGS[l.id])) expect(placeholders(x.text), `${l.id}.${x.path}`).toEqual(en[x.path]);
    }
  });

  it("never promises or implies a result", () => {
    const banned = [
      // English
      /guarantee/i,
      /pre-?approved/i,
      /will be approved/i,
      /chance of approval/i,
      /\bapproved\b/i,
      /\beligible\b/i,
      /\bqualif/i,
      /you will get/i,
      // Hindi
      /गारंटी|गारण्टी/,
      /पूर्व-?\s?स्वीकृत|पहले से स्वीकृत/,
      /स्वीकृत हो जाएगा|मंज़ूर हो जाएगा|मंजूर हो जाएगा|मंज़ूर होगा/,
      /मंज़ूरी की संभावना|मंजूरी की संभावना/,
      // Marathi
      // A word that starts with हमी ("नेहमीप्रमाणे" contains it mid-word and is fine).
      /(^|[^ऀ-ॿ])हमी/,
      /पूर्वमंजूर|पूर्व-?\s?मंजूर/,
      /मंजूर होईल|मंजूर केले जाईल/,
      /मंजुरीची शक्यता|मंजूरीची शक्यता/,
    ];
    for (const l of LANGS) {
      for (const { path, text } of leafStrings(SCHEME_STRINGS[l.id])) {
        for (const re of banned) expect(text, `${l.id}.${path} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it("names no real scheme: schemes come only from the directory", () => {
    const names = /pmegp|mudra|cgtmse|vishwakarma|stand-?\s?up india|मुद्रा योजना|विश्वकर्मा/i;
    for (const l of LANGS) {
      for (const { path, text } of leafStrings(SCHEME_STRINGS[l.id])) expect(text, `${l.id}.${path}`).not.toMatch(names);
    }
  });

  it("states in every language that a match is not an approval or an offer, and that Pathway is unaffiliated", () => {
    // Structure, not wording: the disclaimer block must keep all five statements.
    for (const l of LANGS) {
      const d = SCHEME_STRINGS[l.id].disclaimer;
      expect(Object.keys(d).sort()).toEqual(["affiliation", "changes", "decides", "information", "match", "title"]);
    }
  });
});
