import type {
  NormalizedApplicantSchemeProfile,
  SchemeMatchingResponse,
  SchemeMatchResult,
} from "./types";

const DISCLAIMER_TEXT =
  "Scheme matches are based on the information provided and published criteria in Pathway's verified dataset. They are not a guarantee of loan approval, sanction, or subsidy. Final eligibility and approval are determined by the concerned government authority, implementing agency, or lender.";

/**
 * Ranks and sorts scheme evaluation matches based on transparent match strength.
 */
export function rankSchemeMatches(
  matches: SchemeMatchResult[],
  applicant: NormalizedApplicantSchemeProfile
): SchemeMatchingResponse {
  // Sort priority:
  // 1. matchStatus tier (likely_match > potential_match > insufficient_information > not_matching > inactive/expired)
  // 2. matchStrength (descending)
  // 3. matchedCriteria count (descending)

  const statusWeight: Record<string, number> = {
    likely_match: 1000,
    potential_match: 500,
    insufficient_information: 200,
    not_matching: 50,
    expired: 0,
    inactive: 0,
  };

  const sorted = [...matches].sort((a, b) => {
    const weightDiff = (statusWeight[b.matchStatus] || 0) - (statusWeight[a.matchStatus] || 0);
    if (weightDiff !== 0) return weightDiff;

    const strengthDiff = b.matchStrength - a.matchStrength;
    if (strengthDiff !== 0) return strengthDiff;

    return b.matchedCriteria.length - a.matchedCriteria.length;
  });

  const qualifiedMatches = sorted.filter(
    (m) => m.matchStatus === "likely_match" || m.matchStatus === "potential_match" || m.matchStatus === "insufficient_information"
  );

  return {
    applicantSummary: {
      state: applicant.state,
      loanPurpose: applicant.loanPurpose,
      loanAmount: applicant.loanAmount,
      annualIncome: applicant.annualIncome,
    },
    totalSchemesEvaluated: matches.length,
    matchCount: qualifiedMatches.length,
    matches: sorted,
    disclaimer: DISCLAIMER_TEXT,
    evaluatedAt: new Date().toISOString(),
  };
}
