import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCHEME_COLUMNS,
  createInMemorySchemeProvider,
  createSupabaseSchemeProvider,
  withCache,
  type ProviderResult,
  type SchemeClientLike,
  type SchemeProvider,
  type SchemeQueryBuilder,
} from "@/lib/schemes/provider";
import { validSchemeRow } from "./fixtures/schemes";

/** A database row for a fictional scheme. */
let counter = 0;
function row(slug: string, overrides: Record<string, unknown> = {}) {
  counter += 1;
  return validSchemeRow({
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    slug,
    name: `Fixture ${slug}`,
    ...overrides,
  });
}

/**
 * A fake Supabase client over an in-memory "table". It applies the .eq() filters the way the database
 * would and records what was asked, so tests can check the query itself.
 */
function fakeClient(db: { rows: unknown[]; error?: unknown }) {
  const calls: { table: string; columns: string; filters: [string, unknown][]; order: string[] }[] = [];
  const client: SchemeClientLike = {
    from(table) {
      return {
        select(columns) {
          const call = { table, columns, filters: [] as [string, unknown][], order: [] as string[] };
          calls.push(call);
          const builder: SchemeQueryBuilder = {
            eq(column, value) {
              call.filters.push([column, value]);
              return builder;
            },
            order(column) {
              call.order.push(column);
              return builder;
            },
            then(onfulfilled, onrejected) {
              const result = db.error
                ? { data: null, error: db.error }
                : {
                    data: db.rows.filter((r) => call.filters.every(([c, v]) => (r as Record<string, unknown>)[c] === v)),
                    error: null,
                  };
              return Promise.resolve(result).then(onfulfilled, onrejected);
            },
          };
          return builder;
        },
      };
    },
  };
  return { client, calls };
}

const okSchemes = (r: ProviderResult) => {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r.schemes;
};

describe("scheme provider: what is offered", () => {
  it("keeps only active, current rows; drafts, retired rows and old versions never come out", async () => {
    const rows = [
      row("fiction-active"),
      row("fiction-draft", { status: "draft" }),
      row("fiction-retired", { status: "retired" }),
      row("fiction-old", { is_current: false }),
    ];
    for (const provider of [createInMemorySchemeProvider(rows), createSupabaseSchemeProvider(fakeClient({ rows }).client)]) {
      const result = await provider.listCurrent();
      expect(okSchemes(result).map((s) => s.slug)).toEqual(["fiction-active"]);
      expect(result.ok && result.skipped).toBe(0);
    }
  });

  it("drops rows that are not active and current even when the source returns them (defence in depth)", async () => {
    // A client that ignores the filters, as a misconfigured policy or a bug might.
    const rows = [row("fiction-a"), row("fiction-b", { status: "draft" }), row("fiction-c", { is_current: false })];
    const client: SchemeClientLike = {
      from: () => ({
        select: () => {
          const builder: SchemeQueryBuilder = {
            eq: () => builder,
            order: () => builder,
            then: (f, r) => Promise.resolve({ data: rows, error: null }).then(f, r),
          };
          return builder;
        },
      }),
    };
    const result = await createSupabaseSchemeProvider(client).listCurrent();
    expect(okSchemes(result).map((s) => s.slug)).toEqual(["fiction-a"]);
  });

  it("orders by slug", async () => {
    const provider = createInMemorySchemeProvider([row("fiction-c"), row("fiction-a"), row("fiction-b")]);
    expect(okSchemes(await provider.listCurrent()).map((s) => s.slug)).toEqual(["fiction-a", "fiction-b", "fiction-c"]);
  });

  it("maps a row to a Scheme (camelCase, numeric strings coerced)", async () => {
    const [scheme] = okSchemes(await createInMemorySchemeProvider([row("fiction-a")]).listCurrent());
    expect(scheme).toMatchObject({ slug: "fiction-a", shortName: "TSR", isCurrent: true, status: "active", minLoanAmount: 50_000 });
    expect(scheme.eligibility.schemaVersion).toBe(1);
  });
});

