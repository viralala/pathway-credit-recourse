/**
 * Setu Account Aggregator (AA) Type Definitions
 * Strict TypeScript types for Setu AA Gateway v2 integration (Sandbox & Production).
 */

export type SetuConsentStatus = "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED" | "FAILED";

export type SetuDataSessionStatus = "PENDING" | "READY" | "PROCESSING" | "FAILED" | "EXPIRED";

export interface SetuConfig {
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
  baseUrl: string;
}

export interface SetuPurpose {
  code: string;
  refUri?: string;
  text: string;
  Category?: {
    type: string;
  };
}

export interface SetuFIDataRange {
  from: string; // ISO string e.g. "2023-01-01T00:00:00.000Z"
  to: string;   // ISO string e.g. "2023-06-30T23:59:59.999Z"
}

export interface SetuDataLife {
  unit: "MONTH" | "YEAR" | "DAY" | "INF";
  value: number;
}

export interface SetuFrequency {
  unit: "MONTH" | "YEAR" | "DAY" | "HOUR" | "INF";
  value: number;
}

export interface SetuConsentDetail {
  consentMode: "STORE" | "VIEW";
  fetchType: "ONETIME" | "PERIODIC";
  consentTypes: Array<"TRANSACTIONS" | "PROFILE" | "SUMMARY">;
  fiTypes: Array<"DEPOSIT" | "TERM_DEPOSIT" | "RECURRING_DEPOSIT" | "CREDIT_CARD" | "MUTUAL_FUNDS">;
  DataConsumer?: {
    id: string;
  };
  Customer: {
    id: string; // Phone e.g. "9876543210@setu" or phone number
  };
  Purpose: SetuPurpose;
  FIDataRange: SetuFIDataRange;
  DataLife: SetuDataLife;
  Frequency: SetuFrequency;
}

export interface SetuConsentCreateRequest {
  Detail: SetuConsentDetail;
  redirectUrl?: string;
  context?: Array<{
    key: string;
    value: string;
  }>;
}

export interface SetuConsentCreateResponse {
  id: string;
  url: string;
  status: SetuConsentStatus;
  detail?: SetuConsentDetail;
  traceId?: string;
}

export interface SetuConsentStatusResponse {
  id: string;
  status: SetuConsentStatus;
  consentId?: string;
  Detail?: SetuConsentDetail;
  approvedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  traceId?: string;
}

export interface SetuDataSessionCreateRequest {
  consentId: string;
  DataRange?: SetuFIDataRange;
  format?: "json" | "xml";
}

export interface SetuDataSessionCreateResponse {
  id: string;
  status: SetuDataSessionStatus;
  consentId: string;
  traceId?: string;
}

export interface SetuAccountSummary {
  currentBalance?: number | string;
  currency?: string;
  type?: string;
  accountType?: string;
  branch?: string;
  ifsc?: string;
  status?: string;
}

export interface SetuTransaction {
  txnId?: string;
  type?: "DEBIT" | "CREDIT" | string;
  mode?: string;
  amount?: number | string;
  currentBalance?: number | string;
  transactionTimestamp?: string;
  valueDate?: string;
  narration?: string;
  reference?: string;
}

export interface SetuAccountData {
  maskedAccNumber?: string;
  linkedAccRef?: string;
  fipId?: string;
  type?: string;
  summary?: SetuAccountSummary;
  transactions?: {
    startDate?: string;
    endDate?: string;
    transaction?: SetuTransaction[];
  };
}

export interface SetuFIDataResponse {
  id: string;
  status: SetuDataSessionStatus;
  consentId: string;
  fips?: Array<{
    fipId: string;
    fipName?: string;
    accounts?: SetuAccountData[];
  }>;
  accounts?: SetuAccountData[];
  data?: unknown;
}

/**
 * Normalized financial indicators derived on the server from consented bank data.
 * DATA MINIMIZATION: Only summary indicators are retained, never raw transaction histories.
 */
export interface NormalizedFinancialData {
  monthlyIncome: number;
  monthlyObligations: number;
  debtRatio: number;
  utilization: number;
  openCreditLines: number;
  salaryConfidence: "high" | "medium" | "low" | "unverified";
  averageMonthlyInflow: number;
  averageMonthlyOutflow: number;
  detectedAccountsCount: number;
  dataRangeMonths: number;
  source: "setu_account_aggregator_sandbox";
  retrievedAt: string;
}

export interface SetuWebhookPayload {
  type: "CONSENT_STATUS_UPDATE" | "DATA_READY" | "CONSENT_REVOKED" | string;
  consentId?: string;
  consentCollectionId?: string;
  sessionId?: string;
  status?: SetuConsentStatus | SetuDataSessionStatus | string;
  timestamp?: string;
  data?: Record<string, unknown>;
}
