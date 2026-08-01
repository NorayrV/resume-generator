-- ===========================================================================
-- Migration 002 — replace the Stripe-shaped subscriptions table
-- ===========================================================================
--
-- Run this once in the Supabase SQL editor, after 001 (schema.sql).
--
-- Why a new table rather than more columns:
--
--   The old `subscriptions` table assumed Stripe — a customer id, a
--   subscription id, and a Stripe status string. Two providers now grant
--   access in quite different ways:
--
--     Polar      recurring card subscription, renews itself
--     Cryptomus  a one-off crypto invoice buying a fixed window of access
--
--   The one thing both agree on is a date: when does this user's access run
--   out. `access_until` is therefore the single source of truth, and the
--   provider-specific ids are just there for support and reconciliation.
--
--   Deciding access on a date also fixes a bug in the Stripe version: a
--   cancellation revoked access immediately, even though the customer had
--   paid through to the end of the period.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- entitlements — who has paid access, and until when
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id       uuid primary key references auth.users (id) on delete cascade,

  -- 'polar' | 'cryptomus'
  provider      text        not null,

  -- The provider's own words for the state, kept for support and debugging.
  -- Access is NOT decided from this — see access_until.
  status        text,

  -- Access is live while this is in the future. Polar sets it to the end of
  -- the current billing period; Cryptomus sets it to payment time plus the
  -- purchased window.
  access_until  timestamptz,

  -- Provider references, for reconciliation and the customer portal.
  external_customer_id     text,
  external_subscription_id text,

  updated_at    timestamptz not null default now()
);

create index if not exists entitlements_access_idx
  on public.entitlements (access_until);

create index if not exists entitlements_customer_idx
  on public.entitlements (external_customer_id);

alter table public.entitlements enable row level security;

-- Read-only to the user. Only the webhooks, running as the service role,
-- ever write here — otherwise anyone could grant themselves access.
drop policy if exists "own entitlement: select" on public.entitlements;
create policy "own entitlement: select" on public.entitlements
  for select using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- crypto_invoices — one row per Cryptomus invoice
-- ---------------------------------------------------------------------------
--
-- Crypto payments are asynchronous and can arrive late, partially, or twice.
-- Recording each invoice lets the webhook be idempotent: a repeated callback
-- for an invoice already marked paid extends nobody's access a second time.
-- ---------------------------------------------------------------------------
create table if not exists public.crypto_invoices (
  -- Our own id, sent to Cryptomus as order_id and echoed back on the webhook.
  order_id    text primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  -- Cryptomus's uuid for the invoice.
  invoice_uuid text,
  status      text        not null default 'pending',
  amount      text,
  currency    text,
  -- Set once, the first time a paid callback is honoured.
  credited_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists crypto_invoices_user_idx
  on public.crypto_invoices (user_id, created_at desc);

alter table public.crypto_invoices enable row level security;

drop policy if exists "own invoices: select" on public.crypto_invoices;
create policy "own invoices: select" on public.crypto_invoices
  for select using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Retire the Stripe table.
-- ---------------------------------------------------------------------------
-- Nothing is migrated across on purpose. The only row was a sandbox Stripe
-- subscription, and carrying it over would grant that account unlimited
-- access forever against a subscription that does not exist and will never
-- be billed.
-- ---------------------------------------------------------------------------
drop table if exists public.subscriptions;
