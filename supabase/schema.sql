-- ===========================================================================
-- Gatecrash — database schema
-- ===========================================================================
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is safe to re-run: every statement is guarded.
--
-- Two tables, both keyed to auth.users:
--
--   profiles       one resume profile per user
--   generations    one row per resume generated, used to count the free tier
--
-- Paid access lives in 002_entitlements.sql, which is provider-agnostic.
-- Run this file first, then 002.
--
-- Row Level Security is on for both. Every policy checks auth.uid(), so
-- a user can only ever read or write their own rows — even if application
-- code has a bug, the database refuses to leak someone else's data.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- The whole MasterProfile shape, stored as-is. Keeping it as jsonb means the
  -- TypeScript type stays the single source of truth for its shape.
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile: select" on public.profiles;
create policy "own profile: select" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "own profile: insert" on public.profiles;
create policy "own profile: insert" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile: delete" on public.profiles;
create policy "own profile: delete" on public.profiles
  for delete using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- generations — the usage meter behind the free tier
-- ---------------------------------------------------------------------------
create table if not exists public.generations (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

alter table public.generations enable row level security;

-- Users may read their own usage so the account page can show it.
drop policy if exists "own generations: select" on public.generations;
create policy "own generations: select" on public.generations
  for select using (auth.uid() = user_id);

-- Deliberately no insert policy for users. Rows are written only by the
-- server using the service-role key, so nobody can wipe or forge their own
-- meter to get past the free-tier limit.


-- ---------------------------------------------------------------------------
-- Give every new signup an empty profile row, so the app never has to
-- special-case "user exists but has no profile".
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, data)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
