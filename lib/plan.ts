/**
 * Plan limits, in a file with no imports.
 *
 * Client components need these numbers too, so they must not live next to the
 * service-role Supabase client or the payment clients — importing either into
 * the browser bundle would be a serious mistake.
 */

/** Generations included in the free tier, per rolling 30 days. */
export const FREE_GENERATIONS_PER_MONTH = 5;

/** Rolling window the free tier is counted over. */
export const USAGE_WINDOW_DAYS = 30;

/**
 * Ceilings on the free-text a user can send for an AI call.
 *
 * Every character is billed to the deployment's DeepSeek key, and both of
 * these fields previously had a floor but no ceiling — so one request could
 * cost dollars instead of a fraction of a cent. These are generous: a long
 * job posting is a few thousand characters and a two-page resume around six.
 *
 * Enforced server-side, where it counts. The UI shows the same numbers so the
 * limit is visible before the request is sent rather than after it fails.
 */
export const MAX_JOB_DESCRIPTION_CHARS = 20_000;
export const MAX_RESUME_TEXT_CHARS = 20_000;

/** What to show for the paid plan. Read from Polar, so never typed twice. */
export interface PlanPricing {
  /** Formatted for display, e.g. "$9". */
  price: string;
  /** Billing interval, e.g. "month". */
  period: string;
  /** False when this is the fallback rather than a live Polar price. */
  live: boolean;
}

/**
 * Shown only when Polar is unconfigured or unreachable.
 *
 * The Polar product is the source of truth for what a customer is actually
 * charged; lib/polar.ts reads the real figure. These exist so a pricing page
 * still renders something sensible if that call fails.
 */
export const FALLBACK_PLAN_PRICE = "$9";
export const FALLBACK_PLAN_PERIOD = "month";

/** Same figure in minor units, for quoting a crypto invoice. */
export const FALLBACK_PLAN_AMOUNT_MINOR = 900;
export const FALLBACK_PLAN_CURRENCY = "USD";
