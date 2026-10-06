import { monthsBetween, type AAFinancialData, type AATransaction, type CardAccount, type DepositAccount, type DpdEntry, type LoanAccount } from "./normalize";
import type { DemoProfile } from "./types";

/**
 * Three fictional 12-month datasets for the sandbox. Everything is generated from the month index, so the
 * same profile always yields the same data and the file stays small. Institutions are made up: nothing
 * here names a real bank or card issuer.
 */

export const SANDBOX_BANK = "Sandbox Bank (demo)";
export const SANDBOX_CARD_ISSUER = "Demo Card Co.";
export const SANDBOX_LENDER = "Demo Finance Ltd.";

export const DEMO_PROFILES: readonly DemoProfile[] = ["salaried", "stretched", "thin-file"];

/** The 12 full calendar months before `now`, as ISO dates. */
export function sandboxPeriod(now: Date = new Date()): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const first = new Date(Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth() - 11, 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(first), to: iso(lastDay) };
}

interface Spec {
  income: (i: number) => number; // salary credit for month i; 0 means none that month
  incomeNarration: string;
  incomeMode: string;
  /** Fixed monthly instalments paid from the bank account. */
  emis: { narration: string; amount: number }[];
  cards: { limit: number; balance: number }[];
  loans: { emi: number }[];
  /** Month indexes (0 = oldest) with a 30-59 day late payment on the first card. */
  lateMonths: number[];
}

const SPECS: Record<DemoProfile, Spec> = {
  salaried: {
    income: () => 95_000,
    incomeNarration: "NEFT-ACME TECHNOLOGIES-SALARY",
    incomeMode: "NEFT",
    emis: [
      { narration: "ACH D- HOME LOAN EMI", amount: 18_000 },
      { narration: "NACH-CAR LOAN EMI", amount: 7_000 },
    ],
    cards: [
      { limit: 200_000, balance: 30_000 },
      { limit: 150_000, balance: 20_000 },
    ],
    loans: [{ emi: 18_000 }, { emi: 7_000 }],
    lateMonths: [],
  },
  stretched: {
    income: () => 70_000,
    incomeNarration: "NEFT-NORTHWIND SERVICES-SALARY",
    incomeMode: "NEFT",
    emis: [
      { narration: "ACH D- PERSONAL LOAN EMI", amount: 14_000 },
      { narration: "NACH-CONSUMER LOAN EMI", amount: 8_000 },
    ],
    cards: [
      { limit: 100_000, balance: 92_000 },
      { limit: 80_000, balance: 74_000 },
      { limit: 60_000, balance: 56_000 },
    ],
    loans: [{ emi: 14_000 }, { emi: 8_000 }],
    lateMonths: [4],
  },
  "thin-file": {
    // Freelance payments: no payroll narration, uneven amounts, three months with nothing.
    income: (i) => (i % 4 === 3 ? 0 : 24_000 + ((i * 7) % 5) * 6_000),
    incomeNarration: "NEFT-RAVI TRADERS-INV",
    incomeMode: "NEFT",
    emis: [{ narration: "ACH D- TWO WHEELER LOAN EMI", amount: 4_500 }],
    cards: [{ limit: 50_000, balance: 9_000 }],
    loans: [{ emi: 4_500 }],
    lateMonths: [],
  },
};

const NOISE = ["UPI-GROCERY STORE", "UPI-FUEL STATION", "UPI-ELECTRICITY BILL", "UPI-MOBILE RECHARGE"];

export function buildFixture(profile: DemoProfile, period = sandboxPeriod()): AAFinancialData {
  const spec = SPECS[profile];
  const months = monthsBetween(period.from, period.to);
  const transactions: AATransaction[] = [];
  months.forEach((month, i) => {
    const salary = spec.income(i);
    if (salary > 0) transactions.push({ date: `${month}-01`, amount: salary, type: "CREDIT", narration: `${spec.incomeNarration}-${i + 1}`, mode: spec.incomeMode });
    // A small peer transfer in: not salary, must be ignored by the income rule.
    transactions.push({ date: `${month}-12`, amount: 1_500 + ((i * 37) % 7) * 100, type: "CREDIT", narration: `UPI-FRIEND REFUND-${i + 1}`, mode: "UPI" });
    spec.emis.forEach((e, k) => transactions.push({ date: `${month}-05`, amount: e.amount, type: "DEBIT", narration: `${e.narration} ${k + 1}`, mode: "OTHERS" }));
    NOISE.forEach((narration, k) =>
      transactions.push({ date: `${month}-${String(8 + k * 5).padStart(2, "0")}`, amount: 900 + ((i * 11 + k * 7) % 9) * 450, type: "DEBIT", narration, mode: "UPI" }),
    );
  });

  const dpd = (late: boolean): DpdEntry[] => months.map((month, i) => ({ month, dpd: late && spec.lateMonths.includes(i) ? 35 : 0 }));
  const deposits: DepositAccount[] = [{ institution: SANDBOX_BANK, masked: "XXXX4021", transactions }];
  const cards: CardAccount[] = spec.cards.map((c, k) => ({
    institution: SANDBOX_CARD_ISSUER,
    masked: `XXXX${7310 + k * 11}`,
    currentBalance: c.balance,
    creditLimit: c.limit,
    dpd: dpd(k === 0),
  }));
  const loans: LoanAccount[] = spec.loans.map((l, k) => ({ institution: SANDBOX_LENDER, masked: `XXXX${5520 + k * 13}`, emi: l.emi, status: "ACTIVE", dpd: dpd(false) }));
  return { period, deposits, cards, loans };
}
