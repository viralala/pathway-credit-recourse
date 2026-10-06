import { z } from "zod";
import type {
  ApplicantSchemeProfile,
  Criterion,
  EligibilityRule,
  EligibilityRules,
  ProfileFieldKey,
  ProfileFieldSpec,
  Scheme,
} from "./types";

/**
 * Runtime validation for everything that crosses a boundary: a row read from
 * `government_schemes`, the seed file, and a profile sent to /api/schemes/match.
 * The TypeScript shapes live in ./types; this file is their runtime twin.
 */

/** Every field a rule may refer to, with the values it can take. The single list: rules, the API and the form all read it. */
export const PROFILE_FIELDS = {
  age: { type: "number", min: 0, max: 120 },
  gender: { type: "enum", values: ["female", "male", "other"] },
  socialCategory: { type: "enum", values: ["general", "obc", "sc", "st", "minority"] },
  areaType: { type: "enum", values: ["rural", "urban"] },
  businessStage: { type: "enum", values: ["new", "existing"] },
  sector: { type: "enum", values: ["manufacturing", "services", "trading", "agri_allied"] },
  enterpriseForm: { type: "enum", values: ["individual", "proprietorship", "partnership", "company", "shg", "cooperative", "trust"] },
  educationClass: { type: "number", min: 0, max: 15 },
  loanAmount: { type: "number", min: 0, max: 1_000_000_000 },
  projectCost: { type: "number", min: 0, max: 1_000_000_000 },
  annualIncome: { type: "number", min: 0, max: 1_000_000_000 },
  isTraditionalArtisan: { type: "boolean" },
  hasAvailedGovtSubsidy: { type: "boolean" },
  hasSimilarSchemeLoan: { type: "boolean" },
  isGovernmentEmployee: { type: "boolean" },
  hasLoanDefault: { type: "boolean" },
} as const satisfies Record<ProfileFieldKey, ProfileFieldSpec>;

export const PROFILE_FIELD_KEYS = Object.keys(PROFILE_FIELDS) as ProfileFieldKey[];

/** Limits on a rule document, so a bad row cannot make evaluation expensive. */
export const RULE_LIMITS = { maxDepth: 5, maxCriteria: 40, maxPreferred: 10 } as const;

// ---------------------------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------------------------

function fieldSchema(spec: ProfileFieldSpec): z.ZodType {
  if (spec.type === "boolean") return z.boolean();
  if (spec.type === "enum") return z.enum(spec.values as [string, ...string[]]);
  return z.number().min(spec.min ?? 0).max(spec.max ?? Number.MAX_SAFE_INTEGER);
}

/** A profile: any subset of the known fields, each in range. Unknown keys are rejected. */
export const profileSchema = z.strictObject(
  Object.fromEntries(PROFILE_FIELD_KEYS.map((k) => [k, fieldSchema(PROFILE_FIELDS[k]).optional()])),
) as unknown as z.ZodType<ApplicantSchemeProfile>;

/** POST /api/schemes/match body. */
export const matchRequestSchema = z.strictObject({
  profile: profileSchema.optional(),
  applicant: z.object({ monthlyIncome: z.number().min(0).max(20_00_000).optional() }).optional(),
  goal: z.object({ amount: z.number().min(0).max(1_000_000_000).optional() }).optional(),
  save: z.boolean().optional(),
});

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const NUMERIC_OPS = ["gte", "lte", "gt", "lt"] as const;

/** Why a criterion's operator and value do not fit its field, or null when they do. */
export function criterionProblem(c: Pick<Criterion, "field" | "op" | "value">): string | null {
  const spec: ProfileFieldSpec | undefined = PROFILE_FIELDS[c.field];
  if (!spec) return `unknown field "${String(c.field)}"`;
  const { op, value } = c;
  const okScalar = (v: unknown) =>
    spec.type === "number" ? typeof v === "number" && Number.isFinite(v) : typeof v === "string" && (spec.values ?? []).includes(v);

  if (op === "is_true" || op === "is_false") {
    if (spec.type !== "boolean") return `${op} needs a boolean field`;
    return value === undefined ? null : `${op} takes no value`;
  }
  if (spec.type === "boolean") return "a boolean field takes is_true or is_false";
  if ((NUMERIC_OPS as readonly string[]).includes(op)) {
    return spec.type === "number" && okScalar(value) ? null : `${op} needs a number field and a number`;
  }
  if (op === "between") {
    const ok = spec.type === "number" && Array.isArray(value) && value.length === 2 && value.every(okScalar) && (value[0] as number) <= (value[1] as number);
    return ok ? null : "between needs a number field and [min, max]";
  }
  if (op === "in" || op === "not_in") {
    return Array.isArray(value) && value.length > 0 && value.every(okScalar) ? null : `${op} needs a non-empty list of allowed values`;
  }
  if (op !== "eq" && op !== "neq") return `unknown operator "${String(op)}"`;
  return okScalar(value) ? null : `${op} needs one allowed value`;
}

export const criterionSchema: z.ZodType<Criterion> = z
  .strictObject({
    type: z.literal("criterion"),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
    field: z.enum(PROFILE_FIELD_KEYS as [ProfileFieldKey, ...ProfileFieldKey[]]),
    op: z.enum(["eq", "neq", "in", "not_in", "gte", "lte", "gt", "lt", "between", "is_true", "is_false"]),
    value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]).optional(),
    label: z.string().trim().min(3).max(300),
    sourceRef: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((c, ctx) => {
    const problem = criterionProblem(c as Criterion);
    if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["value"] });
  }) as z.ZodType<Criterion>;

