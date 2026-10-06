import { evaluateSchemeEligibility } from "./matcher";
import { CuratedSchemeProvider, GovernmentOpenDataProvider, type SchemeProvider } from "./provider";
import { rankSchemeMatches } from "./ranker";
import type {
  NormalizedApplicantSchemeProfile,
  Scheme,
  SchemeFilter,
  SchemeMatchingResponse,
  SchemeMatchResult,
} from "./types";
import { createClient } from "@/lib/supabase/server";

let defaultProvider: SchemeProvider | null = null;

export function getSchemeProvider(): SchemeProvider {
  if (!defaultProvider) {
    if (process.env.DATA_GOV_IN_API_KEY) {
      defaultProvider = new GovernmentOpenDataProvider();
    } else {
      defaultProvider = new CuratedSchemeProvider();
    }
  }
  return defaultProvider;
}

/**
 * Matches an applicant against all active government schemes.
 */
export async function matchApplicantProfile(
  applicant: NormalizedApplicantSchemeProfile,
  filter?: SchemeFilter
): Promise<SchemeMatchingResponse> {
  const provider = getSchemeProvider();
  const schemes = await provider.getSchemes(filter);

  const matchResults: SchemeMatchResult[] = schemes.map((scheme: Scheme) =>
    evaluateSchemeEligibility(scheme, applicant)
  );

  return rankSchemeMatches(matchResults, applicant);
}

/**
 * Saves scheme matches to Supabase for the authenticated user.
 */
export async function saveSchemeMatchesForUser(params: {
  userId: string;
  assessmentId?: string;
  matches: SchemeMatchResult[];
}): Promise<{ savedCount: number }> {
  try {
    const supabase = await createClient();
    const rows = params.matches.map((m) => ({
      user_id: params.userId,
      assessment_id: params.assessmentId || null,
      scheme_id: m.schemeId,
      match_status: m.matchStatus,
      match_strength: m.matchStrength,
      matched_criteria: m.matchedCriteria,
      unmet_criteria: m.unmetCriteria,
      missing_information: m.missingInformation,
      scheme_version: m.schemeVersion,
      matched_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("government_scheme_matches").insert(rows);
    if (error) {
      // Non-blocking save failure
      return { savedCount: 0 };
    }
    return { savedCount: rows.length };
  } catch {
    return { savedCount: 0 };
  }
}
