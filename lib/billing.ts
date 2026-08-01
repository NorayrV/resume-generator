import "server-only";

import { supabaseAdmin } from "./supabase/server";

/**
 * Paid access, independent of who took the money.
 *
 * Polar renews a card subscription; Cryptomus sells a fixed window for crypto.
 * Both come down to the same question — is this user's access still in date —
 * so everything above this layer asks that and nothing else.
 */

export type Provider = "polar" | "cryptomus";

export interface Entitlement {
  provider: Provider;
  status: string | null;
  accessUntil: Date | null;
  externalCustomerId: string | null;
}

/** True while the user's paid access has not run out. */
export async function hasPaidAccess(userId: string): Promise<boolean> {
  const entitlement = await getEntitlement(userId);
  if (!entitlement?.accessUntil) return false;
  return entitlement.accessUntil.getTime() > Date.now();
}

export async function getEntitlement(
  userId: string,
): Promise<Entitlement | null> {
  const { data, error } = await supabaseAdmin()
    .from("entitlements")
    .select("provider, status, access_until, external_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    provider: data.provider as Provider,
    status: data.status,
    accessUntil: data.access_until ? new Date(data.access_until) : null,
    externalCustomerId: data.external_customer_id,
  };
}

/**
 * Record paid access.
 *
 * Called only from webhook handlers, which run as the service role — users
 * have no write policy on the table, so nobody can grant themselves access.
 */
export async function grantAccess(input: {
  userId: string;
  provider: Provider;
  status: string;
  accessUntil: Date;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
}): Promise<void> {
  await supabaseAdmin().from("entitlements").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      status: input.status,
      access_until: input.accessUntil.toISOString(),
      external_customer_id: input.externalCustomerId ?? null,
      external_subscription_id: input.externalSubscriptionId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Extend access from whichever is later: now, or what the user already has.
 *
 * Used for one-off crypto purchases, so paying again before expiry adds to
 * the remaining time rather than throwing it away.
 */
export async function extendAccess(input: {
  userId: string;
  provider: Provider;
  days: number;
  externalCustomerId?: string | null;
}): Promise<Date> {
  const existing = await getEntitlement(input.userId);
  const now = Date.now();

  const from =
    existing?.accessUntil && existing.accessUntil.getTime() > now
      ? existing.accessUntil.getTime()
      : now;

  const accessUntil = new Date(from + input.days * 24 * 60 * 60 * 1000);

  await grantAccess({
    userId: input.userId,
    provider: input.provider,
    status: "active",
    accessUntil,
    externalCustomerId: input.externalCustomerId ?? null,
  });

  return accessUntil;
}

/** End access now. Used when a provider revokes rather than lets it lapse. */
export async function revokeAccess(
  userId: string,
  status: string,
): Promise<void> {
  await supabaseAdmin()
    .from("entitlements")
    .update({
      status,
      access_until: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
