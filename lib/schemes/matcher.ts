import type {
  NormalizedApplicantSchemeProfile,
  RuleOperator,
  Scheme,
  SchemeMatchResult,
  SchemeMatchStatus,
} from "./types";

/**
 * Evaluates a single rule operator against an applicant value and rule target value.
 */
export function evaluateRuleOperator(
  applicantValue: unknown,
  operator: RuleOperator,
  ruleValue: unknown
): boolean {
  switch (operator) {
    case "equals": {
      if (typeof applicantValue === "string" && typeof ruleValue === "string") {
        return applicantValue.trim().toLowerCase() === ruleValue.trim().toLowerCase();
      }
      return applicantValue === ruleValue;
    }

    case "notEquals": {
      if (typeof applicantValue === "string" && typeof ruleValue === "string") {
        return applicantValue.trim().toLowerCase() !== ruleValue.trim().toLowerCase();
      }
      return applicantValue !== ruleValue;
    }

    case "greaterThan": {
      if (typeof applicantValue !== "number" || typeof ruleValue !== "number") return false;
      return applicantValue > ruleValue;
    }

    case "greaterThanOrEqual": {
      if (typeof applicantValue !== "number" || typeof ruleValue !== "number") return false;
      return applicantValue >= ruleValue;
    }

    case "lessThan": {
      if (typeof applicantValue !== "number" || typeof ruleValue !== "number") return false;
      return applicantValue < ruleValue;
    }

    case "lessThanOrEqual": {
      if (typeof applicantValue !== "number" || typeof ruleValue !== "number") return false;
      return applicantValue <= ruleValue;
    }

    case "in": {
      if (!Array.isArray(ruleValue)) return false;
      if (Array.isArray(applicantValue)) {
        return applicantValue.some((av) =>
          ruleValue.some((rv) =>
            typeof av === "string" && typeof rv === "string"
              ? av.toLowerCase() === rv.toLowerCase()
              : av === rv
          )
        );
      }
      return ruleValue.some((rv) =>
        typeof applicantValue === "string" && typeof rv === "string"
          ? applicantValue.toLowerCase() === rv.toLowerCase()
          : applicantValue === rv
      );
    }

    case "notIn": {
      if (!Array.isArray(ruleValue)) return true;
      if (typeof applicantValue === "string") {
        return !ruleValue.some(
          (rv) => typeof rv === "string" && rv.toLowerCase() === applicantValue.toLowerCase()
        );
      }
      return !ruleValue.includes(applicantValue);
    }

    case "contains": {
      if (Array.isArray(applicantValue)) {
        return applicantValue.some((item) =>
          typeof item === "string" && typeof ruleValue === "string"
            ? item.toLowerCase().includes(ruleValue.toLowerCase())
            : item === ruleValue
        );
      }
      if (typeof applicantValue === "string" && typeof ruleValue === "string") {
        return applicantValue.toLowerCase().includes(ruleValue.toLowerCase());
      }
      return false;
    }

    case "boolean": {
      return Boolean(applicantValue) === Boolean(ruleValue);
    }

    case "range": {
      if (!Array.isArray(ruleValue) || ruleValue.length !== 2) return false;
      if (typeof applicantValue !== "number") return false;
      const [min, max] = ruleValue;
      return applicantValue >= min && applicantValue <= max;
    }

    case "exists": {
      const isPresent = applicantValue !== undefined && applicantValue !== null && applicantValue !== "";
      return isPresent === Boolean(ruleValue);
    }

    default:
      return false;
  }
}

/**
 * Extracts property from applicant profile by field key.
 */
function getApplicantFieldValue(
  profile: NormalizedApplicantSchemeProfile,
  field: string
): unknown {
  const normalizedField = field.trim();
  const record = profile as unknown as Record<string, unknown>;
  return record[normalizedField];
}

/**
 * Evaluates a single scheme against a normalized applicant profile.
 */
