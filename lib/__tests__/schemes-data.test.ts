/**
 * The data layer of the government scheme matcher: the controlled seed, the SQL generated from it,
 * the migration, and the TypeScript type of the table.
 *
 * Row level security is asserted STATICALLY, from the text of the migration, because no database
 * runs in CI. That proves the policies are written the way we intend, not that Postgres enforces
 * them. The migration ends with a manual script to paste into the Supabase SQL editor that checks
 * RLS for real (set role anon / authenticated, attempt writes, expect failure); run it whenever the
 * policies change.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seedSql } from "@/scripts/seed-schemes";
import { criteriaOf, schemeRowSchema, schemeSeedSchema, type SchemeRow, type SchemeSeed } from "@/lib/schemes/schema";
import type { Database, GovernmentSchemeRow, SchemeMatchRow } from "@/lib/supabase/types";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const SEED_FILE = "supabase/seed/government_schemes.json";
const SEED_SQL_FILE = "supabase/migrations/20261007000001_seed_government_schemes.sql";
const MIGRATION_FILE = "supabase/migrations/20261007000000_government_schemes.sql";

const TODAY = "2026-10-06";
const OLDEST_PLAUSIBLE = "2026-01-01";

const rawSeed: unknown = JSON.parse(read(SEED_FILE));
const seed = rawSeed as SchemeSeed[];
const lf = (s: string) => s.replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------------------------
describe("scheme seed file", () => {
  it("is a non-empty JSON array", () => {
    expect(Array.isArray(rawSeed)).toBe(true);
    expect(seed.length).toBeGreaterThanOrEqual(1);
  });

  it("has entries that all pass schemeSeedSchema", () => {
    for (const entry of seed) {
      const parsed = schemeSeedSchema.safeParse(entry);
      expect(parsed.success, `${(entry as { slug?: string }).slug}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  it("has unique slugs, and every (slug, version) is unique", () => {
    const slugs = seed.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const keys = seed.map((e) => `${e.slug}@${e.version}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("starts every scheme at version 1", () => {
    for (const e of seed) expect(e.version, e.slug).toBe(1);
  });

  it("uses https for the official URL, the application URL and every source", () => {
    for (const e of seed) {
      expect(e.official_url, e.slug).toMatch(/^https:\/\//);
      if (e.application_url !== null) expect(e.application_url, e.slug).toMatch(/^https:\/\//);
      for (const s of e.sources) expect(s.url, e.slug).toMatch(/^https:\/\//);
    }
  });

  it("lists at least one source per scheme", () => {
    for (const e of seed) expect(e.sources.length, e.slug).toBeGreaterThanOrEqual(1);
  });

  it("has a last-verified date that is neither in the future nor older than 2026-01-01", () => {
    for (const e of seed) {
      expect(e.last_verified_at >= OLDEST_PLAUSIBLE, `${e.slug} is too old`).toBe(true);
      expect(e.last_verified_at <= TODAY, `${e.slug} is dated in the future`).toBe(true);
    }
  });

  it("has an effective-from date that is not in the future", () => {
    for (const e of seed) if (e.effective_from !== null) expect(e.effective_from <= TODAY, e.slug).toBe(true);
  });

  it("has unique criterion ids and only criteria that the schema accepts", () => {
    for (const e of seed) {
      const ids = criteriaOf(e.eligibility_rules.required).map((c) => c.id);
      expect(new Set(ids).size, e.slug).toBe(ids.length);
      expect(ids.length, e.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("promises no approval, in any text field", () => {
    const forbidden = /guarantee[ds]? approval|will be approved|assured loan|100% approval/i;
    for (const e of seed) expect(JSON.stringify(e), e.slug).not.toMatch(forbidden);
  });

  it("marks a scheme verified only when it carries a source and a date", () => {
    for (const e of seed) {
      if (e.verification_status === "verified") {
        expect(e.sources.length, e.slug).toBeGreaterThanOrEqual(1);
        expect(e.last_verified_at, e.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// seedSql, and the generated migration
// ---------------------------------------------------------------------------------------------

/**
 * Reads SQL the way Postgres lexes it: the dollar-quoted literals, and everything outside them
 * (comments dropped). A value that could break out of its literal would show up in `outside`.
 */
