import { PRICING, type RateTier } from "./pricing";

/**
 * Offer check: the true annualised cost of a loan offer.
 *
 * Instant-loan apps often advertise a small "interest" figure while deducting large fees upfront
 * and asking for repayment within days. This engine works from cash flows only: what actually
 * reaches you on day 0, and what you pay back on which day. The daily internal rate of return of
 * those flows, annualised, is the true APR, so fees, short tenures and frequent instalments are
 * all priced in automatically.
 *
 * Everything here is pure (no I/O, no dates, no randomness) and runs in the browser.
 * Amounts are whole rupees. Currency stays a type so formatting has one place to change.
 */

/* ------------------------------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------------------------- */

export type Currency = "INR";
export const CURRENCIES: Currency[] = ["INR"];
export const CURRENCY_FORMAT: Record<Currency, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" },
};

/** Days between instalments. "Monthly" is treated as 30 days (see the day-count note on `analyzeOffer`). */
export type Frequency = 7 | 14 | 30;
export const FREQUENCIES: Frequency[] = [7, 14, 30];

export type Repayment =
  /** One payment of `amount` after `days` days. */
  | { kind: "bullet"; amount: number; days: number }
  /** `count` equal payments of `amount`, the first after `everyDays` days, then every `everyDays` days. */
  | { kind: "instalments"; count: number; amount: number; everyDays: Frequency };

export interface OfferInput {
  /** Amount sanctioned: the principal written on the loan agreement. */
  sanctioned: number;
  /** Processing fee deducted before disbursal. */
  processingFee: number;
  /** Any other charge deducted before disbursal (platform, "insurance", verification fees). */
  otherCharges: number;
  /** Tax charged on the fees above, as a percentage (18 means 18%). In India this is GST. */
  gstPct: number;
  repayment: Repayment;
}

/** A dated cash flow from the borrower's side: positive = money received, negative = money paid. */
export interface CashFlow {
  day: number;
  amount: number;
}

export type Severity = "info" | "warning" | "danger";
export const SEVERITY_ORDER: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };

export type Verdict = "fair" | "expensive" | "predatory";

export type TermFlagId = "apr" | "deductions" | "short-tenure" | "received-differs" | "frequent-instalments";

/** Self-check questions the user ticks. Each "yes" becomes a red flag. */
export const CHECKLIST = ["permissions", "noKfs", "thirdParty", "pressure", "unverified"] as const;
export type ChecklistId = (typeof CHECKLIST)[number];
export type Checklist = Partial<Record<ChecklistId, boolean>>;

/** How serious each self-check answer is. Illustrative, like every threshold here. */
export const CHECKLIST_SEVERITY: Record<ChecklistId, Severity> = {
  /** The app asked for access to contacts, photos or call logs. */
  permissions: "danger",
  /** No Key Fact Statement was shown before signing. */
  noKfs: "warning",
  /** The money would be paid into, or collected through, an account that is not yours or the lender's. */
  thirdParty: "danger",
  /** Pressure to accept immediately, threats or harassment. */
  pressure: "danger",
  /** The lender's regulated status could not be verified. */
  unverified: "warning",
};

export type FlagId = TermFlagId | ChecklistId;

export interface RedFlag {
  id: FlagId;
  severity: Severity;
  source: "terms" | "checklist";
  /** The measured value that raised the flag (APR or share as a fraction, days, or an amount). */
  value?: number;
  /** The threshold it crossed, in the same unit as `value`. */
  threshold?: number;
}

/* ------------------------------------------------------------------------------------------------
 * Thresholds and limits
 * ---------------------------------------------------------------------------------------------- */

/**
 * Red-flag thresholds. ALL ILLUSTRATIVE: they are rules of thumb chosen for this demo, not legal
 * limits and not calibrated to any lender or market. The UI labels them as illustrative.
 */
export const OFFER_THRESHOLDS = {
  /** True APR above this is "expensive" (36% a year is a common rule-of-thumb ceiling for consumer credit). */
  aprWarning: 0.36,
  /** True APR above this is "predatory-level cost" (you would pay more than the amount borrowed in a year). */
  aprDanger: 1.0,
  /** Upfront deductions above this share of the sanctioned amount are a warning... */
  deductionsWarning: 0.05,
  /** ...and above this share, a serious flag. */
  deductionsDanger: 0.1,
  /** Repayment due in fewer days than this leaves little time to repay without borrowing again. */
  shortTenureDays: 60,
  /** Instalments due more often than every this many days are flagged for information. */
  monthlyDays: 30,
} as const;

