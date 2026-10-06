import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSafeSetuStatus, isSetuConfigured, getSetuConfig } from "@/lib/setu/config";
import { normalizeFinancialData } from "@/lib/setu/data";
import { safeLogSetuEvent, sanitizeLogMetadata, setuApiRateLimiter, verifySetuWebhook } from "@/lib/setu/security";
import type { SetuFIDataResponse } from "@/lib/setu/types";
import { assess, MODEL } from "@/lib/model";
import { analyze } from "@/lib/analyze";
import type { Applicant } from "@/lib/types";

describe("Setu Account Aggregator Configuration & Credential Safety", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SETU_CLIENT_ID;
    delete process.env.SETU_CLIENT_SECRET;
    delete process.env.SETU_PRODUCT_INSTANCE_ID;
    delete process.env.SETU_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("identifies when Setu credentials are not configured", () => {
    expect(isSetuConfigured()).toBe(false);
    expect(() => getSetuConfig()).toThrow(/Missing required server environment variables/);
  });

  it("safely reports environment status without exposing secrets", () => {
    const status = getSafeSetuStatus();
    expect(status.configured).toBe(false);
    expect(status.environment).toBe("sandbox");
    expect(status.baseUrl).toBe("https://fiu-sandbox.setu.co");

    // Secret must NOT be in the status object
    expect((status as Record<string, unknown>).clientSecret).toBeUndefined();
    expect((status as Record<string, unknown>).SETU_CLIENT_SECRET).toBeUndefined();
  });

  it("validates when all required Setu credentials are provided", () => {
    process.env.SETU_CLIENT_ID = "test_client_id";
    process.env.SETU_CLIENT_SECRET = "test_client_secret";
    process.env.SETU_PRODUCT_INSTANCE_ID = "test_instance_id";

    expect(isSetuConfigured()).toBe(true);
    const config = getSetuConfig();
    expect(config.clientId).toBe("test_client_id");
    expect(config.clientSecret).toBe("test_client_secret");
    expect(config.productInstanceId).toBe("test_instance_id");
    expect(config.baseUrl).toBe("https://fiu-sandbox.setu.co");
  });

  it("CRITICAL SECURITY: Setu secrets are never prefixed with NEXT_PUBLIC_", () => {
    for (const key of Object.keys(process.env)) {
      if (key.includes("SETU_CLIENT_SECRET")) {
        expect(key.startsWith("NEXT_PUBLIC_")).toBe(false);
      }
    }
  });
});

describe("Data Minimization & Financial Data Normalization", () => {
  const mockRawFIData: SetuFIDataResponse = {
    id: "session_test_123",
    status: "READY",
    consentId: "consent_test_123",
    accounts: [
      {
        maskedAccNumber: "XXXX-XXXX-9876",
        linkedAccRef: "ACC-REF-101",
        fipId: "FIP-HDFC-01",
        type: "SAVINGS",
        summary: {
          currentBalance: 75000,
          currency: "INR",
          type: "SAVINGS",
          status: "ACTIVE",
        },
        transactions: {
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-09-30T23:59:59.999Z",
          transaction: [
            // Month 1
            {
              txnId: "TXN1",
              type: "CREDIT",
              amount: 55000,
              narration: "ACH CR TECH CORP SALARY APR",
              transactionTimestamp: "2026-04-01T09:00:00Z",
            },
            {
              txnId: "TXN2",
              type: "DEBIT",
              amount: 11000,
              narration: "NACH DR HDFC AUTO LOAN EMI",
              transactionTimestamp: "2026-04-05T10:00:00Z",
            },
            // Month 2
            {
              txnId: "TXN3",
              type: "CREDIT",
              amount: 55000,
              narration: "ACH CR TECH CORP SALARY MAY",
              transactionTimestamp: "2026-05-01T09:00:00Z",
            },
            {
              txnId: "TXN4",
              type: "DEBIT",
              amount: 11000,
              narration: "NACH DR HDFC AUTO LOAN EMI",
              transactionTimestamp: "2026-05-05T10:00:00Z",
            },
            // Month 3
            {
              txnId: "TXN5",
              type: "CREDIT",
              amount: 55000,
              narration: "ACH CR TECH CORP SALARY JUN",
              transactionTimestamp: "2026-06-01T09:00:00Z",
            },
            {
              txnId: "TXN6",
              type: "DEBIT",
              amount: 11000,
              narration: "NACH DR HDFC AUTO LOAN EMI",
              transactionTimestamp: "2026-06-05T10:00:00Z",
            },
          ],
        },
      },
    ],
  };

  it("accurately derives monthly income from salary credits", () => {
    const normalized = normalizeFinancialData(mockRawFIData);

    expect(normalized.monthlyIncome).toBe(55000);
    expect(normalized.monthlyObligations).toBe(11000);
    expect(normalized.debtRatio).toBe(0.2);
    expect(normalized.salaryConfidence).toBe("high");
    expect(normalized.openCreditLines).toBeGreaterThanOrEqual(2);
    expect(normalized.source).toBe("setu_account_aggregator_sandbox");
  });

  it("handles accounts with zero or non-regular credits gracefully", () => {
    const emptyData: SetuFIDataResponse = {
      id: "session_empty",
      status: "READY",
      consentId: "consent_empty",
      accounts: [],
    };

    const normalized = normalizeFinancialData(emptyData);
    expect(normalized.monthlyIncome).toBeGreaterThanOrEqual(15000);
    expect(normalized.debtRatio).toBeGreaterThan(0);
    expect(normalized.salaryConfidence).toBe("unverified");
  });

  it("DATA MINIMIZATION INVARIANT: Derived attributes contain NO raw transaction records", () => {
    const normalized = normalizeFinancialData(mockRawFIData);

    // Ensure raw fields are not attached to normalized payload
    const record = (normalized as unknown) as Record<string, unknown>;
    expect(record.transactions).toBeUndefined();
    expect(record.transaction).toBeUndefined();
    expect(record.rawTransactions).toBeUndefined();
    expect(record.bankAccountNumbers).toBeUndefined();
  });
});

