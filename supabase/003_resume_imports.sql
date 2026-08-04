-- ===========================================================================
-- Resume Generator — resume import log
-- ===========================================================================
--
-- Run this in the Supabase SQL editor after schema.sql and 002_entitlements.sql.
-- Safe to re-run.
--
-- One row per resume upload, used only to rate limit them. Uploading a file
-- costs a DeepSeek call, and unlike a generation it is not covered by the free
-- tier meter — without this a signed-in user could upload in a loop and spend
-- the deployment's API budget.
--
-- Deliberately not a usage meter: nothing is shown to the user and nothing is
-- billed on it. It exists to cap abuse, so it stores no filename and no
-- content, only who and when.
-- ===========================================================================

create table if not exists public.resume_imports (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists resume_imports_user_created_idx
  on public.resume_imports (user_id, created_at desc);

alter table public.resume_imports enable row level security;

-- Users may read their own rows; nothing in the app needs this today, but it
-- keeps the table consistent with the others and answerable to a support query.
drop policy if exists "own imports: select" on public.resume_imports;
create policy "own imports: select" on public.resume_imports
  for select using (auth.uid() = user_id);

-- No insert or delete policy for users, exactly as with `generations`. Rows are
-- written only by the server's service-role key, so nobody can clear their own
-- rate limit.
