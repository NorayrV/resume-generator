import "server-only";

import { getEntitlement, grantAccess } from "./billing";
import { findLiveSubscription } from "./polar";

/**
 * Repair access that a webhook should have granted and did not.
 *
 * The webhook is one HTTP delivery to one URL. If it is pointed at the wrong
 * host, or the host redirects, or it simply fails, the customer has paid and
 * the site shows them nothing — which is the worst failure this product can
 * have, and exactly what happened: a live subscription in Polar, no
 * entitlement row here.
 *
 * So the webhook is no longer the only way in. This asks Polar what it thinks
 * and writes the answer down. Polar stays the source of truth either way; the
 * only difference is who starts the conversation.
 *
 * Safe to call repeatedly. It only ever writes when Polar reports a live
 * subscription that our table does not already reflect, and it never removes
 * access — revoking stays with the webhook, so a Polar outage cannot lock a
 * paying customer out.
 */
export interface ReconcileResult {
  /** True when this call changed the stored entitlement. */
  granted: boolean;
  accessUntil: Date | null;
  /** Present when Polar reported a subscription. */
  status?: string;
  /**
   * Set when Polar could not be asked at all.
   *
   * Kept separate from "no subscription" on purpose. Reporting a failed
   * question as a negative answer is what told a paying customer their
   * subscription did not exist.
   */
  error?: string;
}

export async function reconcileEntitlement(
  userId: string,
  /** Falls back to matching on this if no external id is recorded in Polar. */
  email?: string | null,
): Promise<ReconcileResult> {
  const existing = await getEntitlement(userId);

  /*
   * A comped account is not Polar's to describe. Overwriting it with what
   * Polar knows — which is nothing — would take away access that was granted
   * by hand.
   */
  if (existing?.provider === "comp") {
    return { granted: false, accessUntil: existing.accessUntil };
  }

  const lookup = await findLiveSubscription(userId, email);

  if (!lookup.ok) {
    return {
      granted: false,
      accessUntil: existing?.accessUntil ?? null,
      error: lookup.error,
    };
  }

  const live = lookup.subscription;

  if (!live) {
    return { granted: false, accessUntil: existing?.accessUntil ?? null };
  }

  const stored = existing?.accessUntil?.getTime() ?? 0;

  // Already recorded, and not out of date: nothing to do.
  if (stored >= live.accessUntil.getTime()) {
    return {
      granted: false,
      accessUntil: existing?.accessUntil ?? null,
      status: live.status,
    };
  }

  await grantAccess({
    userId,
    provider: "polar",
    status: live.status,
    accessUntil: live.accessUntil,
    externalCustomerId: live.customerId,
    externalSubscriptionId: live.id,
  });

  console.info(
    `[reconcile] granted access to ${userId} until ${live.accessUntil.toISOString()} (polar ${live.status}, sub ${live.id})`,
  );

  return { granted: true, accessUntil: live.accessUntil, status: live.status };
}
