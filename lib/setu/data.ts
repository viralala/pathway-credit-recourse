import "server-only";
import { setuFetch } from "./client";
import type {
  NormalizedFinancialData,
  SetuAccountData,
  SetuDataSessionCreateResponse,
  SetuFIDataResponse,
  SetuTransaction,
} from "./types";

/**
 * Initiates a Data Session with Setu for an approved (ACTIVE) consent.
 */
export async function createSetuDataSession(consentId: string): Promise<{
  success: boolean;
  sessionId?: string;
  status?: string;
  error?: string;
}> {
  if (!consentId || typeof consentId !== "string") {
    return { success: false, error: "Valid consentId is required to create a data session." };
  }

  const response = await setuFetch<SetuDataSessionCreateResponse>("/v2/sessions", {
    method: "POST",
    body: JSON.stringify({
      consentId,
      format: "json",
    }),
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || "Unable to initiate Setu AA data session.",
    };
  }

  return {
    success: true,
    sessionId: response.data.id,
    status: response.data.status,
  };
}

/**
 * Fetches decrypted financial data for a ready data session.
 */
export async function fetchSetuDataSession(sessionId: string): Promise<{
  success: boolean;
  data?: SetuFIDataResponse;
  status?: string;
  error?: string;
}> {
  if (!sessionId || typeof sessionId !== "string") {
    return { success: false, error: "Valid sessionId is required." };
  }

  const response = await setuFetch<SetuFIDataResponse>(`/v2/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to fetch financial data from Setu session.",
    };
  }

  return {
    success: true,
    data: response.data,
    status: response.data.status,
  };
}

/**
 * Normalizes raw financial information into Pathway derived attributes.
 *
 * DATA MINIMIZATION & PRIVACY POLICY:
 * - Operates only in memory on the server during the immediate request.
 * - Extracts aggregated figures (monthly income, fixed obligations, debt ratio).
 * - Raw transaction lines, bank account numbers, and personal identifiers are immediately discarded.
 */
export function normalizeFinancialData(raw: SetuFIDataResponse): NormalizedFinancialData {
  const accounts: SetuAccountData[] = [];

  if (Array.isArray(raw.accounts)) {
    accounts.push(...raw.accounts);
  }

  if (Array.isArray(raw.fips)) {
    for (const fip of raw.fips) {
      if (Array.isArray(fip.accounts)) {
        accounts.push(...fip.accounts);
      }
    }
  }

  const allTransactions: SetuTransaction[] = [];
  for (const acc of accounts) {
    if (Array.isArray(acc.transactions?.transaction)) {
      allTransactions.push(...acc.transactions.transaction);
    }
  }

  // Monthly buckets for inflows (credits) and outflows (debits)
  const monthlyCredits = new Map<string, number>();
  const monthlyDebits = new Map<string, number>();
  const recurringObligationDebits: number[] = [];

  const SALARY_REGEX = /\b(sal|salary|payroll|neft.*cr|ach.*cr|imps.*cr|wages|stipend)\b/i;
  const OBLIGATION_REGEX = /\b(emi|loan|nach|mandate|card.*pay|bajaj|hdfc.*loan|sbi.*loan|finance|equitas|chola)\b/i;

  let salaryTaggedCreditCount = 0;
  let totalCreditAmount = 0;
  let totalDebitAmount = 0;

  for (const tx of allTransactions) {
    const rawAmt = typeof tx.amount === "number" ? tx.amount : Number(tx.amount);
    const amount = Number.isFinite(rawAmt) && rawAmt > 0 ? rawAmt : 0;
    if (amount <= 0) continue;

    const dateStr = tx.transactionTimestamp || tx.valueDate || new Date().toISOString();
    const monthKey = dateStr.slice(0, 7); // e.g. "2026-05"
    const narration = (tx.narration || "").trim();
    const isCredit = (tx.type || "").toUpperCase() === "CREDIT";
    const isDebit = (tx.type || "").toUpperCase() === "DEBIT";

    if (isCredit) {
      totalCreditAmount += amount;
      monthlyCredits.set(monthKey, (monthlyCredits.get(monthKey) || 0) + amount);
      if (SALARY_REGEX.test(narration) && amount >= 10000) {
        salaryTaggedCreditCount++;
      }
    } else if (isDebit) {
      totalDebitAmount += amount;
      monthlyDebits.set(monthKey, (monthlyDebits.get(monthKey) || 0) + amount);
      if (OBLIGATION_REGEX.test(narration) && amount >= 500) {
        recurringObligationDebits.push(amount);
      }
    }
  }

  const monthsCount = Math.max(1, Math.min(6, Math.max(monthlyCredits.size, monthlyDebits.size)));

  // Calculate regular monthly income from median/average monthly inflow
  const creditMonthlyValues = Array.from(monthlyCredits.values());
  let derivedMonthlyIncome = 45000; // Sensible educational baseline fallback

  if (creditMonthlyValues.length > 0) {
    creditMonthlyValues.sort((a, b) => a - b);
    const mid = Math.floor(creditMonthlyValues.length / 2);
    const medianInflow =
      creditMonthlyValues.length % 2 !== 0
        ? creditMonthlyValues[mid]
        : (creditMonthlyValues[mid - 1] + creditMonthlyValues[mid]) / 2;

    // Use median monthly inflow clamped to realistic bounds
    derivedMonthlyIncome = Math.round(Math.max(15000, Math.min(2000000, medianInflow)));
  }

  // Calculate monthly obligations from detected recurring EMI / loan debits
  let monthlyObligations = 0;
  if (recurringObligationDebits.length > 0) {
    const totalObligations = recurringObligationDebits.reduce((sum, v) => sum + v, 0);
    monthlyObligations = Math.round(totalObligations / monthsCount);
  } else {
    // If no specific EMI tagged, estimate fixed obligations at ~25% of monthly debits
    const avgMonthlyDebit = totalDebitAmount / monthsCount;
    monthlyObligations = Math.round(Math.min(derivedMonthlyIncome * 0.7, avgMonthlyDebit * 0.25));
  }

  // Calculate debt-to-income ratio (clamped between 0.05 and 2.5)
  const debtRatio = Number(Math.max(0.05, Math.min(2.5, monthlyObligations / Math.max(1, derivedMonthlyIncome))).toFixed(2));

  // Open credit lines: based on number of linked accounts + detected loan accounts
  const detectedAccountsCount = Math.max(1, accounts.length);
  const openCreditLines = Math.min(20, Math.max(2, detectedAccountsCount + (recurringObligationDebits.length > 0 ? 2 : 1)));

  // Utilization: standard baseline of 35%
  const utilization = 0.35;

  const salaryConfidence: "high" | "medium" | "low" | "unverified" =
    salaryTaggedCreditCount >= 3 ? "high" : salaryTaggedCreditCount >= 1 ? "medium" : creditMonthlyValues.length >= 3 ? "low" : "unverified";

  return {
    monthlyIncome: derivedMonthlyIncome,
    monthlyObligations,
    debtRatio,
    utilization,
    openCreditLines,
    salaryConfidence,
    averageMonthlyInflow: Math.round(totalCreditAmount / monthsCount),
    averageMonthlyOutflow: Math.round(totalDebitAmount / monthsCount),
    detectedAccountsCount,
    dataRangeMonths: monthsCount,
    source: "setu_account_aggregator_sandbox",
    retrievedAt: new Date().toISOString(),
  };
}
