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
 * Endpoints and payloads follow Setu's OpenAPI spec (as published in the generated setu-aa-sdk). Auth: current Bridge
 * credentials are sent as x-client-id / x-client-secret headers; older ones are exchanged for a Bearer token at the
 * org service. Every FIU call also sends x-product-instance-id. Anything still unconfirmed is marked TODO(verify with Setu sandbox).
 * No request or response body is ever logged or stored; on failure only Setu's HTTP status and error code are logged.
 */

export interface SetuConfig {
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
  baseUrl: string;
}

/** FIU API base URL. Production is https://fiu.setu.co (set SETU_AA_BASE_URL). */
export const DEFAULT_SETU_BASE_URL = "https://fiu-sandbox.setu.co";
/** Exchanges Bridge credentials for a Bearer token (same endpoint for sandbox and production credentials). */
export const SETU_LOGIN_URL = "https://orgservice-prod.setu.co/v1/users/login";
/** Where the approval window lands after approve/decline (app/connect/done). The Pathway tab polls the status itself. */
export const CONSENT_REDIRECT_PATH = "/connect/done";
export const CONSENT_REDIRECT_URL = `${SITE_URL}${CONSENT_REDIRECT_PATH}`;

/**
 * The redirect for one consent: the origin the request came in on, so a deployment whose NEXT_PUBLIC_SITE_URL is
 * missing or points at localhost still sends people back to itself. Falls back to SITE_URL; never a non-https host
 * other than localhost.
 */
export function consentRedirectUrl(origin?: string): string {
  try {
    const url = new URL(origin ?? "");
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "https:" || local) return `${url.origin}${CONSENT_REDIRECT_PATH}`;
  } catch {
    // No usable origin.
  }
  return CONSENT_REDIRECT_URL;
}

const PATHS = {
  createConsent: "/v2/consents",
  consent: (id: string) => `/v2/consents/${encodeURIComponent(id)}`,
  createSession: "/v2/sessions",
  session: (id: string) => `/v2/sessions/${encodeURIComponent(id)}`,
} as const;

// Purpose 105 is ReBIT's "explicit one-time consent for accessing data from the accounts". Setu requires purpose,
// dataLife and frequency even for a one-time fetch. CREDIT_CARD is not in Setu's fiTypes list, so card utilization and
// late payments come back as "not available" in Setu mode.
const CONSENT_TEMPLATE = {
  consentTypes: ["PROFILE", "SUMMARY", "TRANSACTIONS"],
  fiTypes: ["DEPOSIT"],
  consentDuration: { unit: "DAY", value: 1 },
  dataLife: { unit: "DAY", value: 1 },
  frequency: { unit: "HOUR", value: 1 },
  context: [] as unknown[],
  purpose: {
    code: "105",
    refUri: "https://api.rebit.org.in/aa/purpose/105.xml",
    text: "Explicit one-time consent for accessing data from the accounts",
    category: { type: "string" },
  },
  fetchType: "ONETIME",
} as const;

// TODO(verify with Setu sandbox): the AA handle. Setu's examples use both @onemoney and @setu.
const vuaOf = (mobile: string) => `${mobile}@onemoney`;

// FAILED, PAUSED, REVOKED and REJECTED all fold into REJECTED.
const CONSENT_STATUS: Record<string, ConsentStatus> = { PENDING: "PENDING", ACTIVE: "ACTIVE", EXPIRED: "EXPIRED" };

