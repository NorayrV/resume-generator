-- ===========================================================================
-- Migration 004 — complimentary unlimited access
-- ===========================================================================
--
-- Run this in the Supabase SQL editor after 003. Safe to re-run.
--
-- Lets the owner grant unlimited access to specific people — themselves,
-- friends, testers — without a payment. It reuses the existing entitlement
-- model rather than inventing a second notion of "is this user allowed":
-- a comped user simply has an `access_until` far in the future, so every
-- check above lib/billing.ts keeps working untouched.
--
-- Usage, from the SQL editor:
--
--   select admin.grant_unlimited('friend@example.com');
--   select admin.revoke_unlimited('friend@example.com');
--   select * from admin.list_unlimited();
--
-- The person must have signed in at least once first, so that an account
-- exists to attach the entitlement to. The functions say so if not.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- A schema PostgREST does not expose.
-- ---------------------------------------------------------------------------
-- This matters. Supabase publishes every function in `public` as a REST RPC
-- endpoint, so a grant_unlimited() living there could be called by any signed
-- in user against their own account — anybody could give themselves the paid
-- plan. Keeping these in `admin`, which is not in the exposed schema list,
-- means they can only ever be run from the SQL editor or by the service role.
-- ---------------------------------------------------------------------------
create schema if not exists admin;

-- Revoke from PUBLIC, not just from anon and authenticated. Postgres grants
-- EXECUTE on every new function to PUBLIC by default, and revoking from the
-- two named roles leaves that default grant sitting there untouched — the
-- roles still hold the privilege, inherited. PUBLIC is the one that matters.
revoke all on schema admin from public, anon, authenticated;
revoke all on all functions in schema admin from public, anon, authenticated;


-- How far out a comp runs. Not `infinity`: JavaScript's new Date('infinity')
-- is an Invalid Date, and the comparison in hasPaidAccess() would silently
-- become false, locking out the very people this is meant to let in.
create or replace function admin.comp_until()
returns timestamptz
language sql
immutable
as $$ select timestamptz '2099-12-31 00:00:00+00' $$;


-- ---------------------------------------------------------------------------
-- Grant
-- ---------------------------------------------------------------------------
create or replace function admin.grant_unlimited(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id  uuid;
  v_existing text;
begin
  select id into v_user_id
    from auth.users
   where lower(email) = lower(trim(p_email))
   limit 1;

  if v_user_id is null then
    return format(
      'No account for %s. Ask them to sign in once first, then run this again.',
      p_email
    );
  end if;

  -- Never silently destroy a real paid subscription: if one is there, say so
  -- in the result rather than quietly dropping the provider's reference ids.
  select provider into v_existing
    from public.entitlements
   where user_id = v_user_id
     and provider in ('polar', 'cryptomus');

  insert into public.entitlements (
    user_id, provider, status, access_until,
    external_customer_id, external_subscription_id, updated_at
  )
  values (
    v_user_id, 'comp', 'comp', admin.comp_until(),
    null, null, now()
  )
  on conflict (user_id) do update
    set provider                 = 'comp',
        status                   = 'comp',
        access_until             = admin.comp_until(),
        external_customer_id     = null,
        external_subscription_id = null,
        updated_at               = now();

  if v_existing is not null then
    return format(
      '%s now has unlimited access. NOTE: this replaced an existing %s entitlement — cancel it with that provider so they are not still being charged.',
      p_email, v_existing
    );
  end if;

  return format('%s now has unlimited access.', p_email);
end;
$$;


-- ---------------------------------------------------------------------------
-- Revoke
-- ---------------------------------------------------------------------------
create or replace function admin.revoke_unlimited(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_rows    integer;
begin
  select id into v_user_id
    from auth.users
   where lower(email) = lower(trim(p_email))
   limit 1;

  if v_user_id is null then
    return format('No account for %s.', p_email);
  end if;

  -- Only ever removes a comp. A real Polar or Cryptomus entitlement is left
  -- alone, so this can never cut off someone who actually paid.
  delete from public.entitlements
   where user_id = v_user_id
     and provider = 'comp';

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return format('%s had no complimentary access to remove.', p_email);
  end if;

  return format('%s is back on the free plan.', p_email);
end;
$$;


-- ---------------------------------------------------------------------------
-- List
-- ---------------------------------------------------------------------------
create or replace function admin.list_unlimited()
returns table (email text, granted_at timestamptz)
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select u.email::text, e.updated_at
    from public.entitlements e
    join auth.users u on u.id = e.user_id
   where e.provider = 'comp'
   order by e.updated_at desc;
$$;


-- ---------------------------------------------------------------------------
-- Lock the functions down.
-- ---------------------------------------------------------------------------
-- Repeated after the definitions because CREATE FUNCTION issues a fresh
-- EXECUTE grant to PUBLIC every time it runs — including when this file is
-- re-run with `create or replace`. Without these lines a second run would
-- quietly hand the privilege back.
--
-- These are SECURITY DEFINER functions that hand out unlimited access, so the
-- schema-level block is not something to rely on by itself.
revoke all on function admin.grant_unlimited(text)  from public, anon, authenticated;
revoke all on function admin.revoke_unlimited(text) from public, anon, authenticated;
revoke all on function admin.list_unlimited()       from public, anon, authenticated;
