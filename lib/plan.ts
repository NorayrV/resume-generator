/**
 * Plan limits, in a file with no imports.
 *
 * Client components need these numbers too, so they must not live next to the
 * service-role Supabase client — importing that into the browser bundle would
 * be a serious mistake.
 */

/** Generations included in the free tier, per rolling 30 days. */
export const FREE_GENERATIONS_PER_MONTH = 5;

/** Rolling window the free tier is counted over. */
export const USAGE_WINDOW_DAYS = 30;

/**
 * What the paid plan costs, for display only.
 *
 * Stripe is the source of truth for what is actually charged — this string
 * just saves showing an unpriced "Upgrade" button. If you change the price in
 * Stripe, change it here too, or the page will quote the old one.
 */
export const PLAN_PRICE_DISPLAY = "$9";
export const PLAN_PERIOD_DISPLAY = "month";
