import { getAuthenticatedUser } from "@/lib/security/auth-check";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { isSetuConfigured } from "@/lib/setu/config";
import { createSetuDataSession, fetchSetuDataSession, normalizeFinancialData } from "@/lib/setu/data";
import { safeLogSetuEvent } from "@/lib/setu/security";
import type { NormalizedFinancialData, SetuFIDataResponse } from "@/lib/setu/types";
import type { Json } from "@/lib/supabase/types";
import { z } from "zod";

const dataFetchBodySchema = z.object({
  consentId: z.string().min(3),
});

/**
 * Generates realistic sandbox FIP deposit statement data for development testing.
 */
function generateSandboxMockFIData(consentId: string): SetuFIDataResponse {
  const now = new Date();
  const txns = [];

  // Generate 6 months of simulated salary credits (approx ₹62,000) and recurring EMI debits (approx ₹12,500)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Monthly Salary Credit on 1st of month
    txns.push({
      txnId: `TXN_SAL_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type: "CREDIT",
      mode: "NEFT",
      amount: 62000,
      currentBalance: 85000 + i * 2000,
      transactionTimestamp: `${dateStr}T09:30:00.000Z`,
      narration: "ACH CR TECH CORP SALARY FOR THE MONTH",
    });

    // Monthly Auto Loan EMI debit on 5th of month
    txns.push({
      txnId: `TXN_EMI_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type: "DEBIT",
      mode: "NACH",
      amount: 12500,
      currentBalance: 72500 + i * 2000,
      transactionTimestamp: `${dateStr}T14:15:00.000Z`,
      narration: "NACH DR HDFC BANK AUTO LOAN EMI",
    });

    // Monthly Utility / Living Expenses debit on 15th
    txns.push({
      txnId: `TXN_EXP_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type: "DEBIT",
      mode: "UPI",
      amount: 18000,
      currentBalance: 54500 + i * 2000,
      transactionTimestamp: `${dateStr}T18:00:00.000Z`,
      narration: "UPI DR UTILITY AND LIVING EXPENSES",
    });
  }

  return {
    id: `session_sbx_${Date.now()}`,
    status: "READY",
    consentId,
    accounts: [
      {
        maskedAccNumber: "XXXX-XXXX-1234",
        linkedAccRef: "ACC-REF-8899",
        fipId: "FIP-HDFC-MOCK",
        type: "SAVINGS",
        summary: {
          currentBalance: 65400,
          currency: "INR",
          type: "SAVINGS",
          status: "ACTIVE",
        },
        transactions: {
          startDate: new Date(now.getTime() - 180 * 86400000).toISOString(),
          endDate: now.toISOString(),
          transaction: txns,
        },
      },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const { authenticated, user, supabase } = await getAuthenticatedUser();
    if (!authenticated || !user) {
      return apiError("UNAUTHORIZED", "You must be signed in to fetch consented financial data", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = dataFetchBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid data fetch request", 400, parsed.error.flatten());
    }

    const { consentId } = parsed.data;

    // Verify user authorization: consent MUST belong to this authenticated user
    const { data: consentRecord } = await supabase
      .from("aa_consents")
      .select("id, status, user_id, normalized_data")
      .eq("consent_id", consentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!consentRecord) {
      return apiError("NOT_FOUND", "Consent request not found for this account", 404);
    }

    // Idempotency: If already fetched and normalized, return the cached derived values
    if (consentRecord.normalized_data && typeof consentRecord.normalized_data === "object") {
      return apiSuccess({
        consentId,
        normalized: (consentRecord.normalized_data as unknown) as NormalizedFinancialData,
      });
    }

    let normalized: NormalizedFinancialData;

    if (isSetuConfigured()) {
      // 1. Create Data Session
      const sessionRes = await createSetuDataSession(consentId);
      if (!sessionRes.success || !sessionRes.sessionId) {
        return apiError("INTERNAL_ERROR", sessionRes.error || "Failed to initialize Setu AA data session", 502);
      }

      // 2. Fetch Decrypted Financial Information
      const dataRes = await fetchSetuDataSession(sessionRes.sessionId);
      if (!dataRes.success || !dataRes.data) {
        return apiError("INTERNAL_ERROR", dataRes.error || "Failed to retrieve financial data from Setu", 502);
      }

      // 3. Normalize into derived attributes (Data minimization)
      normalized = normalizeFinancialData(dataRes.data);
    } else {
      // Sandbox development fallback using realistic mock FIP statements
      const mockRaw = generateSandboxMockFIData(consentId);
      normalized = normalizeFinancialData(mockRaw);
    }

    // Persist ONLY the derived normalized values (NEVER raw bank transactions)
    try {
      await supabase
        .from("aa_consents")
        .update({
          status: "ACTIVE",
          normalized_data: (normalized as unknown) as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("consent_id", consentId)
        .eq("user_id", user.id);
    } catch {
      // Non-blocking update
    }

    safeLogSetuEvent("Setu data fetch and normalization completed", {
      consentId,
      monthlyIncome: normalized.monthlyIncome,
      debtRatio: normalized.debtRatio,
      accountsCount: normalized.detectedAccountsCount,
    });

    return apiSuccess({
      consentId,
      normalized,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error fetching financial data from Setu";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
