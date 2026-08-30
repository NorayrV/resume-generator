/**
 * Plan limits, in a file with no imports.
 *
 * Client components need these numbers too, so they must not live next to the
 * service-role Supabase client or the payment clients — importing either into
 * the browser bundle would be a serious mistake.
 */

/**
 * One generation is one **application** in everything the user reads: a job
 * description analysed, a resume tailored to it, a cover letter, the keyword
 * and gap report, and the exports. The code keeps saying "generation" because
 * that is what the `generations` table counts, and renaming a live table buys
 * nothing.
 *
 * "Pack" was the earlier word for the same unit and is gone from the UI: the
 * pricing section used it in three headings while the cards beside them
 * counted "applications", which left one product with two names for its only
 * billable thing.
 *
 * Editing, re-downloading and re-reading an old application cost nothing.
 */

/** Applications included free, per rolling 30 days. */
export const FREE_GENERATIONS_PER_MONTH = 3;

/**
 * Applications included with a paid plan, per rolling 30 days.
 *
 * Not advertised as unlimited, deliberately. A hundred is far more
 * than a real job search consumes — a month of applying to three roles a
 * day would not reach it — while still being a number, which keeps the
 * plan honest and makes reselling access pointless.
 *
 * It is not a cost control. Measured on the live model, one costs about
 * $0.00035, so honouring all hundred of them costs three and a half cents.
 */
export const PRO_GENERATIONS_PER_MONTH = 100;

/** Rolling window both allowances are counted over. */
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
  /**
   * Formatted for display, e.g. "$9" — or "about $9" when this is the
   * fallback. The hedge is inside the string on purpose: the figure is shown
   * in five places and only one of them had room for a footnote.
   */
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
 *
 * The word "about" is the whole point of this constant.
 *
 * It used to read "$12.99" — the same figure Polar returns — which meant a
 * failed price lookup was invisible. The page showed the correct-looking
 * number, the only tell was one line of grey text under the pricing cards,
 * and the four other places that show the price had no tell at all. If the
 * Polar price ever changed while the lookup was failing, the site would
 * quietly quote the old one next to a checkout button.
 *
 * Hedging the string rather than the components means every place that prints
 * a price inherits it: the pricing cards, the account page, both upgrade
 * prompts and the sign-in card. It also means a failure is legible from
 * outside — "about" appears in the HTML, so it can be checked without a
 * session and without reading logs.
 *
 * Keep the figure accurate anyway. "About $12.99" when the real price is $30
 * is still a lie, just a hedged one.
 */
export const FALLBACK_PLAN_PRICE = "about $12.99";
export const FALLBACK_PLAN_PERIOD = "month";

/** Same figure in minor units, for quoting a crypto invoice. */
export const FALLBACK_PLAN_AMOUNT_MINOR = 1299;
export const FALLBACK_PLAN_CURRENCY = "USD";
