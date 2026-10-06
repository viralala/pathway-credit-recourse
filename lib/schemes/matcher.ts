import { PROFILE_FIELDS, criteriaOf, criterionProblem } from "./schema";
import type {
  ApplicantSchemeProfile,
  Criterion,
  CriterionResult,
  EligibilityRule,
  MatchStatus,
  Outcome,
  ProfileFieldKey,
  ProfileFieldSpec,
  Scheme,
  SchemeEvaluation,
} from "./types";

/**
 * The rule engine: three-valued (Kleene) logic over a scheme's published criteria.
 *
 * "unknown" is a first-class result, never folded into "fail": a field the person has not told us
 * about makes its criterion unknown, which surfaces as "needs more information", not as a rejection.
 * A malformed criterion is also unknown, so a bad database row can neither crash the engine nor
 * produce a false negative. Pure and deterministic: no clock, no randomness, no I/O.
 */

/** The profile value is present and of the type its field allows. Anything else is treated as not told. */
function usable(v: unknown, spec: ProfileFieldSpec): v is string | number | boolean {
  if (spec.type === "number") return typeof v === "number" && Number.isFinite(v);
  if (spec.type === "boolean") return typeof v === "boolean";
  return typeof v === "string" && (spec.values ?? []).includes(v);
}

/** Does `actual` satisfy `op value`? null when the operator is not one the engine knows (so the caller says unknown). */
function holds(op: string, actual: string | number | boolean, value: unknown): boolean | null {
  switch (op) {
    case "eq":
      return actual === value;
    case "neq":
      return actual !== value;
    case "in":
      return (value as unknown[]).includes(actual);
    case "not_in":
      return !(value as unknown[]).includes(actual);
    case "gte":
      return (actual as number) >= (value as number);
    case "lte":
      return (actual as number) <= (value as number);
    case "gt":
      return (actual as number) > (value as number);
    case "lt":
      return (actual as number) < (value as number);
    case "between": {
      const [lo, hi] = value as [number, number];
      return (actual as number) >= lo && (actual as number) <= hi;
    }
    case "is_true":
      return actual === true;
    case "is_false":
      return actual === false;
    default:
      return null;
  }
}

/** One comparison of one profile field. Unknown when the field is missing or the criterion is malformed. */
export function evaluateCriterion(c: Criterion, profile: ApplicantSchemeProfile): Outcome {
  if (!c || typeof c !== "object" || criterionProblem(c) !== null) return "unknown";
  const actual: unknown = profile[c.field];
  if (!usable(actual, PROFILE_FIELDS[c.field])) return "unknown";
  const result = holds(c.op, actual, c.value);
  return result === null ? "unknown" : result ? "pass" : "fail";
}

function allOf(outcomes: Outcome[]): Outcome {
  if (outcomes.includes("fail")) return "fail";
  return outcomes.includes("unknown") ? "unknown" : "pass";
}

function anyOf(outcomes: Outcome[]): Outcome {
  if (outcomes.includes("pass")) return "pass";
  return outcomes.includes("unknown") ? "unknown" : "fail";
}

/**
 * Kleene all / any / not over criteria. An empty group is a malformed row, not a vacuous truth or
 * falsehood, so it is "unknown" as well.
 */
export function evaluateRule(rule: EligibilityRule, profile: ApplicantSchemeProfile): Outcome {
  if (!rule || typeof rule !== "object") return "unknown";
  switch (rule.type) {
    case "criterion":
      return evaluateCriterion(rule, profile);
    case "all":
      return Array.isArray(rule.rules) && rule.rules.length > 0 ? allOf(rule.rules.map((r) => evaluateRule(r, profile))) : "unknown";
    case "any":
      return Array.isArray(rule.rules) && rule.rules.length > 0 ? anyOf(rule.rules.map((r) => evaluateRule(r, profile))) : "unknown";
    case "not": {
      const inner = evaluateRule(rule.rule, profile);
      return inner === "pass" ? "fail" : inner === "fail" ? "pass" : "unknown";
    }
    default:
      return "unknown";
  }
}

/**
 * Fields that could still change the result of `rule`. Descends only into parts whose own outcome is
 * unknown, so a field behind an `any` branch that already passed, or inside a decided `all` branch,
 * is never asked for. A criterion that is malformed, or whose value is present but unusable, cannot be
 * fixed by asking, so it is skipped.
 */
function unresolvedFields(rule: EligibilityRule, profile: ApplicantSchemeProfile, out: ProfileFieldKey[]): void {
  if (evaluateRule(rule, profile) !== "unknown") return;
  if (rule.type === "criterion") {
    if (profile[rule.field] === undefined && criterionProblem(rule) === null) out.push(rule.field);
  } else if (rule.type === "not") unresolvedFields(rule.rule, profile, out);
  else for (const child of rule.rules) unresolvedFields(child, profile, out);
}

function resultOf(c: Criterion, importance: CriterionResult["importance"], profile: ApplicantSchemeProfile): CriterionResult {
  const actual = profile[c.field];
  return {
    id: c.id,
    field: c.field,
    label: c.label,
    ...(c.sourceRef !== undefined && { sourceRef: c.sourceRef }),
    importance,
    outcome: evaluateCriterion(c, profile),
    ...(actual !== undefined && { actual }),
  };
}

/** Evaluate every criterion of a scheme against a profile. `preferred` criteria never affect `outcome` or `missingFields`. */
export function evaluateScheme(scheme: Scheme, profile: ApplicantSchemeProfile): SchemeEvaluation {
  const { required, preferred } = scheme.eligibility;
  const outcome = evaluateRule(required, profile);
  const criteria = [
    ...criteriaOf(required).map((c) => resultOf(c, "required", profile)),
    ...(preferred ?? []).map((c) => resultOf(c, "preferred", profile)),
  ];
  const missing: ProfileFieldKey[] = [];
  if (outcome === "unknown") unresolvedFields(required, profile, missing);
  return { outcome, criteria, missingFields: [...new Set(missing)] };
}

export function statusFor(evaluation: SchemeEvaluation): MatchStatus {
  if (evaluation.outcome === "pass") return "appears_relevant";
  return evaluation.outcome === "unknown" ? "needs_more_information" : "not_matched";
}
