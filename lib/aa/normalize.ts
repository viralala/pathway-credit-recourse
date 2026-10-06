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
  /** Account holder's name from the AA profile, when shared. */
  holderName?: string;
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
  /** The months actually read: the requested period, or the statement's own last months when it holds no data there. */
  period: { from: string; to: string };
}

/** Fewest months of salary-like credits that make an income figure trustworthy. */
export const MIN_INCOME_MONTHS = 3;
/** How far back late payments are counted. */
export const LATE_WINDOW_MONTHS = 24;
/** Minimum due on a card, as a share of its balance (a common issuer rule; the AA data has no field for it). */
export const CARD_MIN_DUE_SHARE = 0.05;

const SALARY_RE = /\b(SALARY|SAL|PAYROLL)\b/i;
const OBLIGATION_RE = /\b(EMI|ACH|NACH|ECS|LOAN)\b/i;
/** Credits that are not income: refunds, reversals, cashback, interest and moving money between one's own accounts. */
/** Paying a credit card bill from the bank account. */
const CARD_PAYMENT_RE = /\b(CREDIT ?CARD|CC ?(PAYMENT|PMT|BILL)|CARD ?(PAYMENT|PMT|BILL))\b/i;
/** A bounced or returned debit (EMI, NACH, ECS, cheque) or its charge: a missed payment. */
const BOUNCE_RE = /\b(RETURN|RETURNED|RTN|BOUNCE|BOUNCED|DISHONOU?R(ED)?|INSUFFICIENT|INSUFF)\b/i;
const NOT_INCOME_RE = /\b(REFUND|REV|REVERSAL|REVERSED|CASHBACK|SELF|INTEREST)\b/i;

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

/**
 * The months to read. Normally the requested period; when the statement has fewer than MIN_INCOME_MONTHS months of
 * transactions inside it (sandbox banks return fixed old statements), the statement's own most recent months instead,
 * as many as were requested.
 */
function effectivePeriod(data: AAFinancialData): { from: string; to: string } {
  const all = data.deposits.flatMap((d) => d.transactions).filter((t) => /^\d{4}-\d{2}/.test(t.date) && t.amount > 0);
  const requested = monthsBetween(data.period.from, data.period.to);
  const inRequested = new Set(all.map((t) => monthOf(t.date)).filter((m) => requested.includes(m)));
  if (inRequested.size >= MIN_INCOME_MONTHS || all.length === 0) return data.period;
  const latest = all.reduce((max, t) => (t.date > max ? t.date : max), all[0].date).slice(0, 10);
  const span = [...lastMonths(latest, requested.length)].sort();
  return { from: `${span[0]}-01`, to: latest };
}

