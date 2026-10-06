import { money, tf, type Lang } from "@/lib/i18n";
import type { SchemeStrings } from "@/lib/strings/schemes";
import type { CriterionResult, ProfileFieldKey, Scheme } from "@/lib/schemes/types";

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

/** "2025-03-31" as a date in the page language ("31 March 2025"). Anything that is not a date comes back as given. */
export function formatDate(lang: Lang, iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return iso;
  }
}

/** How many of the scheme's required criteria the person's answers confirm. Preferred (priority) criteria are not counted. */
export function requiredCounts(criteria: CriterionResult[]): { confirmed: number; total: number } {
  const required = criteria.filter((c) => c.importance === "required");
  return { confirmed: required.filter((c) => c.outcome === "pass").length, total: required.length };
}

const MONEY_FIELDS: readonly ProfileFieldKey[] = ["loanAmount", "projectCost", "annualIncome"];

/** What the person told us, in words: "Yes", "Rural area (village)", "₹2,00,000", "Class 8". */
export function answerText(s: SchemeStrings, field: ProfileFieldKey, actual: CriterionResult["actual"]): string {
  if (actual === undefined || actual === null) return s.card.noAnswer;
  if (typeof actual === "boolean") return actual ? s.form.yes : s.form.no;
  if (typeof actual === "number") {
    if (MONEY_FIELDS.includes(field)) return money(actual);
    if (field === "educationClass") return educationText(s, actual);
    return String(actual);
  }
  const options = s.options as Record<string, Record<string, string> | undefined>;
  return options[field]?.[actual] ?? actual;
}

export function educationText(s: SchemeStrings, n: number): string {
  if (n <= 0) return s.education.none;
  if (n >= 13) return s.education.graduate;
  return tf(s.education.classN, { n });
}

/** The loan range a scheme publishes, or null when it publishes no bound. */
export function loanRangeText(s: SchemeStrings, scheme: Pick<Scheme, "minLoanAmount" | "maxLoanAmount">): string | null {
  const { minLoanAmount: min, maxLoanAmount: max } = scheme;
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (hasMin && hasMax) return tf(s.card.loanBetween, { min: money(min), max: money(max) });
  if (hasMax) return tf(s.card.loanUpTo, { max: money(max) });
  if (hasMin) return tf(s.card.loanFrom, { min: money(min) });
  return null;
}