export function evaluateSchemeEligibility(
  scheme: Scheme,
  applicant: NormalizedApplicantSchemeProfile
): SchemeMatchResult {
  const matchedCriteria: string[] = [];
  const unmetCriteria: string[] = [];
  const missingInformation: string[] = [];
  const reasons: string[] = [];

  // Check scheme active status
  if (!scheme.active) {
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      schemeSlug: scheme.slug,
      governmentLevel: scheme.governmentLevel,
      ministry: scheme.ministry,
      state: scheme.state,
      category: scheme.category,
      matchStatus: "inactive",
      matchStrength: 0,
      matchedCriteria,
      unmetCriteria: ["Scheme is currently inactive or paused."],
      missingInformation,
      reasons: ["Scheme is not currently open for new applications."],
      benefits: scheme.benefits,
      requiredDocuments: scheme.requiredDocuments,
      officialSourceUrl: scheme.officialSourceUrl,
      applicationUrl: scheme.applicationUrl,
      lastVerifiedAt: scheme.lastVerifiedAt,
      schemeVersion: scheme.version,
    };
  }

  // Check scheme effective date
  if (scheme.effectiveUntil && new Date(scheme.effectiveUntil).getTime() < Date.now()) {
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      schemeSlug: scheme.slug,
      governmentLevel: scheme.governmentLevel,
      ministry: scheme.ministry,
      state: scheme.state,
      category: scheme.category,
      matchStatus: "expired",
      matchStrength: 0,
      matchedCriteria,
      unmetCriteria: ["Scheme validity period has concluded."],
      missingInformation,
      reasons: ["Scheme validity period expired."],
      benefits: scheme.benefits,
      requiredDocuments: scheme.requiredDocuments,
      officialSourceUrl: scheme.officialSourceUrl,
      applicationUrl: scheme.applicationUrl,
      lastVerifiedAt: scheme.lastVerifiedAt,
      schemeVersion: scheme.version,
    };
  }

  // State-level scheme check: if scheme is state-specific, verify state match
  if (scheme.governmentLevel === "state" && scheme.state) {
    if (!applicant.state) {
      missingInformation.push(`Applicant location (must be resident of ${scheme.state})`);
    } else if (applicant.state.toLowerCase() !== scheme.state.toLowerCase()) {
      unmetCriteria.push(`Scheme is exclusive to ${scheme.state} state residents.`);
    } else {
      matchedCriteria.push(`Location matches ${scheme.state} state criterion.`);
    }
  }

  // Evaluate rules
  const rules = scheme.eligibilityRules?.rules || [];
  let requiredUnmetCount = 0;
  let requiredMissingCount = 0;

  for (const rule of rules) {
    const applicantVal = getApplicantFieldValue(applicant, rule.field);

    if (applicantVal === undefined || applicantVal === null || applicantVal === "") {
      // Applicant has not provided this information
      missingInformation.push(rule.label);
      if (rule.isRequired !== false) {
        requiredMissingCount++;
      }
      continue;
    }

    const isSatisfied = evaluateRuleOperator(applicantVal, rule.operator, rule.value);

    if (isSatisfied) {
      matchedCriteria.push(rule.label);
    } else {
      unmetCriteria.push(rule.label);
      if (rule.isRequired !== false) {
        requiredUnmetCount++;
      }
    }
  }

  // Determine overall status
  let matchStatus: SchemeMatchStatus;

  if (requiredUnmetCount > 0 || (scheme.governmentLevel === "state" && scheme.state && applicant.state && applicant.state.toLowerCase() !== scheme.state.toLowerCase())) {
    matchStatus = "not_matching";
  } else if (requiredMissingCount > 0) {
    if (matchedCriteria.length >= 2) {
      matchStatus = "potential_match";
    } else {
      matchStatus = "insufficient_information";
    }
  } else if (missingInformation.length > 0) {
    matchStatus = "potential_match";
  } else {
    matchStatus = "likely_match";
  }

  // Generate contextual explanation reasons
  if (matchStatus === "likely_match") {
    reasons.push("All published eligibility criteria appear to be satisfied based on your provided information.");
    if (scheme.benefits.length > 0) {
      reasons.push(scheme.benefits[0].summary);
    }
  } else if (matchStatus === "potential_match") {
    reasons.push("Your core loan purpose and demographic profile align with this scheme.");
    if (missingInformation.length > 0) {
      reasons.push(`Verify ${missingInformation.length} additional parameter${missingInformation.length > 1 ? "s" : ""} to confirm suitability.`);
    }
  } else if (matchStatus === "insufficient_information") {
    reasons.push("Additional applicant profile details are needed to determine eligibility.");
  } else if (matchStatus === "not_matching") {
    reasons.push("One or more mandatory published criteria are not currently met by this profile.");
  }

  // Calculate Match Strength / Relevance Score (0 to 100)
  let matchStrength = 0;
  if (matchStatus === "likely_match") {
    matchStrength = 85 + Math.min(10, scheme.priority);
  } else if (matchStatus === "potential_match") {
    matchStrength = 60 + Math.min(15, matchedCriteria.length * 5) - Math.min(15, missingInformation.length * 3);
  } else if (matchStatus === "insufficient_information") {
    matchStrength = 35 + Math.min(10, matchedCriteria.length * 3);
  } else {
    matchStrength = 10;
  }

  matchStrength = Math.max(0, Math.min(100, Math.round(matchStrength)));

  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    schemeSlug: scheme.slug,
    governmentLevel: scheme.governmentLevel,
    ministry: scheme.ministry,
    state: scheme.state,
    category: scheme.category,
    matchStatus,
    matchStrength,
    matchedCriteria,
    unmetCriteria,
    missingInformation,
    reasons,
    benefits: scheme.benefits,
    requiredDocuments: scheme.requiredDocuments,
    officialSourceUrl: scheme.officialSourceUrl,
    applicationUrl: scheme.applicationUrl,
    lastVerifiedAt: scheme.lastVerifiedAt,
    schemeVersion: scheme.version,
  };
}
