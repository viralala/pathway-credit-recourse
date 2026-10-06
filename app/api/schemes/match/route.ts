import { apiError, apiSuccess } from "@/lib/security/api-response";
import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { normalizeApplicantForSchemes } from "@/lib/schemes/normalizer";
import { matchApplicantProfile, saveSchemeMatchesForUser } from "@/lib/schemes/repository";
import { matchRequestBodySchema } from "@/lib/schemes/validation";

export async function POST(req: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload in request body", 400);
    }

    const parseResult = matchRequestBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError("VALIDATION_ERROR", "Invalid applicant scheme profile payload", 400, {
        issues: parseResult.error.flatten(),
      });
    }

    const { applicant: rawApplicant, filters, saveMatch } = parseResult.data;

    // Normalize applicant profile to ensure sanitized, finite inputs
    const normalizedProfile = normalizeApplicantForSchemes({
      ...rawApplicant,
      applicant: {
        monthlyIncome: rawApplicant.monthlyIncome,
      },
      loanAmount: rawApplicant.loanAmount,
      loanPurpose: rawApplicant.loanPurpose,
    });

    const matchResponse = await matchApplicantProfile(normalizedProfile, filters);

    // If authenticated user requested persistence, securely save match results
    if (saveMatch) {
      try {
        const { authenticated, user } = await getAuthenticatedUser();
        if (authenticated && user) {
          await saveSchemeMatchesForUser({
            userId: user.id,
            assessmentId: rawApplicant.assessmentId,
            matches: matchResponse.matches,
          });
        }
      } catch {
        // Non-blocking persistence error
      }
    }

    return apiSuccess(matchResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error matching government schemes";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