export const ruleSchema: z.ZodType<EligibilityRule> = z.lazy(() =>
  z.union([
    criterionSchema,
    z.strictObject({ type: z.literal("all"), rules: z.array(ruleSchema).min(1).max(RULE_LIMITS.maxCriteria) }),
    z.strictObject({ type: z.literal("any"), rules: z.array(ruleSchema).min(1).max(RULE_LIMITS.maxCriteria) }),
    z.strictObject({ type: z.literal("not"), rule: ruleSchema }),
  ]),
) as z.ZodType<EligibilityRule>;

/** Every criterion under a rule, in document order. */
export function criteriaOf(rule: EligibilityRule): Criterion[] {
  if (rule.type === "criterion") return [rule];
  if (rule.type === "not") return criteriaOf(rule.rule);
  return rule.rules.flatMap(criteriaOf);
}

export function depthOf(rule: EligibilityRule): number {
  if (rule.type === "criterion") return 1;
  if (rule.type === "not") return 1 + depthOf(rule.rule);
  return 1 + Math.max(0, ...rule.rules.map(depthOf));
}

export const eligibilityRulesSchema: z.ZodType<EligibilityRules> = z
  .strictObject({
    schemaVersion: z.literal(1),
    required: ruleSchema,
    preferred: z.array(criterionSchema).max(RULE_LIMITS.maxPreferred).optional(),
  })
  .superRefine((r, ctx) => {
    const required = criteriaOf(r.required);
    if (depthOf(r.required) > RULE_LIMITS.maxDepth) ctx.addIssue({ code: "custom", message: "rules nested too deep", path: ["required"] });
    if (required.length > RULE_LIMITS.maxCriteria) ctx.addIssue({ code: "custom", message: "too many criteria", path: ["required"] });
    const ids = [...required, ...(r.preferred ?? [])].map((c) => c.id);
    const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
    if (repeated) ctx.addIssue({ code: "custom", message: `criterion id "${repeated}" is used twice`, path: ["required"] });
  }) as z.ZodType<EligibilityRules>;

// ---------------------------------------------------------------------------------------------
// Scheme rows
// ---------------------------------------------------------------------------------------------

const httpsUrl = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "must be an https URL");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Postgres `numeric` arrives as a string; a JSON seed has numbers. */
const rupees = z.coerce.number().min(0).max(1_000_000_000_000);

/**
 * One row of `public.government_schemes`, exactly as the database returns it (snake_case).
 * The migration's columns must match these names.
 */
export const schemeRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,59}$/),
  version: z.number().int().min(1),
  is_current: z.boolean(),
  status: z.enum(["draft", "active", "retired"]),
  name: z.string().trim().min(3).max(200),
  short_name: z.string().trim().min(2).max(40),
  scheme_type: z.enum(["loan", "credit_guarantee", "credit_linked_subsidy", "composite"]),
  summary: z.string().trim().min(10).max(1000),
  benefits: z.array(z.string().trim().min(3).max(400)).max(12),
  implementing_agency: z.string().trim().min(2).max(200),
  ministry: z.string().trim().min(2).max(200).nullable(),
  min_loan_amount: rupees.nullable(),
  max_loan_amount: rupees.nullable(),
  eligibility_rules: eligibilityRulesSchema,
  how_to_apply: z.string().trim().min(3).max(1000).nullable(),
  application_url: httpsUrl.nullable(),
  official_url: httpsUrl,
  sources: z.array(z.strictObject({ title: z.string().trim().min(2).max(200), url: httpsUrl })).min(1).max(8),
  last_verified_at: isoDate,
  verification_status: z.enum(["verified", "unverified"]),
  effective_from: isoDate.nullable(),
});

export type SchemeRow = z.infer<typeof schemeRowSchema>;

/** The seed file: the same columns without the ones the database fills in. */
export const schemeSeedSchema = schemeRowSchema.omit({ id: true, is_current: true });
export type SchemeSeed = z.infer<typeof schemeSeedSchema>;

export function schemeFromRow(row: SchemeRow): Scheme {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    isCurrent: row.is_current,
    status: row.status,
    name: row.name,
    shortName: row.short_name,
    schemeType: row.scheme_type,
    summary: row.summary,
    benefits: row.benefits,
    implementingAgency: row.implementing_agency,
    ministry: row.ministry,
    minLoanAmount: row.min_loan_amount,
    maxLoanAmount: row.max_loan_amount,
    eligibility: row.eligibility_rules,
    howToApply: row.how_to_apply,
    applicationUrl: row.application_url,
    officialUrl: row.official_url,
    sources: row.sources,
    lastVerifiedAt: row.last_verified_at,
    verificationStatus: row.verification_status,
    effectiveFrom: row.effective_from,
  };
}

/** A database row as a Scheme, or null when it does not validate (a bad row is skipped, never trusted). */
export function parseSchemeRow(row: unknown): Scheme | null {
  const parsed = schemeRowSchema.safeParse(row);
  return parsed.success ? schemeFromRow(parsed.data) : null;
}