const SESSION_READY = new Set(["COMPLETED", "PARTIAL"]);
const SESSION_FAILED = new Set(["EXPIRED", "FAILED"]);
// The FIP prepares data asynchronously; wait up to ~40 s inside one request (the data route allows 60 s).
const POLL_ATTEMPTS = 20;
const POLL_DELAY_MS = 2_000;
const TOKEN_TTL_MS = 10 * 60_000;
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
// TODO(verify with Setu sandbox): the credit card / loan summary field names (not requested today: Setu's fiTypes have no CREDIT_CARD).
export function mapSetuFiData(fips: unknown, period: { from: string; to: string }): AAFinancialData {
  const out: AAFinancialData = { period, deposits: [], cards: [], loans: [] };
  for (const fip of arr(fips)) {
    const institution = str(obj(fip).fipName) || str(obj(fip).fipID) || "Linked institution";
    for (const acc of arr(obj(fip).accounts)) {
      const account = obj(obj(obj(acc).data).account);
      const type = str(account.type).toLowerCase();
      const summary = obj(account.summary);
      const masked = str(obj(acc).maskedAccNumber) || str(obj(account.profile).maskedAccNumber) || "XXXX";
      const hasTransactions = Array.isArray(obj(account.transactions).transaction);
      if ((type.includes("deposit") && !type.includes("term") && !type.includes("recurring")) || (!type && hasTransactions)) {
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
      } else if (type.includes("loan")) {
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

/** Setu's error bodies carry an errorCode/errorMsg (no customer data); log only the status and the code. */
async function logSetuError(where: string, res: Response): Promise<void> {
  let code = "";
  try {
    const body = obj(await res.json());
    code = str(body.errorCode) || str(obj(body.error).code) || str(body.code);
  } catch {
    // Not JSON: the status is enough.
  }
  console.error(`[aa/setu] ${where} failed: HTTP ${res.status}${code ? ` ${code}` : ""}`);
}

/** Bearer tokens by client id, shared across requests served by the same server instance. */
const tokens = new Map<string, { value: string; until: number }>();
/** Which auth style worked for a client id, so later requests skip the failed attempt. */
const authModes = new Map<string, "headers" | "bearer">();

export function createSetuProvider(config: SetuConfig, fetchImpl: typeof fetch = fetch): AAProvider {

  async function bearer(): Promise<string> {
    const cached = tokens.get(config.clientId);
    if (cached && Date.now() < cached.until) return cached.value;
    let res: Response;
    try {
      res = await fetchImpl(SETU_LOGIN_URL, {
        method: "POST",
        headers: { "content-type": "application/json", client: "bridge" },
        body: JSON.stringify({ clientID: config.clientId, grant_type: "client_credentials", secret: config.clientSecret }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      console.error("[aa/setu] login failed: network");
      throw new AAError("upstream");
    }
    if (!res.ok) {
      await logSetuError("login", res);
      throw new AAError("upstream");
    }
    let body: Json;
    try {
      body = obj(await res.json());
    } catch {
      throw new AAError("upstream");
    }
    const value = str(body.access_token) || str(obj(body.data).token) || str(body.token);
    if (!value) {
      console.error("[aa/setu] login failed: no token in response");
      throw new AAError("upstream");
    }
    tokens.set(config.clientId, { value, until: Date.now() + TOKEN_TTL_MS });
    return value;
  }

  type AuthMode = "headers" | "bearer";

  async function send(path: string, init: { method: "GET" | "POST"; body?: unknown }, mode: AuthMode): Promise<Response> {
    const auth: Record<string, string> =
      mode === "headers"
        ? { "x-client-id": config.clientId, "x-client-secret": config.clientSecret }
        : { authorization: `Bearer ${await bearer()}` };
    try {
      return await fetchImpl(`${config.baseUrl}${path}`, {
        method: init.method,
        headers: { "content-type": "application/json", ...auth, "x-product-instance-id": config.productInstanceId },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      console.error(`[aa/setu] ${init.method} ${path.split("/").slice(0, 3).join("/")} failed: network`);
      throw new AAError("upstream");
    }
  }

  /**
   * Current Bridge credentials go straight into x-client-id / x-client-secret headers; older ones are exchanged for a
   * Bearer token. Try the remembered mode (headers first), and on 401/403 try the other one once.
   */
  async function call(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<Json> {
    const first = authModes.get(config.clientId) ?? "headers";
    let res = await send(path, init, first);
    if (res.status === 401 || res.status === 403) {
      const other: AuthMode = first === "headers" ? "bearer" : "headers";
      tokens.delete(config.clientId);
      try {
        const retry = await send(path, init, other);
        if (retry.status !== 401 && retry.status !== 403) authModes.set(config.clientId, other);
        res = retry;
      } catch (err) {
        // The other mode could not even start (e.g. token login refused): report the original failure.
        if (!(err instanceof AAError)) throw err;
      }
    } else {
      authModes.set(config.clientId, first);
    }
    if (res.status === 404) throw new AAError("not_found");
    if (!res.ok) {
      await logSetuError(`${init.method} ${path.split("/").slice(0, 3).join("/")}`, res);
      throw new AAError("upstream");
    }
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

    async createConsent({ mobile, origin }) {
      if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) throw new AAError("invalid_request", "mobile required");
      const { from, to } = sandboxPeriod();
      const body = await call(PATHS.createConsent, {
        method: "POST",
        body: {
          ...CONSENT_TEMPLATE,
          vua: vuaOf(mobile),
          dataRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
          redirectUrl: consentRedirectUrl(origin),
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