describe("scheme provider: versioning", () => {
  it("v1 (not current) and v2 (current) of one slug: only v2 comes out", async () => {
    const rows = [row("fiction-v", { version: 1, is_current: false, status: "retired" }), row("fiction-v", { version: 2, name: "Fixture v2" })];
    const schemes = okSchemes(await createInMemorySchemeProvider(rows).listCurrent());
    expect(schemes).toHaveLength(1);
    expect(schemes[0]).toMatchObject({ slug: "fiction-v", version: 2 });
  });

  it("two rows of a slug that both claim current: the higher version wins, whatever the order", async () => {
    const v1 = row("fiction-v", { version: 1 });
    const v2 = row("fiction-v", { version: 2 });
    for (const rows of [[v1, v2], [v2, v1]]) {
      const schemes = okSchemes(await createInMemorySchemeProvider(rows).listCurrent());
      expect(schemes.map((s) => s.version)).toEqual([2]);
    }
  });

  it("results change when the database switches current from v1 to v2 and the cache expires", async () => {
    const v1 = row("fiction-v", { version: 1, is_current: true, name: "Fixture version one" });
    const v2 = row("fiction-v", { version: 2, is_current: false, status: "draft", name: "Fixture version two" });
    const db = { rows: [v1, v2] as Record<string, unknown>[] };
    let clock = 0;
    const cached = withCache(createSupabaseSchemeProvider(fakeClient(db).client), 1_000, () => clock);

    expect(okSchemes(await cached.listCurrent()).map((s) => s.version)).toEqual([1]);

    // Publish v2 and retire v1.
    db.rows = [
      { ...v1, is_current: false, status: "retired" },
      { ...v2, is_current: true, status: "active" },
    ];
    clock = 999;
    expect(okSchemes(await cached.listCurrent()).map((s) => s.version)).toEqual([1]); // still inside the TTL
    clock = 1_000;
    const after = okSchemes(await cached.listCurrent());
    expect(after.map((s) => s.version)).toEqual([2]);
    expect(after[0].name).toBe("Fixture version two");
  });
});

