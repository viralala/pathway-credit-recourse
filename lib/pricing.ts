import { MODEL } from "./model";

/**
 * Risk-based pricing: the Pathway score decides the APR a prime lender would offer.
 * Below the approval cut-off the prime lender declines, and the borrower's realistic
 * alternative is a high-cost lender, priced at `declinedAlternativeApr`.
 *
 * Every number here is ILLUSTRATIVE. It is not calibrated to any lender or market, and the UI
 * renders `describePricing()` next to every figure it produces, so nothing is hidden.
 */
export interface RateTier {
  id: "excellent" | "very-good" | "good" | "fair";
  /** Lowest Pathway score in this tier (inclusive). */
  minScore: number;
  /** Annual percentage rate, as a fraction (0.18 = 18%). */
  apr: number;
}

export const PRICING = {
  /** Best tier first. The last tier starts exactly at the model's approval cut-off. */
  tiers: [
    { id: "excellent", minScore: MODEL.thresholdScore + 110, apr: 0.105 },
    { id: "very-good", minScore: MODEL.thresholdScore + 70, apr: 0.125 },
    { id: "good", minScore: MODEL.thresholdScore + 40, apr: 0.15 },
    { id: "fair", minScore: MODEL.thresholdScore, apr: 0.18 },
  ] as RateTier[],
  /** What a declined borrower typically pays elsewhere (high-cost personal credit). */
  declinedAlternativeApr: 0.36,
  /** Loan used for "money saved" when the applicant has not entered one. */
  defaultLoan: { amount: 10000, termMonths: 36 },
  /** Lenders commonly cap total EMIs at this share of monthly income (FOIR). */
  maxEmiToIncome: 0.5,
} as const;

/** The tier a score falls in, or null below the approval cut-off (declined). */
export function tierFor(score: number, p: typeof PRICING = PRICING): RateTier | null {
  return p.tiers.find((t) => score >= t.minScore) ?? null;
}

/** APR a prime lender would offer at this score, or null if it would decline. */
export function aprForScore(score: number, p: typeof PRICING = PRICING): number | null {
  return tierFor(score, p)?.apr ?? null;
}

/** APR the borrower actually faces: the prime tier if approved, the high-cost alternative if not. */
export function effectiveApr(score: number, p: typeof PRICING = PRICING): number {
  return aprForScore(score, p) ?? p.declinedAlternativeApr;
}

/** The next better tier above this score, or null if already in the best tier. */
export function nextTier(score: number, p: typeof PRICING = PRICING): RateTier | null {
  const better = p.tiers.filter((t) => t.minScore > score);
  return better.length ? better[better.length - 1] : null;
}

/** Lowest score whose tier APR is at or below `maxApr`, or null if no tier is that cheap. */
export function scoreForApr(maxApr: number, p: typeof PRICING = PRICING): number | null {
  const ok = p.tiers.filter((t) => t.apr <= maxApr + 1e-12);
  return ok.length ? Math.min(...ok.map((t) => t.minScore)) : null;
}

/** Equated monthly instalment for a fully amortising loan. */
export function emi(principal: number, apr: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = apr / 12;
  if (r <= 1e-12) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Total interest paid over the life of a fully amortising loan. */
export function totalInterest(principal: number, apr: number, months: number): number {
  return Math.max(0, emi(principal, apr, months) * months - principal);
}

export interface Savings {
  amount: number;
  termMonths: number;
  /** Today: the APR actually available (high-cost alternative if declined). */
  todayApr: number;
  todayDeclined: boolean;
  todayTier: RateTier | null;
  todayEmi: number;
  todayInterest: number;
  /** After the plan. */
  planApr: number;
  planDeclined: boolean;
  planTier: RateTier | null;
  planEmi: number;
  planInterest: number;
  /** Interest avoided by borrowing after the plan instead of today. Never negative. */
  saved: number;
  /** Lower monthly payment after the plan. Never negative. */
  emiDrop: number;
}

/** What following the plan is worth in money: interest on the same loan, today versus after the plan. */
export function moneySaved(
  o: { scoreToday: number; scoreAfter: number; amount?: number; termMonths?: number },
  p: typeof PRICING = PRICING,
): Savings {
  const amount = o.amount ?? p.defaultLoan.amount;
  const termMonths = o.termMonths ?? p.defaultLoan.termMonths;
  const todayTier = tierFor(o.scoreToday, p);
  const planTier = tierFor(o.scoreAfter, p);
  const todayApr = effectiveApr(o.scoreToday, p);
  const planApr = effectiveApr(o.scoreAfter, p);
  const todayEmi = emi(amount, todayApr, termMonths);
  const planEmi = emi(amount, planApr, termMonths);
  const todayInterest = totalInterest(amount, todayApr, termMonths);
  const planInterest = totalInterest(amount, planApr, termMonths);
  return {
    amount,
    termMonths,
    todayApr,
    todayDeclined: todayTier === null,
    todayTier,
    todayEmi,
    todayInterest,
    planApr,
    planDeclined: planTier === null,
    planTier,
    planEmi,
    planInterest,
    saved: Math.max(0, todayInterest - planInterest),
    emiDrop: Math.max(0, todayEmi - planEmi),
  };
}

/** Plain-English description of the pricing assumptions, rendered next to every money figure. */
export function describePricing(p: typeof PRICING = PRICING): { label: string; value: string }[] {
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;
  return [
    ...p.tiers.map((t) => ({ label: `Score ${t.minScore}+`, value: `${pct(t.apr)} APR` })),
    { label: `Below ${MODEL.thresholdScore} (declined)`, value: `${pct(p.declinedAlternativeApr)} APR from a high-cost alternative lender` },
    { label: "Default loan", value: `$${p.defaultLoan.amount.toLocaleString("en-US")} over ${p.defaultLoan.termMonths} months` },
    { label: "Affordability", value: `all EMIs at most ${pct(p.maxEmiToIncome)} of monthly income` },
  ];
}