function scanSql(sql: string): { literals: string[]; outside: string } {
  const literals: string[] = [];
  let outside = "";
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    const open = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 80));
    if (!open) {
      outside += sql[i++];
      continue;
    }
    const delimiter = open[0];
    const start = i + delimiter.length;
    const end = sql.indexOf(delimiter, start);
    if (end === -1) throw new Error(`unterminated dollar-quoted literal starting at ${i}`);
    literals.push(sql.slice(start, end));
    outside += "<literal>";
    i = end + delimiter.length;
  }
  return { literals, outside };
}

describe("seedSql", () => {
  it("equals the committed seed migration (run `npm run seed:schemes` if this fails)", () => {
    expect(lf(seedSql(seed))).toBe(lf(read(SEED_SQL_FILE)));
  });

  it("is deterministic and says it is generated", () => {
    expect(seedSql(seed)).toBe(seedSql(seed));
    expect(seedSql(seed).split("\n").slice(0, 3).join("\n")).toMatch(/GENERATED FILE[\s\S]*scripts\/seed-schemes\.ts[\s\S]*government_schemes\.json/);
  });

  it("writes one guarded insert per scheme, current, and never overwrites an existing version", () => {
    const sql = seedSql(seed);
    expect(sql.match(/^insert into public\.government_schemes/gm)?.length).toBe(seed.length);
    expect(sql.match(/where not exists \(/g)?.length).toBe(seed.length);
    expect(sql).not.toMatch(/on conflict/i);
    expect(sql).not.toMatch(/^\s*(update|delete)\b/im);
  });

  it("embeds every value safely, including quotes and dollar signs", () => {
    const nasty = "O'Reilly's $$ scheme; drop table x; -- $seed$ ends with a dollar $";
    const entry: SchemeSeed = {
      ...seed[0],
      name: nasty,
      summary: `${nasty}\nsecond line`,
      how_to_apply: "$",
      ministry: "'; delete from public.government_schemes; --",
      benefits: [nasty, "backslash \\ and \"double\" quotes"],
    };
    const sql = seedSql([entry]);
    const { literals, outside } = scanSql(sql);

    // Each value comes back out of the SQL exactly as it went in.
    expect(literals).toContain(nasty);
    expect(literals).toContain(`${nasty}\nsecond line`);
    expect(literals).toContain("$");
    expect(literals).toContain("'; delete from public.government_schemes; --");
    const jsonLiterals = literals.filter((l) => l.startsWith("["));
    expect(jsonLiterals.map((l) => JSON.parse(l))).toContainEqual(entry.benefits);

    // Outside the literals there is nothing but the statement itself: the value cannot add SQL.
    expect(outside).not.toMatch(/drop table|delete from/i);
    expect(outside).not.toContain("O'Reilly");
  });

  it("keeps a multi-line name inside its comment line", () => {
    const sql = seedSql([{ ...seed[0], name: "First\nline'); drop table x; --" }]);
    for (const line of sql.split("\n")) if (/drop table/i.test(line)) expect(line.trimStart().startsWith("--") || line.includes("$seed")).toBe(true);
    expect(sql.split("\n").filter((l) => /^drop table/i.test(l.trim()))).toHaveLength(0);
  });

  it("writes null columns as typed nulls", () => {
    const sql = seedSql([{ ...seed[0], ministry: null, min_loan_amount: null, max_loan_amount: null, how_to_apply: null, application_url: null, effective_from: null }]);
    expect(sql).toContain("null::numeric");
    expect(sql).toContain("null::text");
    expect(sql).toContain("null::date");
  });
});

// ---------------------------------------------------------------------------------------------
// No hardcoding: schemes live in the database, and only the seed file knows what they are
// ---------------------------------------------------------------------------------------------
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (CODE.test(name)) out.push(full);
  }
  return out;
}

/** The file without its comments, so prose that mentions the word is not mistaken for data. */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

