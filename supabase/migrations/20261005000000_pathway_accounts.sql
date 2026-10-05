-- Pathway: accounts, saved plans, progress check-ins and partner enquiries.
--
-- Run once on a fresh Supabase project (SQL editor, or `supabase db push`). Safe to read top to
-- bottom: every table has row level security switched on, and the only rows anyone can touch are
-- their own. The app never uses the service role key; it talks to the database as the signed-in
-- user, so these policies are the whole access control.

-- ---------------------------------------------------------------------------------------------
-- Profiles: one row per account, written by trigger when the account is created.
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------------------------
-- Saved plans: an applicant profile the person wants to come back to.
-- `applicant` holds the ten numbers the model reads (income in rupees, ratios as fractions).
-- The app validates every value before it writes; the checks here are a size backstop.
-- ---------------------------------------------------------------------------------------------
create table public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  applicant jsonb not null check (jsonb_typeof(applicant) = 'object' and pg_column_size(applicant) <= 2048),
  lang text not null default 'en' check (lang in ('en', 'hi', 'mr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_plans_user_created on public.saved_plans (user_id, created_at desc);

alter table public.saved_plans enable row level security;

create policy "Plans: read own" on public.saved_plans
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Plans: add own" on public.saved_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Plans: change own" on public.saved_plans
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Plans: delete own" on public.saved_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------------------------
-- Check-ins: the person's numbers on a given day, so progress against a plan can be tracked.
-- `score` is the Pathway score the app computed for those numbers at the time.
-- ---------------------------------------------------------------------------------------------
create table public.plan_checkins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saved_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  applicant jsonb not null check (jsonb_typeof(applicant) = 'object' and pg_column_size(applicant) <= 2048),
  score smallint not null check (score between 300 and 900),
  created_at timestamptz not null default now()
);

create index plan_checkins_plan_created on public.plan_checkins (plan_id, created_at desc);
create index plan_checkins_user on public.plan_checkins (user_id);

alter table public.plan_checkins enable row level security;

create policy "Check-ins: read own" on public.plan_checkins
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Check-ins: add to own plan" on public.plan_checkins
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.saved_plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
  );

create policy "Check-ins: delete own" on public.plan_checkins
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Caps, so one account cannot fill the database: 50 plans per person, 120 check-ins per plan
-- (ten years of monthly check-ins). Also keeps saved_plans.updated_at current.
create function public.enforce_pathway_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'saved_plans' then
    if (select count(*) from public.saved_plans where user_id = new.user_id) >= 50 then
      raise exception 'plan_limit' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'plan_checkins' then
    if (select count(*) from public.plan_checkins where plan_id = new.plan_id) >= 120 then
      raise exception 'checkin_limit' using errcode = 'P0001';
    end if;
    update public.saved_plans set updated_at = now() where id = new.plan_id;
  end if;
  return new;
end;
$$;

create trigger saved_plans_limit
  before insert on public.saved_plans
  for each row execute function public.enforce_pathway_limits();

create trigger plan_checkins_limit
  before insert on public.plan_checkins
  for each row execute function public.enforce_pathway_limits();

revoke execute on function public.enforce_pathway_limits() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Deleting an account: the person's own right to erasure. Removing the auth user cascades to
-- every row above. Callable only by a signed-in user, and only ever for themselves.
-- ---------------------------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Partner enquiries from the "For lenders" page. Nobody can read this table through the API;
-- read it in the Supabase dashboard. Rows arrive only through submit_partner_enquiry, which
-- validates and throttles, so the public key cannot be used to flood it.
-- ---------------------------------------------------------------------------------------------
create table public.partner_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  organisation text not null check (char_length(organisation) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  kind text not null check (kind in ('lender', 'fintech', 'regulator', 'other')),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index partner_enquiries_created on public.partner_enquiries (created_at desc);
create index partner_enquiries_email_created on public.partner_enquiries (lower(email), created_at desc);

alter table public.partner_enquiries enable row level security;
-- No policies: no direct reads or writes through the API.

create function public.submit_partner_enquiry(
  p_name text,
  p_organisation text,
  p_email text,
  p_kind text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The same address at most 3 times a day, and at most 60 enquiries an hour in total.
  if (select count(*) from public.partner_enquiries
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.partner_enquiries where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'enquiry_throttled' using errcode = 'P0001';
  end if;

  insert into public.partner_enquiries (name, organisation, email, kind, message)
  values (trim(p_name), trim(p_organisation), lower(trim(p_email)), p_kind, coalesce(trim(p_message), ''));
end;
$$;

revoke execute on function public.submit_partner_enquiry(text, text, text, text, text) from public;
grant execute on function public.submit_partner_enquiry(text, text, text, text, text) to anon, authenticated;