export type OfferThresholds = typeof OFFER_THRESHOLDS;

/** Input bounds, so the solver always works on sensible numbers. */
export const OFFER_LIMITS = {
  maxAmount: 1e11,
  maxDays: 3650,
  maxInstalments: 360,
  maxGstPct: 100,
} as const;

/** Rates at or above this (1,000,000%) are shown as "> 1,000,000%" instead of a number. */
export const RATE_DISPLAY_CAP = 1e4;

/* ------------------------------------------------------------------------------------------------
 * Validation
 * ---------------------------------------------------------------------------------------------- */

export type OfferField =
  | "sanctioned"
  | "processingFee"
  | "otherCharges"
  | "gstPct"
  | "bulletAmount"
  | "bulletDays"
  | "count"
  | "instalment";

export type OfferErrorCode = "required" | "positive" | "nonNegative" | "integer" | "tooLarge" | "percent" | "feesTooHigh";

export type OfferErrors = Partial<Record<OfferField, OfferErrorCode>>;

function checkAmount(v: number, allowZero: boolean): OfferErrorCode | null {
  if (!Number.isFinite(v)) return "required";
  if (allowZero ? v < 0 : v <= 0) return allowZero ? "nonNegative" : "positive";
  if (v > OFFER_LIMITS.maxAmount) return "tooLarge";
  return null;
}

function checkInteger(v: number, max: number): OfferErrorCode | null {
  if (!Number.isFinite(v)) return "required";
  if (v <= 0) return "positive";
  if (!Number.isInteger(v)) return "integer";
  if (v > max) return "tooLarge";
  return null;
}

/** Field-level problems with an offer. Empty object means the offer can be analysed. */
export function validateOffer(input: OfferInput): OfferErrors {
  const e: OfferErrors = {};
  const set = (f: OfferField, c: OfferErrorCode | null) => {
    if (c) e[f] = c;
  };
  set("sanctioned", checkAmount(input.sanctioned, false));
  set("processingFee", checkAmount(input.processingFee, true));
  set("otherCharges", checkAmount(input.otherCharges, true));
  if (!Number.isFinite(input.gstPct)) e.gstPct = "required";
  else if (input.gstPct < 0 || input.gstPct > OFFER_LIMITS.maxGstPct) e.gstPct = "percent";

  const r = input.repayment;
  if (r.kind === "bullet") {
    set("bulletAmount", checkAmount(r.amount, false));
    set("bulletDays", checkInteger(r.days, OFFER_LIMITS.maxDays));
  } else {
    set("count", checkInteger(r.count, OFFER_LIMITS.maxInstalments));
    set("instalment", checkAmount(r.amount, false));
  }

  if (!e.sanctioned && !e.processingFee && !e.otherCharges && !e.gstPct && deductionsOf(input).total >= input.sanctioned) {
    e.processingFee = "feesTooHigh";
  }
  return e;
}

/* ------------------------------------------------------------------------------------------------
 * Cash flows and the IRR solver
 * ---------------------------------------------------------------------------------------------- */

export interface Deductions {
  processingFee: number;
  otherCharges: number;
  /** Tax on the fees (GST in India). */
  tax: number;
  total: number;
}

/** Everything taken out of the sanctioned amount before the money reaches you. */
export function deductionsOf(input: OfferInput): Deductions {
  const fees = input.processingFee + input.otherCharges;
  const tax = (fees * input.gstPct) / 100;
  return { processingFee: input.processingFee, otherCharges: input.otherCharges, tax, total: fees + tax };
}

/** Day offsets and amounts of every repayment, in order. */
export function paymentSchedule(r: Repayment): CashFlow[] {
  if (r.kind === "bullet") return [{ day: r.days, amount: r.amount }];
  return Array.from({ length: r.count }, (_, i) => ({ day: (i + 1) * r.everyDays, amount: r.amount }));
}

/** Borrower-side cash flows: +received on day 0, then -each repayment on its day. */
export function cashFlows(input: OfferInput): CashFlow[] {
  const received = input.sanctioned - deductionsOf(input).total;
  return [{ day: 0, amount: received }, ...paymentSchedule(input.repayment).map((p) => ({ day: p.day, amount: -p.amount }))];
}

/** Net present value of the flows at a daily rate `r` (r > -1). */
export function npv(flows: CashFlow[], r: number): number {
  let s = 0;
  for (const f of flows) s += f.amount / Math.pow(1 + r, f.day);
  return s;
}

