-- ===========================================================================
-- Migration 007 — a general-purpose per-user rate limiter
-- ===========================================================================
--
-- Run in the Supabase SQL editor after 006. Safe to re-run.
--
-- `resume_imports` solved this once for uploads, with a table of its own. A
-- second limiter is now needed for downloads, and a third will follow, so this
-- generalises the pattern instead of adding a table each time: one row per
-- limited event, tagged with the bucket it belongs to.
--
-- resume_imports is deliberately left alone. It works, it is deployed, and
-- migrating it would churn a live limiter for tidiness.
--
-- The claim is atomic for the same reason claim_generation() is: two requests
-- that read a count and then write have a window between them, and serverless
-- functions share no memory, so only the database can close it.
-- ===========================================================================

create table if not exists public.rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- Which limit this row counts against, e.g. 'download'.
  bucket     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_user_bucket_idx
  on public.rate_events (user_id, bucket, created_at desc);

alter table public.rate_events enable row level security;

-- No policy at all: nothing in the app reads this as a user, and the server
-- reaches it through the service role. RLS on with no policy means an ordinary
-- caller sees nothing and can write nothing.


-- ---------------------------------------------------------------------------
-- Claim one event, or refuse.
-- ---------------------------------------------------------------------------
-- Returns true when the caller was under the limit and a row was written.
create or replace function public.claim_rate_event(
  p_user_id      uuid,
  p_bucket       text,
  p_limit        integer,
  p_window_secs  integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
begin
  -- Serialise claims for this user and bucket. Transaction-scoped, so it is
  -- released on commit or rollback with no path that leaks the lock.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_bucket, 0));

  select count(*)
    into v_used
    from public.rate_events
   where user_id = p_user_id
     and bucket = p_bucket
     and created_at > now() - make_interval(secs => p_window_secs);

  if v_used >= p_limit then
    return false;
  end if;

  insert into public.rate_events (user_id, bucket) values (p_user_id, p_bucket);
  return true;
end;
$$;


-- ---------------------------------------------------------------------------
-- Housekeeping.
-- ---------------------------------------------------------------------------
-- Nothing reads rows older than the longest window, and this table grows on
-- every limited action. Call it from a scheduled job, or by hand now and then.
create or replace function public.prune_rate_events(p_older_than_days integer default 2)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_deleted bigint;
begin
  delete from public.rate_events
   where created_at < now() - make_interval(days => p_older_than_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- ---------------------------------------------------------------------------
-- Lock them down.
-- ---------------------------------------------------------------------------
-- Same reasoning as 005: these live in `public` because that is the schema
-- PostgREST exposes and the server calls them with the service-role key, but
-- EXECUTE is revoked from PUBLIC — not just anon and authenticated, since
-- Postgres grants it to PUBLIC by default and `create or replace` re-issues
-- that grant on every run.
--
-- Otherwise a signed-in user could call claim_rate_event() against somebody
-- else's id to exhaust their limit, or prune_rate_events() to clear their own.
revoke all on function public.claim_rate_event(uuid, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.prune_rate_events(integer)
  from public, anon, authenticated;

grant execute on function public.claim_rate_event(uuid, text, integer, integer)
  to service_role;
grant execute on function public.prune_rate_events(integer)
  to service_role;
