import { DEFAULT_GOAL, normalizeGoal, type Goal } from "./goal";
import { DEFAULT_SAMPLE, getSample } from "./samples";
import { APPLICANT_LIMITS } from "./security/validate";
import type { Applicant, FeatureKey, LoanType } from "./types";

/**
 * Short query-string names for each applicant field. Older links may still carry `age`, `dep`
 * and `re`; the model does not use those inputs, so they are ignored.
 */
export const PARAM: Record<FeatureKey, string> = {
  monthlyIncome: "income",
  utilization: "util",
  debtRatio: "dti",
  openCreditLines: "lines",
  late30: "l30",
  late60: "l60",
  late90: "l90",
};

/** Query-string names for the loan goal: amount in rupees, term in months, APR in percent (apr=15 means 15%). */
export const GOAL_PARAM: Record<keyof Goal, string> = {
  amount: "amount",
  termMonths: "term",
  maxApr: "apr",
};

export type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Applicant from the URL: a demo sample, optionally overridden field by field, plus selected loanType, loanAmount, collateralValue, recentHardInquiries. */
export function applicantFromParams(sp: SearchParams): {
  applicant: Applicant;
  name: string;
  sampleId: string | null;
  loanType: LoanType;
  loanAmount: number;
  collateralValue: number | null;
  recentHardInquiries: number;
} {
  const sample = getSample(first(sp.sample)) ?? (Object.values(PARAM).some((p) => first(sp[p]) !== undefined) ? null : DEFAULT_SAMPLE);
  const applicant: Applicant = { ...(sample ?? DEFAULT_SAMPLE).applicant };
  let custom = false;
  for (const [key, p] of Object.entries(PARAM) as [FeatureKey, string][]) {
    const raw = first(sp[p]);
    if (raw === undefined) continue;
    const v = Number(raw);
    // Below the form's minimum (a negative number, or an income of 0 or 1) is not a value: ignored.
    if (Number.isFinite(v) && v >= APPLICANT_LIMITS[key].min) {
      applicant[key] = v;
      custom = true;
    }
  }
  const rawLoanType = first(sp.loanType) || first(sp.type);
  const loanType: LoanType = rawLoanType === "secured" ? "secured" : "unsecured";

  const rawAmount = first(sp.loanAmount) || first(sp.amount);
  const parsedAmount = rawAmount ? Number(rawAmount) : NaN;
  const loanAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 500_000;

  const rawCollateral = first(sp.collateral) || first(sp.collateralValue);
  const parsedCollateral = rawCollateral ? Number(rawCollateral) : NaN;
  const collateralValue =
    loanType === "secured"
      ? Number.isFinite(parsedCollateral) && parsedCollateral > 0
        ? parsedCollateral
        : 800_000
      : null;

  const rawInquiries = first(sp.inquiries) || first(sp.recentHardInquiries);
  const parsedInquiries = rawInquiries !== undefined ? Number(rawInquiries) : NaN;
  const recentHardInquiries =
    Number.isFinite(parsedInquiries) && parsedInquiries >= 0 ? Math.floor(parsedInquiries) : 0;

  return {
    applicant,
    name: sample && !custom ? sample.name : first(sp.name) || "Applicant",
    sampleId: sample && !custom ? sample.id : null,
    loanType,
    loanAmount,
    collateralValue,
    recentHardInquiries,
  };
}

/** Loan goal from the URL (`amount`, `term`, `apr` in percent), clamped to GOAL_LIMITS. Missing or invalid values fall back. */
export function goalFromParams(sp: SearchParams, fallback: Goal = DEFAULT_GOAL): Goal {
  const read = (k: keyof Goal): number | undefined => {
    const raw = first(sp[GOAL_PARAM[k]]);
    if (raw === undefined || raw.trim() === "") return undefined;
    const v = Number(raw);
    return Number.isFinite(v) ? v : undefined;
  };
  const apr = read("maxApr");
  return normalizeGoal(
    { amount: read("amount"), termMonths: read("termMonths"), maxApr: apr === undefined ? undefined : apr / 100 },
    normalizeGoal(fallback),
  );
}

/** The goal as query-string pairs, in the units `goalFromParams` reads. */
export function goalParamEntries(goal: Goal): [string, string][] {
  const g = normalizeGoal(goal);
  return [
    [GOAL_PARAM.amount, String(g.amount)],
    [GOAL_PARAM.termMonths, String(g.termMonths)],
    [GOAL_PARAM.maxApr, String(Number((g.maxApr * 100).toFixed(2)))],
  ];
}

export function paramsFor(
  applicant: Applicant,
  opts: {
    sampleId?: string | null;
    lang?: string;
    name?: string;
    goal?: Goal;
    loanType?: LoanType;
    loanAmount?: number;
    collateralValue?: number | null;
    recentHardInquiries?: number;
  } = {},
): string {
  const q = new URLSearchParams();
  if (opts.sampleId) q.set("sample", opts.sampleId);
  else {
    for (const [key, p] of Object.entries(PARAM) as [FeatureKey, string][]) q.set(p, String(Number(applicant[key].toFixed(4))));
    if (opts.name) q.set("name", opts.name);
  }
  if (opts.loanType) q.set("loanType", opts.loanType);
  if (opts.loanAmount) q.set("loanAmount", String(Math.round(opts.loanAmount)));
  if (opts.loanType === "secured" && opts.collateralValue) {
    q.set("collateralValue", String(Math.round(opts.collateralValue)));
  }
  if (opts.recentHardInquiries !== undefined && opts.recentHardInquiries > 0) {
    q.set("inquiries", String(Math.floor(opts.recentHardInquiries)));
  }
  if (opts.goal) for (const [k, v] of goalParamEntries(opts.goal)) q.set(k, v);
  if (opts.lang && opts.lang !== "en") q.set("lang", opts.lang);
  return q.toString();
}