/**
 * Daily internal rate of return: the r at which npv(flows, r) = 0.
 *
 * Built for a conventional loan (money in on day 0, payments out later). For those flows the NPV
 * rises strictly with r, so there is exactly one root and bisection always finds it:
 *  - repaid more than received: root above 0 (the bracket is grown by doubling);
 *  - repaid exactly what was received: 0;
 *  - repaid less than received: root between -1 and 0 (a negative cost, handled without error).
 * Returns null only if the flows have no sign change (nothing received or nothing repaid) or the
 * rate is beyond any representable bracket.
 */
export function solveDailyRate(flows: CashFlow[]): number | null {
  const inflow = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const outflow = flows.filter((f) => f.amount < 0).reduce((s, f) => s - f.amount, 0);
  if (!(inflow > 0) || !(outflow > 0)) return null;

  const atZero = inflow - outflow; // npv(flows, 0)
  if (Math.abs(atZero) <= 1e-12 * Math.max(inflow, outflow)) return 0;

  let lo: number;
  let hi: number;
  if (atZero < 0) {
    // Costs money: the rate is positive. Grow the bracket until npv turns positive.
    lo = 0;
    hi = 1e-3;
    while (npv(flows, hi) < 0) {
      lo = hi;
      hi *= 2;
      if (hi > 1e18) return null;
    }
  } else {
    // Repaid less than received: the rate is negative. Move towards -1 until npv turns negative.
    hi = 0;
    lo = -0.5;
    while (npv(flows, lo) > 0) {
      hi = lo;
      lo = -1 + (lo + 1) / 2;
      if (lo + 1 < 1e-15) return null;
    }
  }

  for (let i = 0; i < 500; i++) {
    const mid = (lo + hi) / 2;
    if (mid <= lo || mid >= hi) break; // bracket is one float wide: converged
    const v = npv(flows, mid);
    if (v === 0) return mid;
    if (v < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------------------------------------
 * Analysis
 * ---------------------------------------------------------------------------------------------- */

export interface OfferAnalysis {
  input: OfferInput;
  sanctioned: number;
  deductions: Deductions;
  /** What actually reaches your account on day 0. */
  received: number;
  flows: CashFlow[];
  /** Number of repayments. */
  paymentCount: number;
  /** Days between instalments, or null for a single bullet repayment. */
  periodDays: number | null;
  totalRepaid: number;
  /** Total cost of credit: repaid minus received. Negative if you repay less than you receive. */
  costOfCredit: number;
  /** Cost of credit as a share of the amount received. */
  costShareOfReceived: number;
  /** Upfront deductions as a share of the sanctioned amount. */
  feeShareOfSanction: number;
  /** Day of the last repayment. */
  tenureDays: number;
  /** Daily IRR of the cash flows. Infinity if too large to represent (practically unreachable). */
  dailyRate: number;
  /** True APR: nominal annual rate = daily rate x 365. */
  apr: number;
  /** Effective annual rate, compounded daily: (1 + daily rate)^365 - 1. May be Infinity. */
  effectiveAnnualRate: number;
  verdict: Verdict;
  /** Red flags raised by the numbers (the self-check adds more via `allFlags`). */
  flags: RedFlag[];
}

export type OfferResult = { ok: true; analysis: OfferAnalysis } | { ok: false; errors: OfferErrors };

/** Cost verdict from the true APR. A tiny tolerance keeps an exact 36% offer "fair". */
export function verdictFor(apr: number, t: OfferThresholds = OFFER_THRESHOLDS): Verdict {
  if (apr > t.aprDanger + 1e-9) return "predatory";
  if (apr > t.aprWarning + 1e-9) return "expensive";
  return "fair";
}

/** Red flags raised by the offer's numbers alone. */
export function termFlags(
  a: Pick<OfferAnalysis, "apr" | "feeShareOfSanction" | "tenureDays" | "deductions" | "periodDays">,
  t: OfferThresholds = OFFER_THRESHOLDS,
): RedFlag[] {
  const flags: RedFlag[] = [];
  const eps = 1e-9;
  if (a.apr > t.aprDanger + eps) flags.push({ id: "apr", severity: "danger", source: "terms", value: a.apr, threshold: t.aprDanger });
  else if (a.apr > t.aprWarning + eps)
    flags.push({ id: "apr", severity: "warning", source: "terms", value: a.apr, threshold: t.aprWarning });

  if (a.feeShareOfSanction > t.deductionsDanger + eps)
    flags.push({ id: "deductions", severity: "danger", source: "terms", value: a.feeShareOfSanction, threshold: t.deductionsDanger });
  else if (a.feeShareOfSanction > t.deductionsWarning + eps)
    flags.push({ id: "deductions", severity: "warning", source: "terms", value: a.feeShareOfSanction, threshold: t.deductionsWarning });

  if (a.tenureDays < t.shortTenureDays)
    flags.push({ id: "short-tenure", severity: "warning", source: "terms", value: a.tenureDays, threshold: t.shortTenureDays });

  if (a.deductions.total > 0) flags.push({ id: "received-differs", severity: "info", source: "terms", value: a.deductions.total });

  if (a.periodDays !== null && a.periodDays < t.monthlyDays)
    flags.push({ id: "frequent-instalments", severity: "info", source: "terms", value: a.periodDays, threshold: t.monthlyDays });

  return sortFlags(flags);
}

/** Flags from the self-check: one per question answered "yes". */
export function checklistFlags(c: Checklist): RedFlag[] {
  return sortFlags(CHECKLIST.filter((id) => c[id]).map((id) => ({ id, severity: CHECKLIST_SEVERITY[id], source: "checklist" as const })));
}

/** Most serious first; stable within a severity. */
export function sortFlags(flags: RedFlag[]): RedFlag[] {
  return flags
    .map((f, i) => ({ f, i }))
    .sort((x, y) => SEVERITY_ORDER[x.f.severity] - SEVERITY_ORDER[y.f.severity] || x.i - y.i)
    .map((x) => x.f);
}

/** Every flag for the offer: the numbers plus the self-check, most serious first. */
export function allFlags(a: OfferAnalysis, c: Checklist): RedFlag[] {
  return sortFlags([...a.flags, ...checklistFlags(c)]);
}

/** Count flags by severity. */
export function flagCounts(flags: RedFlag[]): Record<Severity, number> {
  const n: Record<Severity, number> = { danger: 0, warning: 0, info: 0 };
  for (const f of flags) n[f.severity] += 1;
  return n;
}

/**
 * Analyse an offer.
 *
 * Day-count convention: time is counted in days. The true APR is the daily IRR x 365 (a nominal
 * annual rate, the simple annualisation used for APR figures in Key Fact Statements); the
 * effective annual rate compounds the daily rate over 365 days. Monthly instalments are treated
 * as every 30 days, so a loan priced at exactly 1% a month shows as about 12.1% APR
 * ((1.01^(1/30) - 1) x 365), slightly above the 12% a 12-periods-a-year convention would show.
 */
export function analyzeOffer(input: OfferInput, t: OfferThresholds = OFFER_THRESHOLDS): OfferResult {
  const errors = validateOffer(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const deductions = deductionsOf(input);
  const received = input.sanctioned - deductions.total;
  const flows = cashFlows(input);
  const schedule = paymentSchedule(input.repayment);
  const totalRepaid = schedule.reduce((s, p) => s + p.amount, 0);
  const tenureDays = schedule[schedule.length - 1].day;
  const periodDays = input.repayment.kind === "instalments" ? input.repayment.everyDays : null;

  const solved = solveDailyRate(flows);
  const dailyRate = solved ?? Infinity;
  const apr = dailyRate * 365;
  const effectiveAnnualRate = Number.isFinite(dailyRate) ? Math.pow(1 + dailyRate, 365) - 1 : Infinity;
  const costOfCredit = totalRepaid - received;
  const feeShareOfSanction = deductions.total / input.sanctioned;

  const base = {
    input,
    sanctioned: input.sanctioned,
    deductions,
    received,
    flows,
    paymentCount: schedule.length,
    periodDays,
    totalRepaid,
    costOfCredit,
    costShareOfReceived: costOfCredit / received,
    feeShareOfSanction,
    tenureDays,
    dailyRate,
    apr,
    effectiveAnnualRate,
    verdict: verdictFor(apr, t),
  };
  return { ok: true, analysis: { ...base, flags: termFlags(base, t) } };
}

/* ------------------------------------------------------------------------------------------------
 * What you get vs what you pay
 * ---------------------------------------------------------------------------------------------- */

export interface CostBreakdown {
  /** Repayments that only give back the money you actually received. */
  principal: number;
  /** Repayments that cover the upfront deductions (money you never received). */
  fees: number;
  /** Repayments above the sanctioned amount: interest and any other charges. */
  interest: number;
}

/**
 * Split the total repaid into the parts of the story: the money you received, the fees you repay
 * without ever having had them, and the interest on top. The parts always add up to the total
 * repaid and are never negative (an offer repaying less than you received has zero fees/interest).
 */
export function costBreakdown(a: Pick<OfferAnalysis, "received" | "sanctioned" | "totalRepaid">): CostBreakdown {
  const principal = Math.min(a.totalRepaid, a.received);
  const fees = Math.max(0, Math.min(a.totalRepaid, a.sanctioned) - a.received);
  const interest = Math.max(0, a.totalRepaid - Math.max(a.sanctioned, a.received));
  return { principal, fees, interest };
}

/* ------------------------------------------------------------------------------------------------
 * Comparison with Pathway's illustrative rate tiers
 * ---------------------------------------------------------------------------------------------- */

/**
 * Cost of borrowing the same amount you received, repaid on the same days in the same proportions,
 * if it were priced at `apr` (nominal, daily-compounded as above). Payments are scaled so their
 * present value at the daily rate apr/365 equals the amount received.
 */
export function costAtApr(a: Pick<OfferAnalysis, "received" | "flows">, apr: number): { totalRepaid: number; cost: number } {
  const payments = a.flows.filter((f) => f.amount < 0).map((f) => ({ day: f.day, amount: -f.amount }));
  const r = apr / 365;
  const pv = payments.reduce((s, p) => s + p.amount / Math.pow(1 + r, p.day), 0);
  const nominal = payments.reduce((s, p) => s + p.amount, 0);
  if (!(pv > 0)) return { totalRepaid: a.received, cost: 0 };
  const totalRepaid = (a.received / pv) * nominal;
  return { totalRepaid, cost: totalRepaid - a.received };
}

export interface TierComparison {
  tier: RateTier;
  /** What the same money over the same dates would cost at this tier's APR. */
  cost: number;
  totalRepaid: number;
  /** How much more this offer costs than the tier (negative if the offer is cheaper). */
  extra: number;
}

export interface PathwayComparison {
  fair: TierComparison;
  excellent: TierComparison;
}

function tierById(id: RateTier["id"], p: typeof PRICING): RateTier {
  return p.tiers.find((t) => t.id === id) ?? (id === "excellent" ? p.tiers[0] : p.tiers[p.tiers.length - 1]);
}

/** How much extra this offer costs compared with Pathway's illustrative "fair" and "excellent" tier APRs. */
export function compareWithPathway(a: OfferAnalysis, p: typeof PRICING = PRICING): PathwayComparison {
  const one = (tier: RateTier): TierComparison => {
    const { totalRepaid, cost } = costAtApr(a, tier.apr);
    return { tier, cost, totalRepaid, extra: a.costOfCredit - cost };
  };
  return { fair: one(tierById("fair", p)), excellent: one(tierById("excellent", p)) };
}

/* ------------------------------------------------------------------------------------------------
 * Form <-> input (the UI keeps raw strings so people can type freely)
 * ---------------------------------------------------------------------------------------------- */

export type RepaymentKind = Repayment["kind"];

export interface OfferForm {
  currency: Currency;
  sanctioned: string;
  processingFee: string;
  otherCharges: string;
  gstPct: string;
  kind: RepaymentKind;
  bulletAmount: string;
  bulletDays: string;
  count: string;
  instalment: string;
  everyDays: Frequency;
}

const DEVANAGARI_ZERO = 0x0966;

/**
 * Parse a number typed by a person: ignores grouping commas, spaces, underscores and currency
 * symbols, accepts Devanagari digits. Returns NaN for empty or malformed text.
 */
export function parseNumber(raw: string): number {
  const ascii = raw.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO));
  const s = ascii.replace(/[,\s_₹$]/g, "").replace(/^\+/, "");
  if (s === "" || !/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

/** Optional fields (fees, tax) default to 0 when left blank. */
const optional = (raw: string) => (raw.trim() === "" ? 0 : parseNumber(raw));

export function inputFromForm(f: OfferForm): OfferInput {
  return {
    sanctioned: parseNumber(f.sanctioned),
    processingFee: optional(f.processingFee),
    otherCharges: optional(f.otherCharges),
    gstPct: optional(f.gstPct),
    repayment:
      f.kind === "bullet"
        ? { kind: "bullet", amount: parseNumber(f.bulletAmount), days: parseNumber(f.bulletDays) }
        : { kind: "instalments", count: parseNumber(f.count), amount: parseNumber(f.instalment), everyDays: f.everyDays },
  };
}

const str = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "");

/** Fill a form from an input. Fields of the other repayment kind are left blank. */
export function formFromInput(input: OfferInput, currency: Currency): OfferForm {
  const r = input.repayment;
  return {
    currency,
    sanctioned: str(input.sanctioned),
    processingFee: str(input.processingFee),
    otherCharges: str(input.otherCharges),
    gstPct: str(input.gstPct),
    kind: r.kind,
    bulletAmount: r.kind === "bullet" ? str(r.amount) : "",
    bulletDays: r.kind === "bullet" ? str(r.days) : "",
    count: r.kind === "instalments" ? str(r.count) : "",
    instalment: r.kind === "instalments" ? str(r.amount) : "",
    everyDays: r.kind === "instalments" ? r.everyDays : 30,
  };
}

/** A blank form that keeps the chosen currency, repayment kind and frequency. */
export function emptyOfferForm(keep: Pick<OfferForm, "currency" | "kind" | "everyDays">): OfferForm {
  return {
    ...keep,
    sanctioned: "",
    processingFee: "",
    otherCharges: "",
    gstPct: "",
    bulletAmount: "",
    bulletDays: "",
    count: "",
    instalment: "",
  };
}

/* ------------------------------------------------------------------------------------------------
 * Fictional examples (no real lender is described)
 * ---------------------------------------------------------------------------------------------- */

export type ExampleId = "app7" | "weekly" | "bank";

export interface OfferExample {
  id: ExampleId;
  byCurrency: Record<Currency, OfferInput>;
}

export const OFFER_EXAMPLES: OfferExample[] = [
  {
    // A short "instant" loan: big fee taken upfront, full sanction plus interest due in a week.
    id: "app7",
    byCurrency: {
      INR: { sanctioned: 5000, processingFee: 750, otherCharges: 0, gstPct: 18, repayment: { kind: "bullet", amount: 5250, days: 7 } },
    },
  },
  {
    // Weekly instalments with a fee and a "platform charge" deducted upfront.
    id: "weekly",
    byCurrency: {
      INR: {
        sanctioned: 20000,
        processingFee: 1500,
        otherCharges: 500,
        gstPct: 18,
        repayment: { kind: "instalments", count: 12, amount: 2000, everyDays: 7 },
      },
    },
  },
  {
    // A bank-style personal loan: 1% processing fee, two years of monthly EMIs at about 12% a year.
    id: "bank",
    byCurrency: {
      INR: {
        sanctioned: 100000,
        processingFee: 1000,
        otherCharges: 0,
        gstPct: 18,
        repayment: { kind: "instalments", count: 24, amount: 4708, everyDays: 30 },
      },
    },
  },
];

export function exampleById(id: ExampleId): OfferExample {
  return OFFER_EXAMPLES.find((e) => e.id === id) ?? OFFER_EXAMPLES[0];
}

/* ------------------------------------------------------------------------------------------------
 * Formatting (locale-stable, Latin digits, same as the rest of the app)
 * ---------------------------------------------------------------------------------------------- */

/** Whole-unit money in the chosen currency, e.g. "₹1,00,000". Negative uses a minus sign. */
export function formatMoney(v: number, c: Currency): string {
  const { symbol, locale } = CURRENCY_FORMAT[c];
  const r = Math.round(v);
  return `${r < 0 ? "−" : ""}${symbol}${Math.abs(r).toLocaleString(locale)}`;
}

/** Plain grouped number in the currency's locale. */
export function formatNumber(v: number, c: Currency): string {
  return Math.round(v).toLocaleString(CURRENCY_FORMAT[c].locale);
}

/**
 * A rate (fraction) as a percentage: one decimal below 100% (a trailing ".0" is dropped), whole
 * numbers above, grouped.
 * Very large or infinite rates read "> 1,000,000%" (grouped in the currency's locale).
 */
export function formatRate(v: number, c: Currency = "INR"): string {
  const locale = CURRENCY_FORMAT[c].locale;
  if (!Number.isFinite(v) || v >= RATE_DISPLAY_CAP) return `> ${(RATE_DISPLAY_CAP * 100).toLocaleString(locale)}%`;
  let p = v * 100;
  if (Math.abs(p) < 0.05) p = 0;
  const d = Math.abs(p) < 99.95 ? 1 : 0;
  const s = Math.abs(p)
    .toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d })
    .replace(/\.0$/, "");
  return `${p < 0 ? "−" : ""}${s}%`;
}
