import "server-only";

import Stripe from "stripe";
import {
  FALLBACK_PLAN_PERIOD,
  FALLBACK_PLAN_PRICE,
  type PlanPricing,
} from "./plan";

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

/* ------------------------------------------------------------------ */
/* What the plan actually costs                                        */
/* ------------------------------------------------------------------ */

/**
 * Stripe is the only thing that knows what a customer is really charged, so
 * the price shown on the page is read from it rather than typed twice.
 *
 * Cached in memory: a price changes maybe once a year, and every landing page
 * view would otherwise be a round trip to Stripe.
 */
const TTL_MS = 60 * 60 * 1000; // one hour

let priceCache: { value: PlanPricing; at: number } | null = null;

const FALLBACK: PlanPricing = {
  price: FALLBACK_PLAN_PRICE,
  period: FALLBACK_PLAN_PERIOD,
  live: false,
};

/** Format Stripe's minor units into something a person reads. */
function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      // Drop ".00" but keep "9.50".
      minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * The live plan price, or the fallback when billing is unconfigured or Stripe
 * cannot be reached. Never throws — a pricing page that fails to render is
 * worse than one showing a slightly stale figure.
 */
export async function getPlanPricing(): Promise<PlanPricing> {
  if (priceCache && Date.now() - priceCache.at < TTL_MS) {
    return priceCache.value;
  }

  const id = process.env.STRIPE_PRICE_ID;
  if (!billingEnabled() || !id) return FALLBACK;

  try {
    const price = await stripe().prices.retrieve(id);

    if (!price.unit_amount || !price.recurring?.interval) return FALLBACK;

    const count = price.recurring.interval_count ?? 1;
    const value: PlanPricing = {
      price: formatAmount(price.unit_amount, price.currency),
      period:
        count > 1
          ? `${count} ${price.recurring.interval}s`
          : price.recurring.interval,
      live: true,
    };

    priceCache = { value, at: Date.now() };
    return value;
  } catch {
    // Stripe unreachable or the id is wrong — show the fallback rather than
    // breaking the page.
    return FALLBACK;
  }
}