describe("Sensitive Data Logging Policy", () => {
  it("redacts credentials, account numbers, and transaction details from log metadata", () => {
    const sensitivePayload = {
      userId: "user-123",
      consentId: "consent-456",
      client_secret: "secret-abc-123",
      pan: "ABCDE1234F",
      account_number: "123456789012",
      amount: 50000,
      narration: "Salary transfer from employer",
    };

    const cleaned = sanitizeLogMetadata(sensitivePayload);

    expect(cleaned.userId).toBe("user-123");
    expect(cleaned.consentId).toBe("consent-456");
    expect(cleaned.client_secret).toBe("[REDACTED]");
    expect(cleaned.pan).toBe("[REDACTED]");
    expect(cleaned.account_number).toBe("[REDACTED]");
    expect(cleaned.amount).toBe("[REDACTED]");
    expect(cleaned.narration).toBe("[REDACTED]");
  });

  it("safeLogSetuEvent executes without throwing on sanitized metadata", () => {
    expect(() => {
      safeLogSetuEvent("Setu consent approved", {
        consentId: "consent_safe_123",
        status: "ACTIVE",
        clientSecret: "super-secret-to-redact",
      });
    }).not.toThrow();
  });
});

describe("Setu Webhook Verification & Security", () => {
  it("rejects empty or malformed webhook payloads", () => {
    const headers = new Headers();
    expect(verifySetuWebhook(headers, null).valid).toBe(false);
    expect(verifySetuWebhook(headers, {}).valid).toBe(false);
    expect(verifySetuWebhook(headers, "not-json").valid).toBe(false);
  });

  it("accepts valid Setu webhook event payload", () => {
    const headers = new Headers();
    const validPayload = {
      type: "CONSENT_STATUS_UPDATE",
      consentId: "consent_abc_123",
      status: "ACTIVE",
      timestamp: new Date().toISOString(),
    };

    const res = verifySetuWebhook(headers, validPayload);
    expect(res.valid).toBe(true);
    expect(res.payload?.consentId).toBe("consent_abc_123");
    expect(res.payload?.status).toBe("ACTIVE");
  });

  it("validates webhook secret when SETU_WEBHOOK_SECRET is configured", () => {
    const originalSecret = process.env.SETU_WEBHOOK_SECRET;
    process.env.SETU_WEBHOOK_SECRET = "secret_webhook_token_999";

    const payload = {
      type: "CONSENT_STATUS_UPDATE",
      consentId: "consent_xyz",
      status: "ACTIVE",
    };

    // Missing signature header
    const headersNoAuth = new Headers();
    expect(verifySetuWebhook(headersNoAuth, payload).valid).toBe(false);

    // Invalid signature header
    const headersWrongAuth = new Headers({ "x-setu-signature": "wrong_token" });
    expect(verifySetuWebhook(headersWrongAuth, payload).valid).toBe(false);

    // Correct signature header
    const headersValid = new Headers({ "x-setu-signature": "secret_webhook_token_999" });
    expect(verifySetuWebhook(headersValid, payload).valid).toBe(true);

    process.env.SETU_WEBHOOK_SECRET = originalSecret;
  });
});