describe("no scheme is hardcoded in the app", () => {
  const files = ["app", "components", "lib"].flatMap((d) => sourceFiles(path.join(ROOT, d)));
  const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");

  it("scans a real set of files", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => rel(f).startsWith("lib/schemes/"))).toBe(true);
  });

  it("never imports or reads the seed directory", () => {
    const offenders = files.filter((f) => /supabase[\\/]seed|government_schemes\.json/.test(readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("never names a seeded scheme in code or strings", () => {
    const pattern = /PMEGP|MUDRA|CGTMSE|Vishwakarma|Stand-Up India/i;
    const offenders = files.filter((f) => pattern.test(withoutComments(readFileSync(f, "utf8")))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("never uses a seeded slug or name as a string literal", () => {
    const literals = seed.flatMap((e) => [e.slug, e.name, e.short_name]);
    const offenders: string[] = [];
    for (const f of files) {
      const text = withoutComments(readFileSync(f, "utf8"));
      for (const value of literals) {
        const quoted = [`"${value}"`, `'${value}'`, `\`${value}\``];
        if (quoted.some((q) => text.includes(q))) offenders.push(`${rel(f)}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// The migration, read as text (see the note at the top about why)
// ---------------------------------------------------------------------------------------------

/** The SQL without comments, lowercased, with all whitespace collapsed to single spaces. */
function normalizeSql(sql: string): string {
  return lf(sql)
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface Policy {
  table: string;
  command: string;
  roles: string;
  text: string;
}

function policiesOf(sql: string): Policy[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("create policy"))
    .map((s) => {
      const m = /^create policy "[^"]+" on public\.(\w+) for (select|insert|update|delete|all) to ([a-z, ]+?) (?:using|with check)/.exec(s);
      if (!m) throw new Error(`cannot read policy: ${s}`);
      return { table: m[1], command: m[2], roles: m[3], text: s };
    });
}

describe("government_schemes migration (static)", () => {
  const raw = read(MIGRATION_FILE);
  const sql = normalizeSql(raw);
  const policies = policiesOf(sql);
  const onSchemes = policies.filter((p) => p.table === "government_schemes");
  const onMatches = policies.filter((p) => p.table === "scheme_matches");

  it("enables row level security on both tables", () => {
    expect(sql).toContain("alter table public.government_schemes enable row level security");
    expect(sql).toContain("alter table public.scheme_matches enable row level security");
  });

  it("gives government_schemes exactly one policy, and it is a select", () => {
    expect(onSchemes).toHaveLength(1);
    expect(onSchemes[0].command).toBe("select");
    expect(onSchemes[0].roles).toBe("anon, authenticated");
    expect(onSchemes[0].text).toContain("using (status = 'active' and is_current)");
  });

  it("has no insert, update, delete or all policy on government_schemes", () => {
    for (const command of ["insert", "update", "delete", "all"]) expect(onSchemes.filter((p) => p.command === command)).toEqual([]);
  });

  it("revokes writes on government_schemes from the API roles and grants read", () => {
    expect(sql).toContain("revoke insert, update, delete on public.government_schemes from anon, authenticated");
    expect(sql).toContain("grant select on public.government_schemes to anon, authenticated");
  });

  it("gives scheme_matches select, insert and delete policies for signed-in users only", () => {
    expect(onMatches.map((p) => p.command).sort()).toEqual(["delete", "insert", "select"]);
    for (const p of onMatches) {
      expect(p.roles, p.command).toBe("authenticated");
      expect(p.text, p.command).toContain("(select auth.uid()) = user_id");
    }
  });

  it("has no update policy on scheme_matches and no access for anon", () => {
    expect(onMatches.filter((p) => p.command === "update" || p.command === "all")).toEqual([]);
    expect(sql).toContain("revoke all on public.scheme_matches from anon");
    expect(sql).toContain("revoke update, truncate, references, trigger on public.scheme_matches from authenticated");
    expect(sql).not.toMatch(/grant [^;]*on public\.scheme_matches to [^;]*anon/);
  });

  it("references auth.users with on delete cascade, and never profiles or assessments", () => {
    expect(sql).toContain("user_id uuid not null default auth.uid() references auth.users (id) on delete cascade");
    expect(sql).toContain("scheme_id uuid not null references public.government_schemes (id) on delete cascade");
    expect(sql).not.toMatch(/public\.(profiles|assessments)\b/);
  });

  it("allows one current version per scheme and one row per (slug, version)", () => {
    expect(sql).toContain("create unique index government_schemes_one_current_per_slug on public.government_schemes (slug) where is_current");
    expect(sql).toContain("unique (slug, version)");
    expect(sql).toContain("create index government_schemes_status_current on public.government_schemes (status, is_current)");
    expect(sql).toContain("create index scheme_matches_user_created on public.scheme_matches (user_id, created_at desc)");
  });

  it("checks the envelope of the rules, the sources and the https URLs", () => {
    expect(sql).toContain("jsonb_typeof(eligibility_rules) = 'object'");
    expect(sql).toContain("eligibility_rules -> 'schemaversion' = '1'::jsonb");
    expect(sql).toContain("eligibility_rules ? 'required'");
    expect(sql).toContain("pg_column_size(eligibility_rules) <=");
    expect(sql).toContain("jsonb_typeof(benefits) = 'array'");
    expect(sql).toContain("jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) >= 1");
    expect(sql).toContain("official_url like 'https://%'");
    expect(sql).toContain("application_url like 'https://%'");
    expect(sql).toContain("version >= 1");
    expect(sql).toContain("min_loan_amount <= max_loan_amount");
    expect(sql).toContain("status in ('draft', 'active', 'retired')");
    expect(sql).toContain("scheme_type in ('loan', 'credit_guarantee', 'credit_linked_subsidy', 'composite')");
    expect(sql).toContain("verification_status in ('verified', 'unverified')");
    expect(sql).toContain("slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'");
  });

  it("limits scheme_matches to known statuses, scores and sizes, and 500 rows per person", () => {
    expect(sql).toContain("status in ('appears_relevant', 'needs_more_information', 'not_matched')");
    expect(sql).toContain("relevance_score between 0 and 100");
    expect(sql).toContain("pg_column_size(profile) <= 4096");
    expect(sql).toContain("pg_column_size(evaluation) <= 16384");
    expect(sql).toContain(">= 500");
    expect(sql).toContain("raise exception 'scheme_match_limit' using errcode = 'p0001'");
    expect(sql).toContain("create function public.enforce_scheme_match_limit()");
    expect(sql).not.toContain("create function public.enforce_pathway_limits");
  });

  it("defines the versioning triggers as security definer with an empty search_path, and revokes execute", () => {
    for (const fn of ["government_schemes_before_insert", "government_schemes_before_update", "enforce_scheme_match_limit"]) {
      const m = new RegExp(`create function public\\.${fn}\\(\\) returns trigger language plpgsql security definer set search_path = ''`).exec(sql);
      expect(m, fn).not.toBeNull();
      expect(sql, fn).toContain(`revoke execute on function public.${fn}() from public, anon, authenticated`);
    }
    expect(sql).toContain("create trigger government_schemes_before_insert before insert on public.government_schemes");
    expect(sql).toContain("create trigger government_schemes_before_update before update on public.government_schemes");
    expect(sql).toContain("create trigger scheme_matches_limit before insert on public.scheme_matches");
  });

  it("requires the next version on insert and clears the previous current version", () => {
    expect(sql).toContain("new.version is distinct from coalesce(latest, 0) + 1");
    expect(sql).toContain("update public.government_schemes set is_current = false where slug = new.slug and is_current");
  });

  it("freezes every published column in the update trigger and leaves only the bookkeeping ones", () => {
    const body = /create function public\.government_schemes_before_update\(\).*?\$\$;/.exec(sql)?.[0] ?? "";
    expect(body).not.toBe("");
    const frozen = [
      "slug", "version", "name", "short_name", "scheme_type", "summary", "benefits", "implementing_agency", "ministry",
      "min_loan_amount", "max_loan_amount", "eligibility_rules", "how_to_apply", "application_url", "official_url", "sources", "effective_from",
    ];
    for (const column of frozen) expect(body, column).toContain(`new.${column} is distinct from old.${column}`);
    for (const column of ["status", "is_current", "last_verified_at", "verification_status"]) {
      expect(body, column).not.toContain(`new.${column} is distinct from old.${column}`);
    }
    expect(body).toContain("new.updated_at = now()");
    expect(body).toContain("raise exception 'scheme_version_is_immutable");
  });

  it("ends with a manual RLS check for the SQL editor", () => {
    const tail = lf(raw).slice(lf(raw).lastIndexOf("-- Manual check of row level security"));
    expect(tail).toContain("set local role anon");
    expect(tail).toContain("set local role authenticated");
    expect(tail).toMatch(/expect: ERROR permission denied/);
    expect(tail).toContain("rollback;");
  });

  it("creates the same columns that schemeRowSchema reads, plus created_at and updated_at", () => {
    const columns = (table: string) => {
      const body = new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(lf(raw))?.[1] ?? "";
      return [...body.matchAll(/^ {2}([a-z_]+) (?:uuid|text|integer|boolean|numeric|date|jsonb|timestamptz|smallint)\b/gm)].map((m) => m[1]);
    };
    expect([...columns("government_schemes")].sort()).toEqual([...Object.keys(schemeRowSchema.shape), "created_at", "updated_at"].sort());
    expect([...columns("scheme_matches")].sort()).toEqual(
      ["id", "user_id", "scheme_id", "scheme_slug", "scheme_version", "status", "relevance_score", "profile", "evaluation", "created_at"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// The Database type cannot drift from the zod row schema. These are compile-time checks (npx tsc);
// the runtime assertions below only keep the values in use.
// ---------------------------------------------------------------------------------------------
type DbRow = Database["public"]["Tables"]["government_schemes"]["Row"];
type MissingInDb = Exclude<keyof SchemeRow, keyof DbRow>;
type ExtraInDb = Exclude<keyof DbRow, keyof SchemeRow | "created_at" | "updated_at">;

const noKeyMissingFromDb: [MissingInDb] extends [never] ? true : never = true;
const noKeyExtraInDb: [ExtraInDb] extends [never] ? true : never = true;

/**
 * A parsed row is a valid database row, minus the two timestamps the zod schema does not read.
 * eligibility_rules is left out only because `Json` has no room for a TypeScript interface; its
 * column is still compared by name above.
 */
type Shared = "created_at" | "updated_at" | "eligibility_rules";
const asDbRow = (row: Omit<SchemeRow, "eligibility_rules">): Omit<GovernmentSchemeRow, Shared> => row;

const exampleMatch: SchemeMatchRow = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  scheme_id: "00000000-0000-4000-8000-000000000003",
  scheme_slug: "example",
  scheme_version: 1,
  status: "needs_more_information",
  relevance_score: 40,
  profile: {},
  evaluation: {},
  created_at: "2026-10-06T00:00:00Z",
};

describe("Database types", () => {
  it("keeps government_schemes in step with schemeRowSchema", () => {
    expect(noKeyMissingFromDb && noKeyExtraInDb).toBe(true);
    const row = schemeRowSchema.parse({ ...seed[0], id: "00000000-0000-4000-8000-000000000004", is_current: true });
    const dbRow = asDbRow(row);
    expect(Object.keys(dbRow).sort()).toEqual(Object.keys(schemeRowSchema.shape).sort());
  });

  it("has a scheme_matches row whose status values are the three match statuses", () => {
    expect(exampleMatch.status).toBe("needs_more_information");
    const insert: Database["public"]["Tables"]["scheme_matches"]["Insert"] = {
      scheme_id: exampleMatch.scheme_id,
      scheme_slug: "example",
      scheme_version: 1,
      status: "appears_relevant",
      relevance_score: 90,
      profile: {},
      evaluation: {},
    };
    expect(insert.user_id).toBeUndefined();
  });
});
