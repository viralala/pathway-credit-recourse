import { PROFILE_FIELDS } from "@/lib/schemes/schema";
import type { ApplicantSchemeProfile, ProfileFieldKey } from "@/lib/schemes/types";

/**
 * What each scheme question looks like on the form, and how the typed answers become the `profile`
 * sent to the server. The field list and the allowed values come from PROFILE_FIELDS (the same table
 * the server validates against); this file only decides layout.
 */

export type QuestionKind = "number" | "choice" | "yesno" | "education";

export interface Question {
  key: ProfileFieldKey;
  kind: QuestionKind;
  /** Number questions: shown as a prefix and spoken in the label. */
  unit?: "rupees";
  /** Whole numbers only (an age is not 31.5). */
  integer?: boolean;
}

/** The questions most schemes depend on, shown first. */
export const PRIMARY_QUESTIONS: Question[] = [
  { key: "businessStage", kind: "choice" },
  { key: "sector", kind: "choice" },
  { key: "loanAmount", kind: "number", unit: "rupees" },
  { key: "projectCost", kind: "number", unit: "rupees" },
  { key: "age", kind: "number", integer: true },
  { key: "areaType", kind: "choice" },
];

/** Behind "More details (optional)". The two sensitive questions come first, with their note. */
export const MORE_QUESTIONS: Question[] = [
  { key: "gender", kind: "choice" },
  { key: "socialCategory", kind: "choice" },
  { key: "enterpriseForm", kind: "choice" },
  { key: "educationClass", kind: "education" },
  { key: "isTraditionalArtisan", kind: "yesno" },
  { key: "hasAvailedGovtSubsidy", kind: "yesno" },
  { key: "hasSimilarSchemeLoan", kind: "yesno" },
  { key: "isGovernmentEmployee", kind: "yesno" },
  { key: "hasLoanDefault", kind: "yesno" },
];

export const SENSITIVE_KEYS: readonly ProfileFieldKey[] = ["gender", "socialCategory"];
const MORE_KEYS = new Set<ProfileFieldKey>(MORE_QUESTIONS.map((q) => q.key));
const ASKED_KEYS = new Set<ProfileFieldKey>([...PRIMARY_QUESTIONS, ...MORE_QUESTIONS].map((q) => q.key));

export const isAsked = (key: ProfileFieldKey) => ASKED_KEYS.has(key);
export const isInMore = (key: ProfileFieldKey) => MORE_KEYS.has(key);

/**
 * What the person has typed or chosen, as strings. A missing or empty entry means "not known".
 * Number questions hold the typed text, choice questions the option value, yes/no questions "yes" or "no".
 */
export type Answers = Partial<Record<ProfileFieldKey, string>>;

/** Highest class options: 0 (none), 1 to 12, and 15 (graduate or above). */
export const EDUCATION_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15] as const;

export interface BuiltProfile {
  /** Only the fields the person filled in, each in range. Never null, never an empty string. */
  profile: ApplicantSchemeProfile;
  /** Number questions whose text is not a valid number in range. */
  invalid: ProfileFieldKey[];
}

/** Turn the typed answers into a profile, leaving out everything not answered. */
export function buildProfile(answers: Answers, questions: Question[]): BuiltProfile {
  const out: Record<string, string | number | boolean> = {};
  const invalid: ProfileFieldKey[] = [];

  for (const q of questions) {
    const raw = (answers[q.key] ?? "").trim();
    if (raw === "") continue;
    const spec = PROFILE_FIELDS[q.key];

    if (q.kind === "yesno") {
      if (raw === "yes") out[q.key] = true;
      else if (raw === "no") out[q.key] = false;
    } else if (q.kind === "choice") {
      if (spec.type === "enum" && (spec.values as readonly string[]).includes(raw)) out[q.key] = raw;
    } else {
      const n = Number(raw);
      const min = "min" in spec ? (spec.min ?? 0) : 0;
      const max = "max" in spec ? (spec.max ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      if (!Number.isFinite(n) || n < min || n > max || (q.integer && !Number.isInteger(n))) invalid.push(q.key);
      else out[q.key] = q.kind === "number" && q.unit === "rupees" ? Math.round(n) : n;
    }
  }
  return { profile: out as ApplicantSchemeProfile, invalid };
}

/** Bounds of a number question, for the inline error and the input's min/max. */
export function boundsOf(key: ProfileFieldKey): { min: number; max: number } {
  const spec = PROFILE_FIELDS[key];
  return { min: "min" in spec ? (spec.min ?? 0) : 0, max: "max" in spec ? (spec.max ?? 0) : 0 };
}
