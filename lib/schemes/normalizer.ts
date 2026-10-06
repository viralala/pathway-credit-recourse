import { PROFILE_FIELDS, PROFILE_FIELD_KEYS } from "./schema";
import type { ApplicantSchemeProfile, ProfileFieldKey, ProfileFieldSpec } from "./types";

/**
 * Builds the profile the rules are evaluated against from whatever a request carried.
 *
 * Total and pure: it never throws, and it reads only the keys in PROFILE_FIELDS (plus the two
 * documented derivations). Credit fields on the same object are never looked at, which keeps scheme
 * matching independent of the credit model. Invalid values are dropped, not repaired: dropping means
 * "we do not know", while guessing could turn a missing answer into a wrong one.
 */

/** Counted in whole units; every other number field is a rupee amount. */
const WHOLE_NUMBER_FIELDS: ReadonlySet<ProfileFieldKey> = new Set<ProfileFieldKey>(["age", "educationClass"]);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** An own property, read defensively: a throwing getter or a Proxy trap must not break the engine. */
function read(obj: unknown, key: string): unknown {
  try {
    return isRecord(obj) && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
  } catch {
    return undefined;
  }
}

/** `v` as a valid value of `key`, or undefined. Whole-number fields are floored, rupee amounts rounded. */
function clean(key: ProfileFieldKey, v: unknown): number | string | boolean | undefined {
  const spec: ProfileFieldSpec = PROFILE_FIELDS[key];
  if (spec.type === "boolean") return typeof v === "boolean" ? v : undefined;
  if (spec.type === "enum") return typeof v === "string" && (spec.values ?? []).includes(v) ? v : undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (v < (spec.min ?? -Infinity) || v > (spec.max ?? Infinity)) return undefined;
  return (WHOLE_NUMBER_FIELDS.has(key) ? Math.floor(v) : Math.round(v)) + 0; // + 0 turns -0 into 0
}

/** A positive number from a form field the profile can be derived from, or undefined. */
const positive = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

export function normalizeProfile(input: {
  profile?: unknown;
  applicant?: { monthlyIncome?: unknown };
  goal?: { amount?: unknown };
}): ApplicantSchemeProfile {
  const raw = read(input, "profile");
  const values: Partial<Record<ProfileFieldKey, number | string | boolean>> = {};
  for (const key of PROFILE_FIELD_KEYS) {
    const v = clean(key, read(raw, key));
    if (v !== undefined) values[key] = v;
  }

  // Derived only when the profile did not already supply a valid value.
  if (values.annualIncome === undefined) {
    const monthly = positive(read(read(input, "applicant"), "monthlyIncome"));
    const yearly = monthly === undefined ? undefined : clean("annualIncome", monthly * 12);
    if (yearly !== undefined) values.annualIncome = yearly;
  }
  if (values.loanAmount === undefined) {
    const amount = positive(read(read(input, "goal"), "amount"));
    const loan = amount === undefined ? undefined : clean("loanAmount", amount);
    if (typeof loan === "number" && loan > 0) values.loanAmount = loan;
  }

  // Rebuilt in PROFILE_FIELD_KEYS order so the output is stable whatever order the input used.
  const out: Record<string, number | string | boolean> = {};
  for (const key of PROFILE_FIELD_KEYS) if (values[key] !== undefined) out[key] = values[key];
  return out as ApplicantSchemeProfile;
}
