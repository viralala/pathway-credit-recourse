import { APPLICANT_LIMITS } from "@/lib/security/validate";
import type { Applicant, FeatureKey } from "@/lib/types";
import type { FieldSource, LinkedAccount } from "./types";

/**
 * Converts ReBIT-style Account Aggregator financial data into the model's seven inputs.
 * Pure functions, no I/O, no logging: the data never leaves the request that fetched it.
 *
 * Units match lib/types.ts: income in rupees per month (the model divides by INR_PER_MODEL_UNIT itself),
 * utilization and debtRatio as fractions (0.35, not 35).
 */

export interface AATransaction {
  /** ISO date, YYYY-MM-DD (a longer ISO timestamp is accepted). */
  date: string;
  /** Always positive; `type` carries the direction. */
  amount: number;
  type: "CREDIT" | "DEBIT";
  narration: string;
  /** Payment mode as the bank reports it, e.g. NEFT, UPI, ATM, OTHERS. */
  mode?: string;
}

/** Days past due the lender reported for one month. */
export interface DpdEntry {
  /** YYYY-MM */
  month: string;
  dpd: number;
}

export interface DepositAccount {
  institution: string;
  masked: string;
  transactions: AATransaction[];
}

export interface CardAccount {
  institution: string;
  masked: string;
  currentBalance: number;
  creditLimit: number;
  dpd: DpdEntry[];
  /** Defaults to true. */
  active?: boolean;
}

export interface LoanAccount {
  institution: string;
  masked: string;
  /** Monthly instalment in rupees. */
  emi: number;
  status: "ACTIVE" | "CLOSED";
  dpd: DpdEntry[];
}

export interface AAFinancialData {
  period: { from: string; to: string };
  deposits: DepositAccount[];
  cards: CardAccount[];
  loans: LoanAccount[];
}

export interface NormalizedApplicant {
  applicant: Applicant;
  sources: Partial<Record<FeatureKey, FieldSource>>;
}

/** Fewest months of salary-like credits that make an income figure trustworthy. */
export const MIN_INCOME_MONTHS = 3;
/** How far back late payments are counted. */
export const LATE_WINDOW_MONTHS = 24;
/** Minimum due on a card, as a share of its balance (a common issuer rule; the AA data has no field for it). */
export const CARD_MIN_DUE_SHARE = 0.05;

const SALARY_RE = /\b(SALARY|SAL|PAYROLL)\b/i;
const OBLIGATION_RE = /\b(EMI|ACH|NACH|ECS|LOAN)\b/i;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clampKey = (key: FeatureKey, v: number) => clamp(v, APPLICANT_LIMITS[key].min, APPLICANT_LIMITS[key].max);
const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Every YYYY-MM from `from` to `to`, inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = monthOf(to);
  while (out.length < 600) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key > end) break;
    out.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** The `count` months ending at (and including) the month of `to`. */
function lastMonths(to: string, count: number): Set<string> {
  const all = monthsBetween(`${Number(to.slice(0, 4)) - Math.ceil(count / 12) - 1}-01-01`, to);
  return new Set(all.slice(-count));
}

/** Which DPD bucket a days-past-due number falls in, or null when the account is current or under 30 days late. */
export function dpdBucket(dpd: number): "late30" | "late60" | "late90" | null {
  if (!Number.isFinite(dpd) || dpd < 30) return null;
  if (dpd < 60) return "late30";
  if (dpd < 90) return "late60";
  return "late90";
}

/** "NEFT-ACME LTD-0412" and "NEFT-ACME LTD-0512" are the same source once digits are dropped. */
const sourceKey = (narration: string) => narration.toUpperCase().replace(/[0-9]+/g, "").replace(/[^A-Z]+/g, " ").trim();

/**
 * Salary-like credits: the narration says SALARY, SAL or PAYROLL, or the same NEFT source pays in
 * during at least MIN_INCOME_MONTHS different months.
 */
function salaryCredits(txns: AATransaction[]): AATransaction[] {
  const credits = txns.filter((t) => t.type === "CREDIT");
  const neft = new Map<string, { months: Set<string>; txns: AATransaction[] }>();
  for (const t of credits) {
    if (SALARY_RE.test(t.narration) || (t.mode ?? "").toUpperCase() !== "NEFT") continue;
    const key = sourceKey(t.narration);
    if (!key) continue;
    const entry = neft.get(key) ?? { months: new Set<string>(), txns: [] };
    entry.months.add(monthOf(t.date));
    entry.txns.push(t);
    neft.set(key, entry);
  }
  const recurring = [...neft.values()].filter((e) => e.months.size >= MIN_INCOME_MONTHS).flatMap((e) => e.txns);
  return [...credits.filter((t) => SALARY_RE.test(t.narration)), ...recurring];
}

