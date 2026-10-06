import { SITE_URL } from "../site";
import { sandboxPeriod } from "./fixtures";
import {
  linkedAccounts,
  normalize,
  type AAFinancialData,
  type AATransaction,
  type CardAccount,
  type DepositAccount,
  type DpdEntry,
  type LoanAccount,
} from "./normalize";
import { AAError, type AAProvider } from "./provider";
import type { ConsentStatus } from "./types";

/**
 * Setu Account Aggregator API v2 (https://docs.setu.co/data/account-aggregator).
 *
 * The public docs pages reachable without an account describe the flow (consent, consent status, data session
 * create and fetch) but not the exact payloads. Everything below that could not be confirmed is isolated in the
 * constants and mapper functions marked TODO(verify with Setu sandbox), so fixing a field name is a one-line change.
 * No request or response body is ever logged or stored.
 */

export interface SetuConfig {
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
  baseUrl: string;
}

// TODO(verify with Setu sandbox): sandbox base URL.
export const DEFAULT_SETU_BASE_URL = "https://aa-sandbox.setu.co";
/** Where the approval window lands after approve/decline (app/connect/done). The Pathway tab polls the status itself. */
export const CONSENT_REDIRECT_URL = `${SITE_URL}/connect/done`;

// TODO(verify with Setu sandbox): endpoint paths.
const PATHS = {
  createConsent: "/v2/consents",
  consent: (id: string) => `/v2/consents/${encodeURIComponent(id)}`,
  createSession: "/v2/sessions",
  session: (id: string) => `/v2/sessions/${encodeURIComponent(id)}`,
} as const;

// TODO(verify with Setu sandbox): the consent request body. Purpose code 101 is "wealth management service" in the ReBIT list.
const CONSENT_TEMPLATE = {
  consentTypes: ["PROFILE", "SUMMARY", "TRANSACTIONS"],
  fiTypes: ["DEPOSIT", "CREDIT_CARD", "TERM_DEPOSIT"],
  consentDuration: { unit: "MONTH", value: "1" },
  context: [] as unknown[],
  purpose: { code: "101", text: "Explain a credit decision and plan improvements" },
  fetchType: "ONETIME",
} as const;

// TODO(verify with Setu sandbox): the virtual user address format for a mobile number.
const vuaOf = (mobile: string) => `${mobile}@onemoney`;

// TODO(verify with Setu sandbox): how Setu reports consent states (REVOKED, PAUSED and the like fold into REJECTED).
const CONSENT_STATUS: Record<string, ConsentStatus> = { PENDING: "PENDING", ACTIVE: "ACTIVE", EXPIRED: "EXPIRED" };

// TODO(verify with Setu sandbox): session states that mean the data can be read.
const SESSION_READY = new Set(["COMPLETED", "PARTIAL"]);
const SESSION_FAILED = new Set(["EXPIRED", "FAILED", "REJECTED"]);
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 1_000;
const REQUEST_TIMEOUT_MS = 10_000;

const ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function readSetuConfig(env: Record<string, string | undefined>): SetuConfig | null {
  const clientId = env.SETU_AA_CLIENT_ID?.trim();
  const clientSecret = env.SETU_AA_CLIENT_SECRET?.trim();
  const productInstanceId = env.SETU_AA_PRODUCT_INSTANCE_ID?.trim();
  if (!clientId || !clientSecret || !productInstanceId) return null;
  const baseUrl = (env.SETU_AA_BASE_URL?.trim() || DEFAULT_SETU_BASE_URL).replace(/\/+$/, "");
  return { clientId, clientSecret, productInstanceId, baseUrl };
}

