import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderResult } from "@/lib/schemes/provider";
import type { MatchResponse, Scheme, SchemeListResponse } from "@/lib/schemes/types";
import { PROFILE_FITS_A, TEST_SCHEMES, crit, eligibility, makeScheme, validSchemeRow } from "./fixtures/schemes";

const mocks = vi.hoisted(() => ({
  listCurrent: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/schemes/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/schemes/provider")>();
  return { ...actual, getSchemeProvider: async () => ({ listCurrent: mocks.listCurrent }) };
});
vi.mock("@/lib/security/auth-check", () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }));

const ROOT = path.resolve(__dirname, "../..");
const URL_MATCH = "https://pathway.example/api/schemes/match";
const URL_LIST = "https://pathway.example/api/schemes";

let ip = 0;
/** A distinct client address per call keeps the (module-level) rate limiters out of each other's way. */
function nextIp() {
  ip += 1;
  return `203.0.113.${(ip % 250) + 1}`;
}

function post(body: unknown, headers: Record<string, string> = {}, raw = false): Request {
  return new Request(URL_MATCH, {
    method: "POST",
    headers: {
      origin: "https://pathway.example",
      host: "pathway.example",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "x-real-ip": nextIp(),
      ...headers,
    },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function get(headers: Record<string, string> = {}): Request {
  return new Request(URL_LIST, { method: "GET", headers: { "x-real-ip": nextIp(), ...headers } });
}

const ok = (schemes: Scheme[], skipped = 0): ProviderResult => ({ ok: true, schemes, skipped });

async function loadMatch() {
  return (await import("@/app/api/schemes/match/route")).POST;
}
async function loadList() {
  return (await import("@/app/api/schemes/route")).GET;
}

/** Fresh route modules (and so fresh rate limiters) for every test. */
beforeEach(() => {
  vi.resetModules();
  mocks.listCurrent.mockReset();
  mocks.getAuthenticatedUser.mockReset();
  mocks.listCurrent.mockResolvedValue(ok(TEST_SCHEMES));
  mocks.getAuthenticatedUser.mockResolvedValue({ authenticated: false, user: null, supabase: null });
});

async function data(res: Response): Promise<MatchResponse> {
  const json = await res.json();
  expect(json.success).toBe(true);
  return json.data;
}

describe("POST /api/schemes/match: request checks", () => {
  it("403 without same-origin headers and with a foreign Origin", async () => {
    const POST = await loadMatch();
    const noOrigin = new Request(URL_MATCH, {
      method: "POST",
      headers: { host: "pathway.example", "content-type": "application/json", "x-real-ip": nextIp() },
      body: "{}",
    });
    const res = await POST(noOrigin);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");

    const foreign = await POST(post({}, { origin: "https://evil.example" }));
    expect(foreign.status).toBe(403);
    const crossSite = await POST(post({}, { "sec-fetch-site": "cross-site" }));
    expect(crossSite.status).toBe(403);
    expect(mocks.listCurrent).not.toHaveBeenCalled();
  });

  it("415 for text/plain", async () => {
    const POST = await loadMatch();
    const res = await POST(post("{}", { "content-type": "text/plain" }, true));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("413 for an oversized body, with and without a declared length", async () => {
    const POST = await loadMatch();
    const big = JSON.stringify({ profile: {}, pad: "x".repeat(9_000) });
    const streamed = await POST(post(big, {}, true));
    expect(streamed.status).toBe(413);
    expect((await streamed.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
    const declared = await POST(post("{}", { "content-length": "9000" }, true));
    expect(declared.status).toBe(413);
  });

  it("400 for bad JSON and for an empty body", async () => {
    const POST = await loadMatch();
    for (const body of ["{not json", "", "[1, 2"]) {
      const res = await POST(post(body, {}, true));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("400 for unknown top-level keys such as score and user_id", async () => {
    const POST = await loadMatch();
    for (const extra of [{ score: 700 }, { user_id: "someone-else" }, { creditScore: 720 }, { decision: "approved" }]) {
      const res = await POST(post({ profile: {}, ...extra }));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
    expect(mocks.listCurrent).not.toHaveBeenCalled();
  });

  it("400 for unknown profile keys, out-of-range values and wrong types", async () => {
    const POST = await loadMatch();
    const bad = [
      { profile: { favouriteColour: "red" } },
      { profile: { score: 700 } },
      { profile: { age: 200 } },
      { profile: { age: -1 } },
      { profile: { age: "30" } },
      { profile: { gender: "robot" } },
      { profile: { hasLoanDefault: "no" } },
      { applicant: { monthlyIncome: -5 } },
      { goal: { amount: 1e12 } },
      { save: "yes" },
      [],
      "text",
      null,
    ];
    for (const body of bad) {
      const res = await POST(post(body));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("429 with Retry-After after the limit, and only for the client over it", async () => {
    const POST = await loadMatch();
    const headers = { "x-real-ip": "198.51.100.77" };
    for (let i = 0; i < 20; i++) expect((await POST(post({}, headers))).status).toBe(200);
    const blocked = await POST(post({}, headers));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect((await POST(post({}, { "x-real-ip": "198.51.100.78" }))).status).toBe(200);
  });

  it("503 SERVICE_UNAVAILABLE when the provider is not configured or unavailable", async () => {
    const POST = await loadMatch();
    for (const reason of ["not_configured", "unavailable"] as const) {
      mocks.listCurrent.mockResolvedValue({ ok: false, reason });
      const res = await POST(post({}));
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(res.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("500 INTERNAL_ERROR with a generic message when something unexpected throws", async () => {
    const POST = await loadMatch();
    mocks.listCurrent.mockRejectedValue(new Error('relation "government_schemes" does not exist at db.internal'));
    const res = await POST(post({}));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    expect(text).not.toContain("government_schemes");
    expect(text).not.toContain("internal");
  });
});

describe("POST /api/schemes/match: results", () => {
  it("ranks matches; each has a status, a relevance score and per-criterion outcomes", async () => {
    const POST = await loadMatch();
    const res = await POST(post({ profile: PROFILE_FITS_A }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await data(res);

    expect(body.matches).toHaveLength(TEST_SCHEMES.length);
    const order = { appears_relevant: 0, needs_more_information: 1, not_matched: 2 } as const;
    const ranks = body.matches.map((m) => order[m.status]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    for (const m of body.matches) {
      expect(["appears_relevant", "needs_more_information", "not_matched"]).toContain(m.status);
      expect(m.relevance.score).toBeGreaterThanOrEqual(0);
      expect(m.relevance.score).toBeLessThanOrEqual(100);
      expect(m.evaluation.criteria.length).toBeGreaterThan(0);
      for (const c of m.evaluation.criteria) expect(["pass", "fail", "unknown"]).toContain(c.outcome);
      expect(m.scheme.slug).toMatch(/^test-scheme-/);
    }
    const a = body.matches.find((m) => m.scheme.slug === "test-scheme-a")!;
    expect(a.status).toBe("appears_relevant");
    expect(body.profile).toMatchObject({ age: 30, loanAmount: 500_000 });
    expect(typeof body.evaluatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.evaluatedAt))).toBe(false);
    expect(body.saved).toBe(false);
  });

  it("an empty body {} never yields not_matched purely from missing data, and lists the missing fields", async () => {
    const POST = await loadMatch();
    const body = await data(await POST(post({})));
    expect(body.matches.length).toBe(TEST_SCHEMES.length);
    expect(body.matches.every((m) => m.status === "needs_more_information")).toBe(true);
    expect(body.matches.some((m) => m.status === "not_matched")).toBe(false);
    expect(body.missingFields.length).toBeGreaterThan(0);
    expect(body.profile).toEqual({});
  });

  it("derives annual income and loan amount from the applicant and goal", async () => {
    const POST = await loadMatch();
    const body = await data(await POST(post({ applicant: { monthlyIncome: 25_000 }, goal: { amount: 400_000 } })));
    expect(body.profile).toMatchObject({ annualIncome: 300_000, loanAmount: 400_000 });
  });

  it("is deterministic: identical requests give identical matches, profile and missingFields", async () => {
    const POST = await loadMatch();
    const body = { profile: { age: 30, sector: "services" }, applicant: { monthlyIncome: 20_000 } };
    const one = await data(await POST(post(body)));
    // A different order of schemes from the source must not change the answer either.
    mocks.listCurrent.mockResolvedValue(ok([...TEST_SCHEMES].reverse()));
    const two = await data(await POST(post(body)));
    expect(two.matches).toEqual(one.matches);
    expect(two.profile).toEqual(one.profile);
    expect(two.missingFields).toEqual(one.missingFields);
  });

  it("never uses approval, guarantee or probability language", async () => {
    const POST = await loadMatch();
    for (const body of [{}, { profile: PROFILE_FITS_A }, { profile: { age: 17, hasLoanDefault: true } }]) {
      const text = (await (await POST(post(body))).text()).toLowerCase();
      expect(text).not.toContain("approved");
      expect(text).not.toContain("approval");
      expect(text).not.toContain("guarantee");
      expect(text).not.toContain("probability");
    }
  });
});

describe("POST /api/schemes/match: saving", () => {
  function signedIn(insertResult: { error: unknown } = { error: null }) {
    const insert = vi.fn().mockResolvedValue(insertResult);
    const from = vi.fn(() => ({ insert }));
    mocks.getAuthenticatedUser.mockResolvedValue({ authenticated: true, user: { id: "session-user-id" }, supabase: { from } });
    return { insert, from };
  }

  it("without save, the session is never looked at", async () => {
    const POST = await loadMatch();
    const { insert } = signedIn();
    for (const body of [{}, { save: false }, { profile: PROFILE_FITS_A }]) {
      const res = await POST(post(body));
      expect((await data(res)).saved).toBe(false);
    }
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("save:true while signed out is still a 200 with saved:false", async () => {
    const POST = await loadMatch();
    const res = await POST(post({ profile: PROFILE_FITS_A, save: true }));
    expect(res.status).toBe(200);
    const body = await data(res);
    expect(body.saved).toBe(false);
    expect(body.matches.length).toBeGreaterThan(0);
    expect(mocks.getAuthenticatedUser).toHaveBeenCalledTimes(1);
  });

  it("signed in: one row per non-not_matched match, owned by the session user, saved:true", async () => {
    const POST = await loadMatch();
    const { insert, from } = signedIn();
    const res = await POST(post({ profile: PROFILE_FITS_A, save: true }));
    const body = await data(res);
    expect(body.saved).toBe(true);

    expect(from).toHaveBeenCalledWith("scheme_matches");
    expect(insert).toHaveBeenCalledTimes(1);
    const rows = insert.mock.calls[0][0] as Record<string, unknown>[];
    const kept = body.matches.filter((m) => m.status !== "not_matched");
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(body.matches.length + 1);
    expect(rows).toHaveLength(kept.length);
    for (const [i, r] of rows.entries()) {
      expect(r.user_id).toBe("session-user-id");
      expect(r.scheme_id).toBe(kept[i].scheme.id);
      expect(r.scheme_slug).toBe(kept[i].scheme.slug);
      expect(r.scheme_version).toBe(kept[i].scheme.version);
      expect(r.status).toBe(kept[i].status);
      expect(r.status).not.toBe("not_matched");
      expect(r.relevance_score).toBe(kept[i].relevance.score);
      expect(r.profile).toEqual(body.profile);
      expect(r.evaluation).toEqual(kept[i].evaluation);
    }
  });

  it("a client-supplied user id is rejected, so it can never reach the insert", async () => {
    const POST = await loadMatch();
    const { insert } = signedIn();
    const res = await POST(post({ profile: PROFILE_FITS_A, save: true, user_id: "attacker" }));
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("an insert error (including the 500-row cap) still returns 200 with saved:false", async () => {
    const POST = await loadMatch();
    signedIn({ error: { code: "P0001", message: "scheme_match_limit" } });
    const res = await POST(post({ profile: PROFILE_FITS_A, save: true }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text).data.saved).toBe(false);
    expect(text).not.toContain("scheme_match_limit");
  });

  it("a throwing session lookup or insert still returns 200 with saved:false", async () => {
    const POST = await loadMatch();
    mocks.getAuthenticatedUser.mockRejectedValue(new Error("auth down"));
    expect((await data(await POST(post({ save: true })))).saved).toBe(false);

    const insert = vi.fn().mockRejectedValue(new Error("network"));
    mocks.getAuthenticatedUser.mockResolvedValue({ authenticated: true, user: { id: "u" }, supabase: { from: () => ({ insert }) } });
    expect((await data(await POST(post({ profile: PROFILE_FITS_A, save: true })))).saved).toBe(false);
  });

  it("nothing to save (every scheme not_matched) means no insert and saved:false", async () => {
    const POST = await loadMatch();
    const { insert } = signedIn();
    mocks.listCurrent.mockResolvedValue(ok([makeScheme({ slug: "test-scheme-old", eligibility: eligibility(crit("age", "gte", 60)) })]));
    const body = await data(await POST(post({ profile: { age: 20 }, save: true })));
    expect(body.matches.map((m) => m.status)).toEqual(["not_matched"]);
    expect(body.saved).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("GET /api/schemes", () => {
  it("200 with only current, active schemes, and a short public cache header", async () => {
    const { createInMemorySchemeProvider } = await vi.importActual<typeof import("@/lib/schemes/provider")>("@/lib/schemes/provider");
    const provider = createInMemorySchemeProvider([
      validSchemeRow({ id: "00000000-0000-4000-8000-000000000001", slug: "test-listed" }),
      validSchemeRow({ id: "00000000-0000-4000-8000-000000000002", slug: "test-draft", status: "draft" }),
      validSchemeRow({ id: "00000000-0000-4000-8000-000000000003", slug: "test-retired", status: "retired", is_current: false }),
      validSchemeRow({ id: "00000000-0000-4000-8000-000000000004", slug: "test-listed", version: 2, is_current: false }),
    ]);
    mocks.listCurrent.mockImplementation(() => provider.listCurrent());

    const GET = await loadList();
    const res = await GET(get());
    expect(res.status).toBe(200);
    const cache = res.headers.get("cache-control") ?? "";
    expect(cache).toContain("public");
    expect(cache).not.toContain("no-store");
    const json = await res.json();
    expect(json.success).toBe(true);
    const { schemes } = json.data as SchemeListResponse;
    expect(schemes.map((s) => s.slug)).toEqual(["test-listed"]);
    expect(schemes[0]).toMatchObject({ status: "active", isCurrent: true, version: 1 });
    expect(JSON.stringify(json)).not.toMatch(/approved|guarantee|probability/i);
  });

  it("503 SERVICE_UNAVAILABLE (and no public caching) when the source is unavailable or not configured", async () => {
    const GET = await loadList();
    for (const reason of ["unavailable", "not_configured"] as const) {
      mocks.listCurrent.mockResolvedValue({ ok: false, reason });
      const res = await GET(get());
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
      expect(res.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("429 with Retry-After after 60 requests a minute", async () => {
    const GET = await loadList();
    const headers = { "x-real-ip": "198.51.100.9" };
    for (let i = 0; i < 60; i++) expect((await GET(get(headers))).status).toBe(200);
    const blocked = await GET(get(headers));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
  });

  it("500 INTERNAL_ERROR with a generic message when the provider throws", async () => {
    const GET = await loadList();
    mocks.listCurrent.mockRejectedValue(new Error("secret db detail"));
    const res = await GET(get());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret db detail");
  });
});

describe("scheme code stays on the safe side of the fence", () => {
  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => path.join(e.parentPath, e.name));
  }
  const mine = [
    ...sources(path.join(ROOT, "app/api/schemes")),
    path.join(ROOT, "lib/schemes/provider.ts"),
  ];

  it("finds the files it is meant to check", () => {
    expect(mine.map((f) => path.relative(ROOT, f).replace(/\\/g, "/")).sort()).toEqual([
      "app/api/schemes/match/route.ts",
      "app/api/schemes/route.ts",
      "lib/schemes/provider.ts",
    ]);
  });

  it("never imports the admin client or mentions a service-role key", () => {
    for (const file of mine) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toContain("supabase/admin");
      expect(src, file).not.toMatch(/SERVICE_ROLE/i);
    }
  });

  it("does not touch the credit model or hardcode a scheme", () => {
    for (const file of mine) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/lib\/(model|recourse|timeline|montecarlo|pricing|analyze)["']/);
      expect(src, file).not.toMatch(/pmegp|mudra|cgtmse|vishwakarma|stand-?up/i);
      expect(src, file).not.toMatch(/select\(\s*["'`]\*/);
    }
  });

  it("route files export only HTTP handlers", async () => {
    vi.resetModules();
    expect(Object.keys(await import("@/app/api/schemes/route")).sort()).toEqual(["GET"]);
    expect(Object.keys(await import("@/app/api/schemes/match/route")).sort()).toEqual(["POST"]);
  });
});
