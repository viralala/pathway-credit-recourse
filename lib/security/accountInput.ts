import type { Lang } from "@/lib/i18n";
import type { Applicant } from "@/lib/types";
import { parseLang, sanitizeName, validateApplicant, type Validation } from "./validate";

/** Largest body the plan endpoints accept. A valid request is a few hundred bytes. */
export const MAX_PLAN_BODY_BYTES = 4096;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/** UUID v1 to v8, the shape of every id Postgres gen_random_uuid() produces. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export interface SavePlanRequest {
  name: string;
  applicant: Applicant;
  lang: Lang;
}

/** POST /api/plans body: `{ name?, applicant, lang? }`. The name is sanitized, never rejected. */
export function parseSavePlan(body: unknown): Validation<SavePlanRequest> {
  if (!isPlainObject(body)) return { ok: false, error: "body" };
  const applicant = validateApplicant(body.applicant);
  if (!applicant.ok) return applicant;
  if (body.name !== undefined && typeof body.name !== "string") return { ok: false, error: "name" };
  const lang = parseLang(body.lang);
  if (!lang.ok) return lang;
  return { ok: true, value: { name: sanitizeName(body.name, "My plan"), applicant: applicant.value, lang: lang.value } };
}

/** POST /api/plans/[id]/checkins body: `{ applicant }`. */
export function parseCheckin(body: unknown): Validation<{ applicant: Applicant }> {
  if (!isPlainObject(body)) return { ok: false, error: "body" };
  const applicant = validateApplicant(body.applicant);
  if (!applicant.ok) return applicant;
  return { ok: true, value: { applicant: applicant.value } };
}

export const ENQUIRY_KINDS = ["lender", "fintech", "regulator", "other"] as const;
export type EnquiryKind = (typeof ENQUIRY_KINDS)[number];

export interface Enquiry {
  name: string;
  organisation: string;
  email: string;
  kind: EnquiryKind;
  message: string;
}

export type EnquiryField = keyof Enquiry;

/** Limits mirror the database checks in supabase/migrations. */
export const ENQUIRY_LIMITS = { name: 80, organisation: 120, email: 254, message: 2000 } as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Collapses whitespace and strips control characters (newlines kept only in the message). */
const clean = (v: unknown, multiline = false): string =>
  typeof v === "string"
    ? v
        .normalize("NFC")
        .replace(multiline ? /[^\P{Cc}\n]/gu : /\p{Cc}/gu, multiline ? "" : " ")
        .replace(multiline ? /[ \t]+/g : /\s+/g, " ")
        .trim()
    : "";

/** The partner enquiry form. Returns every field error at once so the form can show them all. */
export function parseEnquiry(input: Record<string, unknown>): { ok: true; value: Enquiry } | { ok: false; errors: Partial<Record<EnquiryField, string>> } {
  const name = clean(input.name);
  const organisation = clean(input.organisation);
  const email = clean(input.email).toLowerCase();
  const kind = clean(input.kind);
  const message = clean(input.message, true);
  const errors: Partial<Record<EnquiryField, string>> = {};
  if (!name || Array.from(name).length > ENQUIRY_LIMITS.name) errors.name = "name";
  if (!organisation || Array.from(organisation).length > ENQUIRY_LIMITS.organisation) errors.organisation = "organisation";
  if (email.length < 3 || email.length > ENQUIRY_LIMITS.email || !EMAIL.test(email)) errors.email = "email";
  if (!(ENQUIRY_KINDS as readonly string[]).includes(kind)) errors.kind = "kind";
  if (Array.from(message).length > ENQUIRY_LIMITS.message) errors.message = "message";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, organisation, email, kind: kind as EnquiryKind, message } };
}
