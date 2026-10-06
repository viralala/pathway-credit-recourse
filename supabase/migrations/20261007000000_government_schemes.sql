-- Pathway: government schemes and a signed-in person's scheme match history.
--
-- Run once, after 20261005000000_pathway_accounts.sql (SQL editor, or `supabase db push`). Then
-- run 20261007000001_seed_government_schemes.sql to load the reviewed starting data.
--
-- Two tables:
--   * government_schemes: the catalogue the matching engine reads. Anyone (signed in or not) can
--     read the current, active version of each scheme. Nobody can write through the API: schemes
--     change only through migrations, the SQL editor or the service role.
--   * scheme_matches: a person's own match history. Each person sees and edits only their own rows.
--
-- The row shape mirrors `schemeRowSchema` in lib/schemes/schema.ts. The check constraints below
-- repeat the zod rules as a backstop; the app validates every row it reads either way.
-- This file does not touch public.profiles or public.assessments (the repo has two older schema
-- generations); auth.users exists in both.

-- ---------------------------------------------------------------------------------------------
-- Government schemes. A scheme is a slug plus versions: a change to a scheme's published content
-- is a NEW row with the next version, never an edit, so old matches can always be explained.
-- ---------------------------------------------------------------------------------------------
create table public.government_schemes (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  version integer not null default 1 check (version >= 1),
  is_current boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  name text not null check (char_length(name) between 3 and 200),
  short_name text not null check (char_length(short_name) between 2 and 40),
  scheme_type text not null check (scheme_type in ('loan', 'credit_guarantee', 'credit_linked_subsidy', 'composite')),
  summary text not null check (char_length(summary) between 10 and 1000),
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array' and jsonb_array_length(benefits) <= 12),
  implementing_agency text not null check (char_length(implementing_agency) between 2 and 200),
  ministry text check (ministry is null or char_length(ministry) between 2 and 200),
  min_loan_amount numeric check (min_loan_amount is null or min_loan_amount >= 0),
  max_loan_amount numeric check (max_loan_amount is null or max_loan_amount >= 0),
  -- The published eligibility criteria as a rule document (see EligibilityRules in lib/schemes/types.ts).
  -- The app validates the whole document; here we only insist on the envelope and a size limit.
  eligibility_rules jsonb not null check (
    jsonb_typeof(eligibility_rules) = 'object'
    and eligibility_rules -> 'schemaVersion' = '1'::jsonb
    and eligibility_rules ? 'required'
    and pg_column_size(eligibility_rules) <= 65536
  ),
  how_to_apply text check (how_to_apply is null or char_length(how_to_apply) between 3 and 1000),
  application_url text check (application_url is null or (application_url like 'https://%' and char_length(application_url) <= 500)),
  official_url text not null check (official_url like 'https://%' and char_length(official_url) <= 500),
  -- Where the row was read from: at least one official source, each { "title": ..., "url": "https://..." }.
  sources jsonb not null check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) >= 1 and jsonb_array_length(sources) <= 8),
  -- The day the row was last checked against the official source, and whether it matched.
  last_verified_at date not null,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified')),
  effective_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint government_schemes_slug_version_key unique (slug, version),
  constraint government_schemes_loan_range check (
    min_loan_amount is null or max_loan_amount is null or min_loan_amount <= max_loan_amount
  )
);

-- At most one current version of each scheme.
create unique index government_schemes_one_current_per_slug
  on public.government_schemes (slug) where is_current;

-- The read path: "every active, current scheme".
create index government_schemes_status_current on public.government_schemes (status, is_current);

-- Row level security, and why there is exactly one policy.
-- The only thing the API may do with this table is read the active, current version of each
-- scheme. There are deliberately NO insert, update or delete policies, so with row level security
-- on, the public (anon) key and every signed-in user are refused any write. The revoke below
-- removes the table privileges as well, so a write fails even before a policy is consulted.
-- Retired, draft and superseded versions are not visible through the API at all.
alter table public.government_schemes enable row level security;

create policy "Schemes: read current active" on public.government_schemes
  for select to anon, authenticated using (status = 'active' and is_current);

revoke insert, update, delete on public.government_schemes from anon, authenticated;
revoke truncate, references, trigger on public.government_schemes from anon, authenticated;
grant select on public.government_schemes to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Versioning, enforced by triggers so it holds whoever writes (SQL editor, migration, service role).
-- ---------------------------------------------------------------------------------------------

-- Before insert: the version must be the next one for the slug (1 for a new slug), and a row that
-- is inserted as the current version takes over from the previous current one.
create function public.government_schemes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest integer;
begin
  -- Two sessions adding a version of the same scheme at once take turns.
  perform pg_advisory_xact_lock(hashtext('government_schemes:' || new.slug));

  select max(version) into latest from public.government_schemes where slug = new.slug;

  if new.version is distinct from coalesce(latest, 0) + 1 then
    raise exception 'scheme_version_must_be_next: % needs version %, got %', new.slug, coalesce(latest, 0) + 1, new.version
      using errcode = 'P0001';
  end if;

  if new.is_current then
    update public.government_schemes set is_current = false where slug = new.slug and is_current;
  end if;

  return new;
end;
$$;

create trigger government_schemes_before_insert
  before insert on public.government_schemes
  for each row execute function public.government_schemes_before_insert();