export function normalize(data: AAFinancialData): NormalizedApplicant {
  const months = monthsBetween(data.period.from, data.period.to);
  const inPeriod = new Set(months);
  const txns = data.deposits.flatMap((d) => d.transactions).filter((t) => inPeriod.has(monthOf(t.date)) && t.amount > 0);
  const periodLabel = `last ${months.length} month${months.length === 1 ? "" : "s"}`;
  const sources: Partial<Record<FeatureKey, FieldSource>> = {};

  // Income: median of per-month salary-like totals.
  const perMonth = new Map<string, number>();
  for (const t of salaryCredits(txns)) perMonth.set(monthOf(t.date), (perMonth.get(monthOf(t.date)) ?? 0) + t.amount);
  let monthlyIncome = NaN;
  if (perMonth.size >= MIN_INCOME_MONTHS) {
    monthlyIncome = clampKey("monthlyIncome", Math.round(median([...perMonth.values()])));
    sources.monthlyIncome = {
      origin: "bank-statement",
      detail: `Median monthly salary credit, ${periodLabel} (${perMonth.size} months with salary)`,
    };
  } else {
    sources.monthlyIncome = {
      origin: "not-available",
      detail: `Found salary-like credits in ${perMonth.size} of ${months.length} months; at least ${MIN_INCOME_MONTHS} are needed. Enter it yourself.`,
    };
  }

  // Debt ratio: monthly obligations over income.
  const bankObligations = txns.filter((t) => t.type === "DEBIT" && OBLIGATION_RE.test(t.narration)).reduce((s, t) => s + t.amount, 0);
  const bankMonthly = months.length ? bankObligations / months.length : 0;
  const activeLoans = data.loans.filter((l) => l.status === "ACTIVE");
  const loanEmi = activeLoans.reduce((s, l) => s + Math.max(0, l.emi), 0);
  const cards = data.cards.filter((c) => c.active !== false);
  const cardMinimums = cards.reduce((s, c) => s + Math.max(0, c.currentBalance) * CARD_MIN_DUE_SHARE, 0);
  // The loan accounts and the EMI debits in the statement describe the same payments: take the larger, never the sum.
  const obligations = Math.max(loanEmi, bankMonthly) + cardMinimums;
  let debtRatio = 0;
  if (Number.isNaN(monthlyIncome)) {
    sources.debtRatio = { origin: "not-available", detail: "Needs a monthly income to compare against" };
  } else {
    debtRatio = clampKey("debtRatio", obligations / monthlyIncome);
    sources.debtRatio = {
      origin: loanEmi >= bankMonthly && activeLoans.length > 0 ? "loan-account" : "bank-statement",
      detail: "Monthly loan EMIs and card minimum payments divided by monthly income",
    };
  }

  // Utilization: card balances over card limits.
  const limitSum = cards.reduce((s, c) => s + Math.max(0, c.creditLimit), 0);
  let utilization = 0;
  if (cards.length > 0 && limitSum > 0) {
    utilization = clampKey("utilization", cards.reduce((s, c) => s + Math.max(0, c.currentBalance), 0) / limitSum);
    sources.utilization = { origin: "credit-card", detail: `Total balance over total limit across ${cards.length} card${cards.length === 1 ? "" : "s"}` };
  } else {
    sources.utilization = { origin: "not-available", detail: "No credit card with a limit was shared" };
  }

  // Open lines.
  const lines = cards.length + activeLoans.length;
  const openCreditLines = clampKey("openCreditLines", lines);
  sources.openCreditLines =
    lines > 0
      ? {
          origin: cards.length >= activeLoans.length ? "credit-card" : "loan-account",
          detail: `${cards.length} active card${cards.length === 1 ? "" : "s"} and ${activeLoans.length} active loan${activeLoans.length === 1 ? "" : "s"}`,
        }
      : { origin: "not-available", detail: "No active card or loan was shared" };

  // Late payments: account-months in each DPD bucket over the last 24 months.
  const window = lastMonths(data.period.to, LATE_WINDOW_MONTHS);
  const counts = { late30: 0, late60: 0, late90: 0 };
  for (const entry of [...cards.flatMap((c) => c.dpd), ...data.loans.flatMap((l) => l.dpd)]) {
    if (!window.has(entry.month)) continue;
    const bucket = dpdBucket(entry.dpd);
    if (bucket) counts[bucket] += 1;
  }
  const lateHave = cards.length + data.loans.length > 0;
  const lateOrigin = cards.length > 0 ? "credit-card" : "loan-account";
  for (const [key, label] of [
    ["late30", "30 to 59"],
    ["late60", "60 to 89"],
    ["late90", "90 or more"],
  ] as const) {
    sources[key] = lateHave
      ? { origin: lateOrigin, detail: `Months with ${label} days past due on cards and loans, last ${LATE_WINDOW_MONTHS} months` }
      : { origin: "not-available", detail: "No card or loan history was shared" };
  }

  const applicant: Applicant = {
    monthlyIncome,
    utilization,
    debtRatio,
    openCreditLines,
    late30: clampKey("late30", counts.late30),
    late60: clampKey("late60", counts.late60),
    late90: clampKey("late90", counts.late90),
  };
  return { applicant, sources };
}

/** The accounts the user linked, for display. Numbers are already masked by the source. */
export function linkedAccounts(data: AAFinancialData): LinkedAccount[] {
  return [
    ...data.deposits.map((a): LinkedAccount => ({ kind: "deposit", institution: a.institution, masked: a.masked })),
    ...data.cards.map((a): LinkedAccount => ({ kind: "credit-card", institution: a.institution, masked: a.masked })),
    ...data.loans.map((a): LinkedAccount => ({ kind: "loan", institution: a.institution, masked: a.masked })),
  ];
}
