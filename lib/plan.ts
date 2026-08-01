/**
 * Plan limits, in a file with no imports.
 *
 * Client components need these numbers too, so they must not live next to the
 * service-role Supabase client or the Stripe client — importing either into
 * the browser bundle would be a serious mistake.
 */

/** Generations included in the free tier, per rolling 30 days. */
export const FREE_GENERATIONS_PER_MONTH = 5;

/** Rolling window the free tier is counted over. */
export const USAGE_WINDOW_DAYS = 30;

/** What to show for the paid plan. Read from Stripe, so never typed twice. */
export interface PlanPricing {
  /** Formatted for display, e.g. "$9". */
  price: string;
  /** Billing interval, e.g. "month". */
  period: string;
  /** False when this is the fallback rather than a live Stripe price. */
  live: boolean;
}

/**
 * Shown only when Stripe is unconfigured or unreachable.
 *
 * Stripe is the source of truth for what a customer is actually charged;
 * lib/stripe.ts reads the real figure. These exist so a pricing page still
 * renders something sensible if that call fails.
 */
export const FALLBACK_PLAN_PRICE = "$9";
export const FALLBACK_PLAN_PERIOD = "month";
