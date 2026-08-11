-- ===========================================================================
-- Migration 005 — make the free-tier limit race-proof
-- ===========================================================================
--
-- Run this in the Supabase SQL editor after 004. Safe to re-run.
--
-- The problem it fixes:
--
--   /api/generate used to read the usage count, run two DeepSeek calls, and
--   only then write the generations row. Those calls take twenty to forty
--   seconds, and nothing reserved the slot in between. A user on their last
--   free generation could fire twenty requests at once; every one of them read
--   the same count, every one passed the check, and every one was billed to
--   the deployment's API key.
--
--   Application code cannot close that window. Each request runs in its own
--   serverless function with no shared memory, so the only place the check and
--   the write can happen together is inside the database.
--
-- How this closes it:
--
--   claim_generation() takes a per-user advisory lock for the length of its
--   transaction, counts, and inserts — so two concurrent claims for the same
--   user are serialised and the second one sees the first one's row. The lock
--   is keyed to the user, so different users never wait on each other.
--
--   The row is written BEFORE the AI calls, not after. If generation then
--   fails, the route deletes it again with release_generation(), so nobody is
--   charged for a resume they never received.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Claim one generation, or refuse.
-- ---------------------------------------------------------------------------
-- Returns the new row's id, or NULL when the user is already at their limit.
create or replace function public.claim_generation(
  p_user_id     uuid,
  p_limit       integer,
  p_window_days integer
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_id   bigint;
begin
  /*
   * Serialise concurrent claims for this one user. Taken at transaction scope,
   * so it is released automatically on commit or rollback — there is no path
   * where a crashed request leaves the lock held.
   *
   * Keyed on the user id, so two different people never block each other.
   */
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*)
    into v_used
    from public.generations
   where user_id = p_user_id
     and created_at > now() - make_interval(days => p_window_days);

  if v_used >= p_limit then
    return null;
  end if;

  insert into public.generations (user_id)
  values (p_user_id)
  returning id into v_id;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- Give a claimed slot back.
-- ---------------------------------------------------------------------------
-- Called when generation fails after the slot was taken. Deletes by id, so it
-- can only ever remove the row this request created.
create or replace function public.release_generation(p_id bigint)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.generations where id = p_id;
$$;


-- ---------------------------------------------------------------------------
-- Lock them down.
-- ---------------------------------------------------------------------------
-- These live in `public` because that is the only schema Supabase exposes to
-- PostgREST, and the server calls them over that API with the service-role
-- key. Exposed is not the same as callable: EXECUTE is revoked from PUBLIC —
-- not merely from anon and authenticated, since Postgres grants it to PUBLIC
-- by default and revoking from the named roles alone leaves that inherited
-- grant in place.
--
-- Without this, any signed-in user could call release_generation() and wipe
-- their own meter, or call claim_generation() with somebody else's id and
-- burn through their free tier.
--
-- Repeated after the definitions because `create or replace` re-issues the
-- default PUBLIC grant every time this file is run.
revoke all on function public.claim_generation(uuid, integer, integer)
  from public, anon, authenticated;
revoke all on function public.release_generation(bigint)
  from public, anon, authenticated;

grant execute on function public.claim_generation(uuid, integer, integer)
  to service_role;
grant execute on function public.release_generation(bigint)
  to service_role;
