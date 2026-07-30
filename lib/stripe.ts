import Stripe from "stripe";

/**
 * Stripe client, created lazily.
 *
 * Constructing it at module load would crash the whole app on a deployment
 * that has not configured billing yet, so callers get the error only when
 * they actually try to charge someone.
 */

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }

  cached = new Stripe(key);
  return cached;
}

/** True when billing is configured. The UI hides upgrade prompts when false. */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}
