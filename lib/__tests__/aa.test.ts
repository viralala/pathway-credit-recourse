import { describe, expect, it, vi } from "vitest";
import { isApproved } from "../model";
import { APPLICANT_LIMITS } from "../security/validate";
import { buildFixture, sandboxPeriod } from "../aa/fixtures";
import { dpdBucket, normalize, type AAFinancialData, type AATransaction } from "../aa/normalize";
import { sandboxProvider } from "../aa/sandbox";
import { CONSENT_REDIRECT_URL, SETU_LOGIN_URL, consentRedirectUrl, createSetuProvider, mapSetuFiData, readSetuConfig } from "../aa/setu";
import type { DemoProfile } from "../aa/types";
import type { FeatureKey } from "../types";

vi.mock("server-only", () => ({}));

const KEYS = Object.keys(APPLICANT_LIMITS) as FeatureKey[];

describe("normalize on the demo fixtures", () => {
  for (const profile of ["salaried", "stretched", "thin-file"] as DemoProfile[]) {
    it(`${profile}: every input is inside the form's range`, () => {
      const { applicant, sources } = normalize(buildFixture(profile));
      for (const key of KEYS) {
        const v = applicant[key];
        expect(Number.isFinite(v), `${key} finite`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(APPLICANT_LIMITS[key].min);
        expect(v).toBeLessThanOrEqual(APPLICANT_LIMITS[key].max);
        expect(sources[key]?.detail.length).toBeGreaterThan(0);
      }
    });
  }

  it("salaried is approved and stretched is declined", () => {
    expect(isApproved(normalize(buildFixture("salaried")).applicant)).toBe(true);
    expect(isApproved(normalize(buildFixture("stretched")).applicant)).toBe(false);
  });

  it("reads the stretched profile's single 30-day late payment and high card use", () => {
    const { applicant } = normalize(buildFixture("stretched"));
    expect(applicant.late30).toBe(1);
    expect(applicant.late60).toBe(0);
    expect(applicant.utilization).toBeGreaterThan(0.9);
  });

  it("is deterministic and never uses a real bank name", () => {
    const a = buildFixture("salaried", sandboxPeriod(new Date("2026-03-15T00:00:00Z")));
    const b = buildFixture("salaried", sandboxPeriod(new Date("2026-03-15T00:00:00Z")));
    expect(a).toEqual(b);
    expect(a.period).toEqual({ from: "2025-03-01", to: "2026-02-28" });
    expect(a.deposits[0].institution).toBe("Sandbox Bank (demo)");
  });
});

describe("income rule", () => {
  const credit = (date: string, narration: string, amount = 50_000, mode = "NEFT"): AATransaction => ({ date, amount, type: "CREDIT", narration, mode });
  const data = (transactions: AATransaction[]): AAFinancialData => ({
    period: { from: "2026-01-01", to: "2026-06-30" },
    deposits: [{ institution: "Sandbox Bank (demo)", masked: "XXXX0000", transactions }],
    cards: [],
    loans: [],
  });

  it("is NaN, marked not-available, with fewer than 3 salary months", () => {
    const { applicant, sources } = normalize(data([credit("2026-01-01", "SALARY JAN"), credit("2026-02-01", "SALARY FEB")]));
    expect(applicant.monthlyIncome).toBeNaN();
    expect(sources.monthlyIncome?.origin).toBe("not-available");
    expect(sources.debtRatio?.origin).toBe("not-available");
  });

  it("takes the median of monthly salary totals", () => {
    const { applicant } = normalize(
      data([credit("2026-01-01", "SALARY", 40_000), credit("2026-02-01", "PAYROLL", 60_000), credit("2026-03-01", "SAL MAR", 50_000), credit("2026-03-10", "UPI-REFUND", 9_000, "UPI")]),
    );
    expect(applicant.monthlyIncome).toBe(50_000);
  });

  it("treats the same NEFT source paying in 3 months as income", () => {
    const { applicant } = normalize(data([credit("2026-01-05", "NEFT-RAVI TRADERS-1"), credit("2026-02-05", "NEFT-RAVI TRADERS-2"), credit("2026-03-05", "NEFT-RAVI TRADERS-3")]));
    expect(applicant.monthlyIncome).toBe(50_000);
  });
});

describe("late payment buckets", () => {
  it("splits days past due into 30-59, 60-89 and 90+", () => {
    expect([0, 29, 30, 59, 60, 89, 90, 400].map(dpdBucket)).toEqual([null, null, "late30", "late30", "late60", "late60", "late90", "late90"]);
  });

  it("counts account-months across cards and loans inside the last 24 months only", () => {
    const base = buildFixture("salaried");
    const data: AAFinancialData = {
      ...base,
      cards: [{ ...base.cards[0], dpd: [{ month: "2026-01", dpd: 35 }, { month: "2026-02", dpd: 65 }, { month: "2020-01", dpd: 95 }] }],
      loans: [{ ...base.loans[0], dpd: [{ month: "2026-01", dpd: 40 }, { month: "2026-03", dpd: 120 }] }],
    };
    const { applicant } = normalize({ ...data, period: { from: "2025-04-01", to: "2026-03-31" } });
    expect([applicant.late30, applicant.late60, applicant.late90]).toEqual([2, 1, 1]);
  });
});

describe("sandbox consent", () => {
  it("round trips: create, status, fetch", async () => {
    const created = await sandboxProvider.createConsent({ demoProfile: "stretched" });
    expect(created.consentId).toMatch(/^sbx_stretched_[a-z0-9]+$/);
    expect(created.redirectUrl).toBeNull();
    expect(await sandboxProvider.consentStatus(created.consentId)).toEqual({ status: "ACTIVE", mode: "sandbox" });
    const data = await sandboxProvider.fetchData(created.consentId);
    expect(data.mode).toBe("sandbox");
    expect(data.accounts.some((a) => a.kind === "credit-card")).toBe(true);
    expect(data.applicant).toEqual(normalize(buildFixture("stretched")).applicant);
  });

  it("needs a profile and rejects foreign ids", async () => {
    await expect(sandboxProvider.createConsent({})).rejects.toMatchObject({ code: "invalid_request" });
    await expect(sandboxProvider.fetchData("not-a-sandbox-id")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("provider selection", () => {
  it("falls back to sandbox with no env, or with partial env", async () => {
    const { getProvider } = await import("../aa");
    expect(getProvider({}).mode).toBe("sandbox");
    expect(getProvider({ SETU_AA_CLIENT_ID: "a", SETU_AA_CLIENT_SECRET: "b" }).mode).toBe("sandbox");
  });

  it("picks setu when all three credentials are set", async () => {
    const { getProvider } = await import("../aa");
    expect(getProvider({ SETU_AA_CLIENT_ID: "a", SETU_AA_CLIENT_SECRET: "b", SETU_AA_PRODUCT_INSTANCE_ID: "c" }).mode).toBe("setu");
    expect(readSetuConfig({ SETU_AA_CLIENT_ID: "a", SETU_AA_CLIENT_SECRET: "b", SETU_AA_PRODUCT_INSTANCE_ID: "c", SETU_AA_BASE_URL: "https://x.test/" })?.baseUrl).toBe("https://x.test");
  });
});

describe("Setu response mapping", () => {
  it("maps deposit, card and loan accounts into the normalizer's input", () => {
    const data = mapSetuFiData(
      [
        {
          fipID: "demo-fip",
          accounts: [
            {
              maskedAccNumber: "XXXX1111",
              data: { account: { type: "deposit", transactions: { transaction: [{ type: "CREDIT", mode: "NEFT", amount: "5000.00", narration: "SALARY", valueDate: "2026-01-02" }] } } },
            },
            { data: { account: { type: "credit_card", summary: { currentBalance: "1000", creditLimit: "10000" } } } },
            { data: { account: { type: "loan", summary: { emiAmount: "2500", status: "ACTIVE" } } } },
          ],
        },
      ],
      { from: "2026-01-01", to: "2026-03-31" },
    );
    expect(data.deposits[0].transactions[0]).toMatchObject({ amount: 5000, type: "CREDIT", date: "2026-01-02" });
    expect(data.cards[0].creditLimit).toBe(10000);
    expect(data.loans[0].emi).toBe(2500);
  });
});

describe("Setu provider requests", () => {
  const config = { clientId: "cid", clientSecret: "sec", productInstanceId: "pid", baseUrl: "https://fiu.test" };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  type Handler = (headers: Record<string, string>) => Response;
  function mockSetu(handlers: Record<string, Handler>) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      const key = `${init.method ?? "GET"} ${String(url)}`;
      const handler = handlers[key];
      if (!handler) throw new Error(`unexpected ${key}`);
      return handler((init.headers ?? {}) as Record<string, string>);
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  it("sends Bridge credentials as headers and creates a consent Setu accepts", async () => {
    const { calls, fetchImpl } = mockSetu({
      "POST https://fiu.test/v2/consents": () => json({ id: "consent-123", url: "https://fiu.test/v2/consents/webview/consent-123", status: "PENDING" }),
    });
    const provider = createSetuProvider({ ...config, clientId: "cid-consent" }, fetchImpl);
    const out = await provider.createConsent({ mobile: "9876543210", origin: "https://pathway.example" });
    expect(out).toEqual({ consentId: "consent-123", mode: "setu", redirectUrl: "https://fiu.test/v2/consents/webview/consent-123" });

    expect(calls).toHaveLength(1);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers).toMatchObject({ "x-client-id": "cid-consent", "x-client-secret": "sec", "x-product-instance-id": "pid" });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.redirectUrl).toBe("https://pathway.example/connect/done");
    expect(Object.keys(body).sort()).toEqual(["consentDuration", "context", "dataRange", "redirectUrl", "vua"]);
    expect(body.vua).toBe("9876543210@onemoney");
  });

  it("falls back to a Bearer token when header auth is refused, and remembers it", async () => {
    let logins = 0;
    const { calls, fetchImpl } = mockSetu({
      [`POST ${SETU_LOGIN_URL}`]: () => json({ access_token: `tok${++logins}` }),
      "GET https://fiu.test/v2/consents/consent-123": (h) => (h.authorization === "Bearer tok1" ? json({ status: "ACTIVE" }) : json({ errorCode: "Unauthorized" }, 403)),
    });
    const provider = createSetuProvider({ ...config, clientId: "cid-bearer" }, fetchImpl);
    expect((await provider.consentStatus("consent-123")).status).toBe("ACTIVE");
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ clientID: "cid-bearer", grant_type: "client_credentials", secret: "sec" });
    expect(calls[1].init.headers).toMatchObject({ client: "bridge" });

    calls.length = 0;
    expect((await provider.consentStatus("consent-123")).status).toBe("ACTIVE");
    // Straight to the cached Bearer token: no header attempt, no new login.
    expect(calls).toHaveLength(1);
    expect(logins).toBe(1);
  });

  it("reports a failure when both auth styles are refused", async () => {
    const { fetchImpl } = mockSetu({
      [`POST ${SETU_LOGIN_URL}`]: () => json({ errorCode: "Forbidden" }, 403),
      "GET https://fiu.test/v2/consents/consent-123": () => json({ errorCode: "Unauthorized" }, 401),
    });
    await expect(createSetuProvider({ ...config, clientId: "cid-refused" }, fetchImpl).consentStatus("consent-123")).rejects.toMatchObject({ code: "upstream" });
  });

  it("folds revoked and failed consents into REJECTED", async () => {
    const { fetchImpl } = mockSetu({
      [`POST ${SETU_LOGIN_URL}`]: () => json({ access_token: "tok" }),
      "GET https://fiu.test/v2/consents/consent-123": () => json({ status: "REVOKED" }),
    });
    expect((await createSetuProvider({ ...config, clientId: "cid-revoked" }, fetchImpl).consentStatus("consent-123")).status).toBe("REJECTED");
  });

  it("creates a data session and maps a completed one", async () => {
    const tx = Array.from({ length: 6 }, (_, i) => ({
      type: "CREDIT",
      mode: "NEFT",
      amount: "60000.00",
      narration: "SALARY ACME LTD",
      valueDate: `2026-0${i + 1}-01`,
    }));
    const { fetchImpl } = mockSetu({
      [`POST ${SETU_LOGIN_URL}`]: () => json({ access_token: "tok" }),
      "POST https://fiu.test/v2/sessions": () => json({ id: "session-1", status: "PENDING" }),
      "GET https://fiu.test/v2/sessions/session-1": () =>
        json({
          status: "COMPLETED",
          fips: [{ fipID: "setu-fip", accounts: [{ maskedAccNumber: "XXXX4321", data: { account: { type: "deposit", transactions: { transaction: tx } } } }] }],
        }),
    });
    const result = await createSetuProvider({ ...config, clientId: "cid-data" }, fetchImpl).fetchData("consent-123");
    expect(result.mode).toBe("setu");
    expect(result.accounts).toEqual([expect.objectContaining({ kind: "deposit", masked: "XXXX4321" })]);
    expect(Object.keys(result.applicant).sort()).toEqual(["debtRatio", "late30", "late60", "late90", "monthlyIncome", "openCreditLines", "utilization"]);
  });
});

describe("consent redirect URL", () => {
  it("follows the request origin and refuses plain-http hosts", () => {
    expect(consentRedirectUrl("https://pathway.example")).toBe("https://pathway.example/connect/done");
    expect(consentRedirectUrl("http://localhost:3107")).toBe("http://localhost:3107/connect/done");
    expect(consentRedirectUrl("http://evil.example")).toBe(CONSENT_REDIRECT_URL);
    expect(consentRedirectUrl(undefined)).toBe(CONSENT_REDIRECT_URL);
  });
});
