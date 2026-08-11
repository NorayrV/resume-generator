-- ===========================================================================
-- Migration 006 — two fixes flagged by the Supabase database linter
-- ===========================================================================
--
-- Run in the Supabase SQL editor after 005. Safe to re-run.
--
--
-- 1. RLS policies re-evaluated once per row
--
--    Every policy was written as `auth.uid() = user_id`. Postgres treats
--    auth.uid() as volatile there and calls it again for every row it tests,
--    so a query over a thousand rows makes a thousand identical calls.
--
--    Wrapping it in a scalar subquery — `(select auth.uid()) = user_id` — lets
--    the planner hoist it into an InitPlan, evaluated once per statement. The
--    condition is identical; only how often it is computed changes.
--
--    This is the single biggest database-side scaling issue in the schema, and
--    it gets worse in proportion to how much data each table holds.
--
--
-- 2. admin.comp_until() had no fixed search_path
--
--    The other functions in 004 set one; this one was missed. A SECURITY
--    DEFINER function without a pinned search_path can be induced to resolve
--    an unqualified name against a schema the caller controls. comp_until()
--    only returns a constant, so there is nothing here to hijack in practice,
--    but leaving one function in the set inconsistent is how the habit slips.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Hoist auth.uid() out of the per-row loop
-- ---------------------------------------------------------------------------

drop policy if exists "own profile: select" on public.profiles;
create policy "own profile: select" on public.profiles
  for select using ((select auth.uid()) = user_id);

drop policy if exists "own profile: insert" on public.profiles;
create policy "own profile: insert" on public.profiles
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: update" on public.profiles
  for update using ((select auth.uid()) = user_id)
           with check ((select auth.uid()) = user_id);

drop policy if exists "own profile: delete" on public.profiles;
create policy "own profile: delete" on public.profiles
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "own generations: select" on public.generations;
create policy "own generations: select" on public.generations
  for select using ((select auth.uid()) = user_id);

drop policy if exists "own entitlement: select" on public.entitlements;
create policy "own entitlement: select" on public.entitlements
  for select using ((select auth.uid()) = user_id);

drop policy if exists "own imports: select" on public.resume_imports;
create policy "own imports: select" on public.resume_imports
  for select using ((select auth.uid()) = user_id);

-- crypto_invoices is no longer written to — Cryptomus was removed — but the
-- table still exists and still has RLS, so its policy is fixed alongside the
-- rest rather than left as the one odd case out.
drop policy if exists "own invoices: select" on public.crypto_invoices;
create policy "own invoices: select" on public.crypto_invoices
  for select using ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- 2. Pin the search_path 004 missed
-- ---------------------------------------------------------------------------
create or replace function admin.comp_until()
returns timestamptz
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$ select timestamptz '2099-12-31 00:00:00+00' $$;

revoke all on function admin.comp_until() from public, anon, authenticated;
