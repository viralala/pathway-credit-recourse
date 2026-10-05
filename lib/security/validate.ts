import type { Lang } from "@/lib/i18n";
import { PREPROCESSING } from "@/lib/model";
import { INR_PER_MODEL_UNIT } from "@/lib/money";
import type { Applicant, FeatureKey } from "@/lib/types";

/**
 * Smallest monthly income a person may enter: the first whole model unit above the model's placeholder
 * limit, in rupees. The model reads an income of 0 or 1 as "not provided" (ml/preprocess.py), which is how the
 * training data used those values, not something an applicant should be able to type in as an income.
 */
export const MIN_MONTHLY_INCOME = (PREPROCESSING.incomePlaceholderMax + 1) * INR_PER_MODEL_UNIT;

/**
 * Server-side input validation. Every limit mirrors the applicant form, so anything the UI can
 * produce is accepted and anything else is rejected before it reaches the model.
 */
export const APPLICANT_LIMITS: Record<FeatureKey, { min: number; max: number }> = {
  monthlyIncome: { min: MIN_MONTHLY_INCOME, max: 20_00_000 },
  utilization: { min: 0, max: 1.5 },
  debtRatio: { min: 0, max: 3 },
  openCreditLines: { min: 0, max: 30 },
  late30: { min: 0, max: 10 },
  late60: { min: 0, max: 10 },
  late90: { min: 0, max: 10 },
};

/** Counts of accounts and late payments: whole numbers only. */
const COUNT_KEYS: ReadonlySet<FeatureKey> = new Set<FeatureKey>(["openCreditLines", "late30", "late60", "late90"]);

export const NAME_MAX_LENGTH = 40;
export const NAME_FALLBACK = "Applicant";
const LANG_VALUES: readonly Lang[] = ["en", "hi", "mr"];

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/** Every field present, a finite number of type `number`, and inside the form's range. Extra keys are ignored. */
export function validateApplicant(input: unknown): Validation<Applicant> {
  if (!isPlainObject(input)) return { ok: false, error: "applicant" };
  const out = {} as Applicant;
  for (const [key, { min, max }] of Object.entries(APPLICANT_LIMITS) as [FeatureKey, { min: number; max: number }][]) {
    const v = input[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (COUNT_KEYS.has(key) && !Number.isInteger(v)))
      return { ok: false, error: `applicant.${key}` };
    out[key] = v;
  }
  return { ok: true, value: out };
}

/**
 * Display name: letters of any script (with their combining marks), spaces, and . ' - only.
 * Everything else is dropped, whitespace is collapsed, length is capped at 40 characters, and a
 * name with no letters left becomes "Applicant".
 */
export function sanitizeName(input: unknown, fallback: string = NAME_FALLBACK): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .normalize("NFC")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[‐‑‒–]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{M} .'-]/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();
  const capped = Array.from(cleaned).slice(0, NAME_MAX_LENGTH).join("").trim();
  return /\p{L}/u.test(capped) ? capped : fallback;
}

/** Missing means English; anything other than en/hi/mr is an error. */
export function parseLang(input: unknown): Validation<Lang> {
  if (input === undefined || input === null) return { ok: true, value: "en" };
  return typeof input === "string" && (LANG_VALUES as readonly string[]).includes(input)
    ? { ok: true, value: input as Lang }
    : { ok: false, error: "lang" };
}

export interface ExplainRequest {
  applicant: Applicant;
  name: string;
  lang: Lang;
}

/**
 * The /api/explain body: `{ applicant, name?, lang? }`. Other keys (for example a client-written
 * `text`) are ignored: the server never uses client-supplied prose.
 */
export function parseExplainRequest(body: unknown): Validation<ExplainRequest> {
  if (!isPlainObject(body)) return { ok: false, error: "body" };
  const applicant = validateApplicant(body.applicant);
  if (!applicant.ok) return applicant;
  if (body.name !== undefined && typeof body.name !== "string") return { ok: false, error: "name" };
  const lang = parseLang(body.lang);
  if (!lang.ok) return lang;
  return { ok: true, value: { applicant: applicant.value, name: sanitizeName(body.name), lang: lang.value } };
}

/** True for `application/json`, with or without parameters such as `; charset=utf-8`. */
export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  return value.split(";")[0].trim().toLowerCase() === "application/json";
}