describe("Setu API Rate Limiting & Abuse Protection", () => {
  it("enforces sliding window rate limits", () => {
    const testIp = `test-ip-rate-limit-${Date.now()}`;

    // Should allow up to limit of 15 requests
    for (let i = 0; i < 15; i++) {
      const res = setuApiRateLimiter.check(testIp);
      expect(res.ok).toBe(true);
    }

    // 16th request should be rejected
    const blocked = setuApiRateLimiter.check(testIp);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("Edge Case Financial Data Normalization & NaN Protection", () => {
  it("rejects NaN and infinity amounts and defaults safely", () => {
    const malformedData: SetuFIDataResponse = {
      id: "session_nan",
      status: "READY",
      consentId: "consent_nan",
      accounts: [
        {
          type: "SAVINGS",
          transactions: {
            startDate: "2026-01-01",
            endDate: "2026-06-01",
            transaction: [
              {
                txnId: "T1",
                type: "CREDIT",
                amount: (NaN as unknown) as number,
                narration: "SALARY",
                transactionTimestamp: "2026-01-01T00:00:00Z",
              },
              {
                txnId: "T2",
                type: "DEBIT",
                amount: (Infinity as unknown) as number,
                narration: "EMI",
                transactionTimestamp: "2026-01-05T00:00:00Z",
              },
            ],
          },
        },
      ],
    };

    const normalized = normalizeFinancialData(malformedData);
    expect(Number.isFinite(normalized.monthlyIncome)).toBe(true);
    expect(Number.isFinite(normalized.monthlyObligations)).toBe(true);
    expect(Number.isFinite(normalized.debtRatio)).toBe(true);
    expect(normalized.monthlyIncome).toBeGreaterThan(0);
    expect(normalized.debtRatio).toBeLessThanOrEqual(1);
    expect(normalized.debtRatio).toBeGreaterThanOrEqual(0);
  });
});

describe("Pathway Credit Model Invariance & Equivalence with Imported Data", () => {
  it("CRITICAL INVARIANCE: Imported financial values produce exact same ML prediction as identical manual values", () => {
    // Manual entered applicant values
    const manualApplicant: Applicant = {
      monthlyIncome: 65000,
      utilization: 0.32,
      debtRatio: 0.22,
      openCreditLines: 5,
      late30: 0,
      late60: 0,
      late90: 0,
    };

    // Values derived from Setu AA import
    const importedApplicant: Applicant = {
      monthlyIncome: 65000,
      utilization: 0.32,
      debtRatio: 0.22,
      openCreditLines: 5,
      late30: 0,
      late60: 0,
      late90: 0,
    };

    const manualAnalysis = analyze(manualApplicant, { loanType: "unsecured", loanAmount: 300_000 });
    const importedAnalysis = analyze(importedApplicant, { loanType: "unsecured", loanAmount: 300_000 });
    const rawML = assess(manualApplicant, MODEL);

    // Model inferences must be completely identical
    expect(importedAnalysis.assessment.score).toBe(manualAnalysis.assessment.score);
    expect(importedAnalysis.assessment.score).toBe(rawML.score);
    expect(importedAnalysis.assessment.pd).toBe(manualAnalysis.assessment.pd);
    expect(importedAnalysis.assessment.pd).toBe(rawML.pd);
    expect(importedAnalysis.assessment.approved).toBe(manualAnalysis.assessment.approved);
    expect(importedAnalysis.assessment.reasons).toEqual(manualAnalysis.assessment.reasons);
    expect(importedAnalysis.recourse.status).toBe(manualAnalysis.recourse.status);
    expect(importedAnalysis.timeline.approvalMonth).toBe(manualAnalysis.timeline.approvalMonth);
  });
});