/** Maps one account of a Setu FI response into the normalizer's input. Lenient: unknown shapes are skipped. */
// TODO(verify with Setu sandbox): the FI type names and the credit card / loan summary field names.
export function mapSetuFiData(fips: unknown, period: { from: string; to: string }): AAFinancialData {
  const out: AAFinancialData = { period, deposits: [], cards: [], loans: [] };
  for (const fip of arr(fips)) {
    const institution = str(obj(fip).fipName) || str(obj(fip).fipID) || "Linked institution";
    for (const acc of arr(obj(fip).accounts)) {
      const account = obj(obj(obj(acc).data).account);
      const type = str(account.type).toLowerCase();
      const summary = obj(account.summary);
      const masked = str(obj(acc).maskedAccNumber) || str(obj(account.profile).maskedAccNumber) || "XXXX";
      if (type.includes("deposit") && !type.includes("term")) {
        const transactions: AATransaction[] = arr(obj(account.transactions).transaction).map((t) => {
          const tx = obj(t);
          return {
            date: (str(tx.transactionTimestamp) || str(tx.valueDate)).slice(0, 10),
            amount: Math.abs(num(tx.amount)),
            type: str(tx.type).toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
            narration: str(tx.narration),
            mode: str(tx.mode),
          };
        });
        out.deposits.push({ institution, masked, transactions } satisfies DepositAccount);
      } else if (type.includes("credit")) {
        out.cards.push({
          institution,
          masked,
          currentBalance: num(summary.currentBalance ?? summary.totalDueAmount),
          creditLimit: num(summary.creditLimit),
          dpd: dpdOf(summary.dpdHistory),
        } satisfies CardAccount);
      } else if (type.includes("loan") || type.includes("term")) {
        const closed = ["CLOSED", "MATURED"].includes(str(summary.status).toUpperCase());
        out.loans.push({
          institution,
          masked,
          emi: num(summary.emiAmount ?? summary.installmentAmount),
          status: closed ? "CLOSED" : "ACTIVE",
          dpd: dpdOf(summary.dpdHistory),
        } satisfies LoanAccount);
      }
    }
  }
  return out;
}

function dpdOf(history: unknown): DpdEntry[] {
  return arr(history).map((h) => ({ month: str(obj(h).month).slice(0, 7), dpd: num(obj(h).dpd) }));
}

export function createSetuProvider(config: SetuConfig, fetchImpl: typeof fetch = fetch): AAProvider {
  async function call(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<Json> {
    let res: Response;
    try {
      res = await fetchImpl(`${config.baseUrl}${path}`, {
        method: init.method,
        headers: {
          "content-type": "application/json",
          // TODO(verify with Setu sandbox): header names.
          "x-client-id": config.clientId,
          "x-client-secret": config.clientSecret,
          "x-product-instance-id": config.productInstanceId,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new AAError("upstream");
    }
    if (res.status === 404) throw new AAError("not_found");
    if (!res.ok) throw new AAError("upstream");
    try {
      return obj(await res.json());
    } catch {
      throw new AAError("upstream");
    }
  }

  const checkId = (id: string) => {
    if (!ID_RE.test(id)) throw new AAError("not_found");
  };

  return {
    mode: "setu",

    async createConsent({ mobile }) {
      if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) throw new AAError("invalid_request", "mobile required");
      const { from, to } = sandboxPeriod();
      const body = await call(PATHS.createConsent, {
        method: "POST",
        body: {
          ...CONSENT_TEMPLATE,
          vua: vuaOf(mobile),
          dataRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
          // TODO(verify with Setu sandbox): field name. Same value as the redirect URL in the Bridge dashboard.
          redirectUrl: CONSENT_REDIRECT_URL,
        },
      });
      const consentId = str(body.id);
      if (!ID_RE.test(consentId)) throw new AAError("upstream");
      return { consentId, mode: "setu", redirectUrl: str(body.url) || null };
    },

    async consentStatus(id) {
      checkId(id);
      const body = await call(PATHS.consent(id), { method: "GET" });
      return { status: CONSENT_STATUS[str(body.status).toUpperCase()] ?? "REJECTED", mode: "setu" };
    },

    async fetchData(id) {
      checkId(id);
      const { from, to } = sandboxPeriod();
      const session = await call(PATHS.createSession, {
        method: "POST",
        body: { consentId: id, format: "json", dataRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` } },
      });
      const sessionId = str(session.id);
      if (!ID_RE.test(sessionId)) throw new AAError("upstream");
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const body = await call(PATHS.session(sessionId), { method: "GET" });
        const status = str(body.status).toUpperCase();
        if (SESSION_READY.has(status)) {
          const data = mapSetuFiData(body.fips, { from, to });
          const { applicant, sources } = normalize(data);
          return { mode: "setu", applicant, sources, period: { from, to }, accounts: linkedAccounts(data) };
        }
        if (SESSION_FAILED.has(status)) throw new AAError("upstream");
        await new Promise((r) => setTimeout(r, POLL_DELAY_MS));
      }
      throw new AAError("not_ready");
    },
  };
}