export function normalize(data: AAFinancialData): NormalizedApplicant {
  const period = effectivePeriod(data);
  const months = monthsBetween(period.from, period.to);
  const inPeriod = new Set(months);
  const txns = data.deposits.flatMap((d) => d.transactions).filter((t) => inPeriod.has(monthOf(t.date)) && t.amount > 0);
  const periodLabel =
    period === data.period ? `last ${months.length} month${months.length === 1 ? "" : "s"}` : `${months[0]} to ${months[months.length - 1]}`;
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
    // No salary label (common for freelancers, gig and business income): estimate from everything received.
    const received = new Map<string, number>();
    for (const t of txns) {
      if (t.type !== "CREDIT" || NOT_INCOME_RE.test(t.narration)) continue;
      received.set(monthOf(t.date), (received.get(monthOf(t.date)) ?? 0) + t.amount);
    }
    const estimate = Math.round(median([...received.values()]));
    if (received.size >= MIN_INCOME_MONTHS && estimate >= APPLICANT_LIMITS.monthlyIncome.min) {
      monthlyIncome = clampKey("monthlyIncome", estimate);
      sources.monthlyIncome = {
        origin: "bank-statement",
        detail: `Estimate: median money received per month, ${periodLabel} (${received.size} months). No salary was labelled, so check this figure.`,
      };
    } else {
      sources.monthlyIncome = {
        origin: "not-available",
        detail: `Found income in ${Math.max(perMonth.size, received.size)} of ${months.length} months; at least ${MIN_INCOME_MONTHS} are needed. Enter it yourself.`,
      };
    }
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
      detail:
        obligations > 0
          ? "Monthly loan EMIs and card minimum payments divided by monthly income"
          : "No EMI, loan or card payments found in the shared accounts",
    };
  }

  // Utilization: card balances over card limits.
  const limitSum = cards.reduce((s, c) => s + Math.max(0, c.creditLimit), 0);
  let utilization = 0;
  if (cards.length > 0 && limitSum > 0) {
    utilization = clampKey("utilization", cards.reduce((s, c) => s + Math.max(0, c.currentBalance), 0) / limitSum);
    sources.utilization = { origin: "credit-card", detail: `Total balance over total limit across ${cards.length} card${cards.length === 1 ? "" : "s"}` };
  } else if (txns.some((t) => t.type === "DEBIT" && CARD_PAYMENT_RE.test(t.narration))) {
    // The statement pays a card bill, but without the card's limit there is no honest utilization.
    sources.utilization = { origin: "not-available", detail: "Card bill payments found, but the card and its limit were not shared" };
  } else {
    sources.utilization = {
      origin: "bank-statement",
      detail: `No credit card was shared and the statement pays no card bill, ${periodLabel}, so 0% is used. Change it if you have a card.`,
    };
  }

  // Open lines: the shared card and loan accounts, or else the regular loan and card payees in the statement.
  const lines = cards.length + activeLoans.length;
  let openCreditLines: number;
  if (lines > 0) {
    openCreditLines = clampKey("openCreditLines", lines);
    sources.openCreditLines = {
      origin: cards.length >= activeLoans.length ? "credit-card" : "loan-account",
      detail: `${cards.length} active card${cards.length === 1 ? "" : "s"} and ${activeLoans.length} active loan${activeLoans.length === 1 ? "" : "s"}`,
    };
  } else {
    const payees = new Map<string, Set<string>>();
    for (const t of txns) {
      if (t.type !== "DEBIT" || BOUNCE_RE.test(t.narration)) continue;
      if (!OBLIGATION_RE.test(t.narration) && !CARD_PAYMENT_RE.test(t.narration)) continue;
      const key = sourceKey(t.narration);
      if (!key) continue;
      payees.set(key, (payees.get(key) ?? new Set<string>()).add(monthOf(t.date)));
    }
    const regular = [...payees.values()].filter((m) => m.size >= 2).length;
    openCreditLines = clampKey("openCreditLines", regular);
    sources.openCreditLines = {
      origin: "bank-statement",
      detail:
        regular > 0
          ? `${regular} regular loan or card payment${regular === 1 ? "" : "s"} in the statement, ${periodLabel}`
          : `No regular loan or card payments in the statement, ${periodLabel}`,
    };
  }

  // Late payments: account-months in each DPD bucket over the last 24 months.
  const window = lastMonths(period.to, LATE_WINDOW_MONTHS);
  const counts = { late30: 0, late60: 0, late90: 0 };
  for (const entry of [...cards.flatMap((c) => c.dpd), ...data.loans.flatMap((l) => l.dpd)]) {
    if (!window.has(entry.month)) continue;
    const bucket = dpdBucket(entry.dpd);
    if (bucket) counts[bucket] += 1;
  }
  const lateHave = cards.length + data.loans.length > 0;
  const lateOrigin = cards.length > 0 ? "credit-card" : "loan-account";
  if (lateHave) {
    for (const [key, label] of [
      ["late30", "30 to 59"],
      ["late60", "60 to 89"],
      ["late90", "90 or more"],
    ] as const) {
      sources[key] = { origin: lateOrigin, detail: `Months with ${label} days past due on cards and loans, last ${LATE_WINDOW_MONTHS} months` };
    }
  } else {
    // Without card or loan accounts, the statement's bounced payments are the evidence: each month with a bounced
    // EMI, NACH, ECS or cheque debit counts as one missed payment. A statement cannot show how late it became.
    const bounced = new Set(txns.filter((t) => BOUNCE_RE.test(t.narration)).map((t) => monthOf(t.date)));
    counts.late30 = bounced.size;
    sources.late30 = {
      origin: "bank-statement",
      detail:
        bounced.size > 0
          ? `${bounced.size} month${bounced.size === 1 ? "" : "s"} with a bounced EMI or cheque payment, ${periodLabel}`
          : `No bounced EMI or cheque payments, ${periodLabel}`,
    };
    for (const key of ["late60", "late90"] as const) {
      sources[key] = {
        origin: "bank-statement",
        detail: "A bank statement cannot show payments 60 or more days late, so 0 is used. Check your credit report.",
      };
    }
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
  return { applicant, sources, period };
}

/** The accounts the user linked, for display. Numbers are already masked by the source. */
export function linkedAccounts(data: AAFinancialData): LinkedAccount[] {
  return [
    ...data.deposits.map((a): LinkedAccount => ({ kind: "deposit", institution: a.institution, masked: a.masked })),
    ...data.cards.map((a): LinkedAccount => ({ kind: "credit-card", institution: a.institution, masked: a.masked })),
    ...data.loans.map((a): LinkedAccount => ({ kind: "loan", institution: a.institution, masked: a.masked })),
  ];
}