describe("scheme provider: bad rows", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  const badRows = () => [
    row("fiction-bad-rules", { eligibility_rules: { schemaVersion: 1, required: { type: "criterion", id: "x", field: "age", op: "between", value: "no", label: "Broken" } } }),
    row("fiction-bad-url", { official_url: "http://example.org/not-https" }),
    row("fiction-no-sources", { sources: [] }),
    row("fiction-no-sources-key", { sources: undefined }),
    "not even an object",
    null,
  ];

  it("skips invalid rows, counts them, and still returns the valid ones without throwing", async () => {
    const rows = [row("fiction-good-b"), ...badRows(), row("fiction-good-a")];
    const objectRows = rows.filter((r) => typeof r === "object" && r !== null);
    const cases: [SchemeProvider, number][] = [
      [createInMemorySchemeProvider(rows), 6],
      // A database never returns a bare string or null as a row; the fake only holds objects.
      [createSupabaseSchemeProvider(fakeClient({ rows: objectRows }).client), 4],
    ];
    for (const [provider, skipped] of cases) {
      const result = await provider.listCurrent();
      expect(result.ok).toBe(true);
      expect(okSchemes(result).map((s) => s.slug)).toEqual(["fiction-good-a", "fiction-good-b"]);
      expect(result.ok && result.skipped).toBe(skipped);
    }
  });

  it("warns with slugs and a count, never the row contents", async () => {
    await createInMemorySchemeProvider([row("fiction-bad-url", { official_url: "http://secret.example/path", summary: "SECRET-SUMMARY-TEXT" })]).listCurrent();
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0].join(" "));
    expect(message).toContain("fiction-bad-url");
    expect(message).toContain("1");
    expect(message).not.toContain("secret.example");
    expect(message).not.toContain("SECRET-SUMMARY-TEXT");
  });

  it("does not warn when nothing was skipped", async () => {
    await createInMemorySchemeProvider([row("fiction-a"), row("fiction-draft", { status: "draft" })]).listCurrent();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Supabase scheme provider: the query", () => {
  it("selects named columns from government_schemes filtered on status and is_current, ordered by slug", async () => {
    const { client, calls } = fakeClient({ rows: [row("fiction-a")] });
    await createSupabaseSchemeProvider(client).listCurrent();
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.table).toBe("government_schemes");
    expect(call.columns).toBe(SCHEME_COLUMNS);
    expect(call.columns).not.toContain("*");
    expect(call.filters).toEqual(expect.arrayContaining([["status", "active"], ["is_current", true]]));
    expect(call.order).toEqual(["slug"]);
    for (const col of ["id", "slug", "version", "is_current", "status", "eligibility_rules", "sources", "official_url"]) {
      expect(call.columns.split(", ")).toContain(col);
    }
  });

  it("a query error is { ok:false, reason:'unavailable' } and its message is not logged or returned", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client, calls } = fakeClient({ rows: [], error: { message: 'connection to "db.internal:5432" refused' } });
    const result = await createSupabaseSchemeProvider(client).listCurrent();
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("internal");
    expect(calls[0].filters).toEqual(expect.arrayContaining([["status", "active"], ["is_current", true]]));
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it("a client that throws is unavailable, not an exception", async () => {
    const client: SchemeClientLike = {
      from: () => {
        throw new Error("boom");
      },
    };
    await expect(createSupabaseSchemeProvider(client).listCurrent()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("an empty table is ok with no schemes", async () => {
    await expect(createSupabaseSchemeProvider(fakeClient({ rows: [] }).client).listCurrent()).resolves.toEqual({ ok: true, schemes: [], skipped: 0 });
  });
});

describe("withCache", () => {
  const good: ProviderResult = { ok: true, schemes: [], skipped: 0 };

  function counting(results: ProviderResult[]) {
    let calls = 0;
    const provider: SchemeProvider = {
      listCurrent: async () => results[Math.min(calls++, results.length - 1)],
    };
    return { provider, calls: () => calls };
  }

  it("makes one underlying call within the TTL and a new one after it", async () => {
    let clock = 0;
    const { provider, calls } = counting([good]);
    const cached = withCache(provider, 5_000, () => clock);
    await cached.listCurrent();
    clock = 4_999;
    await cached.listCurrent();
    expect(calls()).toBe(1);
    clock = 5_000;
    await cached.listCurrent();
    expect(calls()).toBe(2);
  });

  it("does not cache failures", async () => {
    const { provider, calls } = counting([{ ok: false, reason: "unavailable" }, { ok: false, reason: "unavailable" }, good, good]);
    const cached = withCache(provider, 60_000, () => 0);
    expect(await cached.listCurrent()).toEqual({ ok: false, reason: "unavailable" });
    expect(await cached.listCurrent()).toEqual({ ok: false, reason: "unavailable" });
    expect((await cached.listCurrent()).ok).toBe(true);
    expect((await cached.listCurrent()).ok).toBe(true); // now cached
    expect(calls()).toBe(3);
  });

  it("does not cache a provider that throws, and reports it as unavailable", async () => {
    let calls = 0;
    const provider: SchemeProvider = {
      listCurrent: async () => {
        calls += 1;
        if (calls === 1) throw new Error("boom");
        return good;
      },
    };
    const cached = withCache(provider, 60_000, () => 0);
    expect(await cached.listCurrent()).toEqual({ ok: false, reason: "unavailable" });
    expect((await cached.listCurrent()).ok).toBe(true);
  });

  it("concurrent calls share one in-flight request", async () => {
    let release!: (r: ProviderResult) => void;
    let calls = 0;
    const provider: SchemeProvider = {
      listCurrent: () => {
        calls += 1;
        return new Promise<ProviderResult>((resolve) => {
          release = resolve;
        });
      },
    };
    const cached = withCache(provider, 60_000, () => 0);
    const pending = [cached.listCurrent(), cached.listCurrent(), cached.listCurrent()];
    expect(calls).toBe(1);
    release(good);
    const results = await Promise.all(pending);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(calls).toBe(1);
    await cached.listCurrent();
    expect(calls).toBe(1);
  });

  it("after a failed in-flight request the next call tries again", async () => {
    const { provider, calls } = counting([{ ok: false, reason: "unavailable" }, good]);
    const cached = withCache(provider, 60_000, () => 0);
    await Promise.all([cached.listCurrent(), cached.listCurrent()]);
    expect(calls()).toBe(1);
    expect((await cached.listCurrent()).ok).toBe(true);
    expect(calls()).toBe(2);
  });
});

describe("getSchemeProvider", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/config");
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("is a not_configured provider when no database is configured, and never builds a client", async () => {
    vi.resetModules();
    const createClient = vi.fn();
    vi.doMock("@/lib/supabase/config", () => ({ ACCOUNTS_ENABLED: false }));
    vi.doMock("@/lib/supabase/server", () => ({ createClient }));
    const { getSchemeProvider } = await import("@/lib/schemes/provider");
    const provider = await getSchemeProvider();
    await expect(provider.listCurrent()).resolves.toEqual({ ok: false, reason: "not_configured" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("reads schemes through the Supabase client and caches the list at module level", async () => {
    vi.resetModules();
    const { client, calls } = fakeClient({ rows: [row("fiction-a"), row("fiction-draft", { status: "draft" })] });
    const createClient = vi.fn(async () => client);
    vi.doMock("@/lib/supabase/config", () => ({ ACCOUNTS_ENABLED: true }));
    vi.doMock("@/lib/supabase/server", () => ({ createClient }));
    const { getSchemeProvider } = await import("@/lib/schemes/provider");

    const first = await (await getSchemeProvider()).listCurrent();
    const second = await (await getSchemeProvider()).listCurrent();
    expect(okSchemes(first).map((s) => s.slug)).toEqual(["fiction-a"]);
    expect(okSchemes(second).map((s) => s.slug)).toEqual(["fiction-a"]);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it("is unavailable, not an exception, when the client cannot be created", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/config", () => ({ ACCOUNTS_ENABLED: true }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => {
        throw new Error("cookies() outside a request");
      },
    }));
    const { getSchemeProvider } = await import("@/lib/schemes/provider");
    await expect((await getSchemeProvider()).listCurrent()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
