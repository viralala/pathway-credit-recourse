import { evaluateScheme, statusFor } from "./matcher";
import { PROFILE_FIELD_KEYS } from "./schema";
import type { ApplicantSchemeProfile, MatchStatus, ProfileFieldKey, Relevance, RelevanceFactor, Scheme, SchemeEvaluation, SchemeMatch } from "./types";

/**
 * Orders matched schemes and says how much of each one's published criteria is confirmed.
 *
 * The score is a measure of how complete the match is, not a prediction about any application:
 * a scheme whose every criterion is confirmed scores 100 and says nothing about what an agency will decide.
 */

/** Points available to each factor; they sum to 100. */
export const RELEVANCE_WEIGHTS = { required: 70, preferred: 10, amount: 20 } as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Score out of 100 from three factors: required criteria confirmed, preferred criteria confirmed, and
 * whether the wanted loan amount sits inside the scheme's published bounds. A factor that does not apply
 * to this scheme (no preferred criteria, no amount bounds) hands its weight to `required`, so every
 * scheme is scored out of the same 100. An unknown amount earns 0 points but does not shrink the maximum:
 * not telling us leaves the scheme short of full marks rather than rescoring it.
 */
export function relevanceOf(scheme: Scheme, evaluation: SchemeEvaluation, profile: ApplicantSchemeProfile): Relevance {
  const W = RELEVANCE_WEIGHTS;
  const required = evaluation.criteria.filter((c) => c.importance === "required");
  const preferred = evaluation.criteria.filter((c) => c.importance === "preferred");
  const share = (list: typeof required) => (list.length === 0 ? 0 : list.filter((c) => c.outcome === "pass").length / list.length);

  const hasPreferred = preferred.length > 0;
  const hasBounds = scheme.minLoanAmount !== null || scheme.maxLoanAmount !== null;
  const maxRequired = W.required + (hasPreferred ? 0 : W.preferred) + (hasBounds ? 0 : W.amount);
  const maxPreferred = hasPreferred ? W.preferred : 0;
  const maxAmount = hasBounds ? W.amount : 0;

  const loan = profile.loanAmount;
  const inBounds = loan !== undefined && loan >= (scheme.minLoanAmount ?? 0) && loan <= (scheme.maxLoanAmount ?? Infinity);

  const raw: Record<RelevanceFactor["key"], { points: number; max: number }> = {
    // A rule that passes as a whole is fully confirmed, even when an `any` branch it did not need is unmet.
    required: { points: maxRequired * (evaluation.outcome === "pass" ? 1 : share(required)), max: maxRequired },
    preferred: { points: maxPreferred * share(preferred), max: maxPreferred },
    amount: { points: inBounds ? maxAmount : 0, max: maxAmount },
  };
  const total = raw.required.points + raw.preferred.points + raw.amount.points;
  return {
    score: Math.min(100, Math.max(0, Math.round(total))),
    factors: (["required", "preferred", "amount"] as const).map((key) => ({ key, points: round2(raw[key].points), max: raw[key].max })),
  };
}

const STATUS_ORDER: Record<MatchStatus, number> = { appears_relevant: 0, needs_more_information: 1, not_matched: 2 };

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Status first, then score, then slug. Slug (then newest version, then id) makes the order independent of
 * the order the schemes arrived in. A not_matched scheme keeps its score so the person can see why.
 */
export function rankMatches(matches: SchemeMatch[]): SchemeMatch[] {
  return [...matches].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.relevance.score - a.relevance.score ||
      compareText(a.scheme.slug, b.scheme.slug) ||
      b.scheme.version - a.scheme.version ||
      compareText(a.scheme.id, b.scheme.id),
  );
}

/** Evaluate, score and rank. Which schemes are active and current is decided before this, by whoever supplies them. */
export function matchSchemes(schemes: Scheme[], profile: ApplicantSchemeProfile): SchemeMatch[] {
  const matches = schemes.map((scheme): SchemeMatch => {
    const evaluation = evaluateScheme(scheme, profile);
    return { scheme, status: statusFor(evaluation), relevance: relevanceOf(scheme, evaluation, profile), evaluation };
  });
  return rankMatches(matches);
}

/** Fields worth asking for next: the ones that would help the most schemes that still need information. */
export function missingFieldsAcross(matches: SchemeMatch[]): ProfileFieldKey[] {
  const counts = new Map<ProfileFieldKey, number>();
  for (const m of matches) {
    if (m.status !== "needs_more_information") continue;
    for (const field of new Set(m.evaluation.missingFields)) counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  const order = (f: ProfileFieldKey) => PROFILE_FIELD_KEYS.indexOf(f);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || order(a) - order(b));
}