-- Before update: the published content of a version never changes. Only the bookkeeping columns
-- may: status (retire or reinstate), is_current (switch which version is current),
-- last_verified_at and verification_status (re-verification against the official source).
-- A change to the rules, amounts or wording is a new row with the next version.
create function public.government_schemes_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.slug is distinct from old.slug
     or new.version is distinct from old.version
     or new.name is distinct from old.name
     or new.short_name is distinct from old.short_name
     or new.scheme_type is distinct from old.scheme_type
     or new.summary is distinct from old.summary
     or new.benefits is distinct from old.benefits
     or new.implementing_agency is distinct from old.implementing_agency
     or new.ministry is distinct from old.ministry
     or new.min_loan_amount is distinct from old.min_loan_amount
     or new.max_loan_amount is distinct from old.max_loan_amount
     or new.eligibility_rules is distinct from old.eligibility_rules
     or new.how_to_apply is distinct from old.how_to_apply
     or new.application_url is distinct from old.application_url
     or new.official_url is distinct from old.official_url
     or new.sources is distinct from old.sources
     or new.effective_from is distinct from old.effective_from then
    raise exception 'scheme_version_is_immutable: add a new version instead of editing version % of %', old.version, old.slug
      using errcode = 'P0001';
  end if;

  -- Making this version current makes every other version of the scheme not current.
  if new.is_current and not old.is_current then
    update public.government_schemes
      set is_current = false
      where slug = new.slug and id <> new.id and is_current;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger government_schemes_before_update
  before update on public.government_schemes
  for each row execute function public.government_schemes_before_update();

revoke execute on function public.government_schemes_before_insert() from public, anon, authenticated;
revoke execute on function public.government_schemes_before_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Scheme matches: a signed-in person's history of match results.
-- `profile` is what they told the form, `evaluation` is how each criterion came out at the time.
-- The scheme's slug and version are copied in so a result can still be explained after the
-- scheme gets a newer version. History is append-only: there is no update policy.
-- ---------------------------------------------------------------------------------------------
create table public.scheme_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scheme_id uuid not null references public.government_schemes (id) on delete cascade,
  scheme_slug text not null,
  scheme_version integer not null,
  status text not null check (status in ('appears_relevant', 'needs_more_information', 'not_matched')),
  relevance_score smallint not null check (relevance_score between 0 and 100),
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and pg_column_size(profile) <= 4096),
  evaluation jsonb not null check (jsonb_typeof(evaluation) = 'object' and pg_column_size(evaluation) <= 16384),
  created_at timestamptz not null default now()
);

create index scheme_matches_user_created on public.scheme_matches (user_id, created_at desc);

alter table public.scheme_matches enable row level security;

create policy "Scheme matches: read own" on public.scheme_matches
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Scheme matches: add own" on public.scheme_matches
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Scheme matches: delete own" on public.scheme_matches
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Signed-out visitors have no access at all; signed-in people can read, add and delete their own
-- rows but never edit one.
revoke all on public.scheme_matches from anon;
revoke update, truncate, references, trigger on public.scheme_matches from authenticated;
grant select, insert, delete on public.scheme_matches to authenticated;

-- Cap, so one account cannot fill the database: 500 saved matches per person.
create function public.enforce_scheme_match_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.scheme_matches where user_id = new.user_id) >= 500 then
    raise exception 'scheme_match_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger scheme_matches_limit
  before insert on public.scheme_matches
  for each row execute function public.enforce_scheme_match_limit();

revoke execute on function public.enforce_scheme_match_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Manual check of row level security. No database runs in CI, so the tests only read this file.
-- To check it for real, paste the block below (without the leading "-- ") into the Supabase SQL
-- editor on a project where both migrations have run. Everything is rolled back at the end.
-- Each "expect" line says what should happen; a statement that should fail stops the script, so
-- run the statements one at a time, or wrap each in its own begin/rollback.
--
--   begin;
--
--   -- 1. A signed-out visitor can read active, current schemes and nothing else.
--   set local role anon;
--   select count(*) from public.government_schemes;                 -- expect: only active + current rows
--   select count(*) from public.government_schemes where status <> 'active' or not is_current;  -- expect: 0
--   insert into public.government_schemes (slug, name, short_name, scheme_type, summary, implementing_agency,
--     eligibility_rules, official_url, sources, last_verified_at)
--     values ('rls-probe', 'RLS probe', 'Probe', 'loan', 'Should be refused.', 'Nobody',
--       '{"schemaVersion":1,"required":{"type":"all","rules":[]}}', 'https://example.gov.in',
--       '[{"title":"x","url":"https://example.gov.in"}]', current_date);  -- expect: ERROR permission denied
--   update public.government_schemes set status = 'retired';        -- expect: ERROR permission denied
--   delete from public.government_schemes;                          -- expect: ERROR permission denied
--   select count(*) from public.scheme_matches;                     -- expect: ERROR permission denied
--   reset role;
--
--   -- 2. A signed-in user cannot write schemes, and sees only their own matches.
--   --    Replace the uuid with a real id from auth.users (Authentication > Users).
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
--   update public.government_schemes set status = 'retired';        -- expect: ERROR permission denied
--   delete from public.government_schemes;                          -- expect: ERROR permission denied
--   select count(*) from public.scheme_matches;                     -- expect: 0 (or only this user's rows)
--   insert into public.scheme_matches (user_id, scheme_id, scheme_slug, scheme_version, status, relevance_score, profile, evaluation)
--     select '00000000-0000-0000-0000-0000000000ff', id, slug, version, 'not_matched', 0, '{}', '{}'
--     from public.government_schemes limit 1;                       -- expect: ERROR new row violates row-level security policy
--   update public.scheme_matches set relevance_score = 100;         -- expect: ERROR permission denied (history is append-only)
--   reset role;
--
--   -- 3. Versioning (as the SQL editor's owner role, which can write schemes).
--   update public.government_schemes set name = 'Renamed' where slug = (select slug from public.government_schemes limit 1);
--                                                                   -- expect: ERROR scheme_version_is_immutable
--   update public.government_schemes set last_verified_at = current_date
--     where id = (select id from public.government_schemes limit 1); -- expect: succeeds (re-verification)
--
--   rollback;
