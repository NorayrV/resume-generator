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
