import { FREE_GENERATIONS_PER_MONTH, USAGE_WINDOW_DAYS } from "./plan";
import { supabaseAdmin } from "./supabase/server";

/**
 * The free tier, and the meter behind it.
 *
 * Every completed generation writes a row to `generations`. The free limit is
 * counted over a rolling 30-day window rather than a calendar month, so nobody
 * gets a windfall by signing up on the 31st.
 *
 * Both the count and the write go through the service-role client: users have
 * no insert or delete policy on that table, so they cannot reset their own
 * meter to get unlimited free runs.
 */

export { FREE_GENERATIONS_PER_MONTH } from "./plan";

/** Stripe statuses that should unlock unlimited generations. */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface UsageStatus {
  used: number;
  limit: number;
  /** Unlimited when the user is on a paid plan. */
  unlimited: boolean;
  remaining: number;
  allowed: boolean;
}

/** True when the user has a live Stripe subscription. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.status) return false;
  if (!ACTIVE_STATUSES.has(data.status)) return false;

  // Guard against a webhook we never received: an elapsed period is not active.
  if (data.current_period_end) {
    const endsAt = new Date(data.current_period_end).getTime();
    // Small grace window so a renewal in flight does not lock the user out.
    if (Number.isFinite(endsAt) && endsAt + 24 * 60 * 60 * 1000 < Date.now()) {
      return false;
    }
  }

  return true;
}

/** How much of the free tier this user has left. */
export async function getUsage(userId: string): Promise<UsageStatus> {
  if (await hasActiveSubscription(userId)) {
    return {
      used: 0,
      limit: FREE_GENERATIONS_PER_MONTH,
      unlimited: true,
      remaining: Number.POSITIVE_INFINITY,
      allowed: true,
    };
  }

  const since = new Date(
    Date.now() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count, error } = await supabaseAdmin()
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  // Fail closed on a counting error rather than handing out free generations.
  const used = error ? FREE_GENERATIONS_PER_MONTH : (count ?? 0);
  const remaining = Math.max(0, FREE_GENERATIONS_PER_MONTH - used);

  return {
    used,
    limit: FREE_GENERATIONS_PER_MONTH,
    unlimited: false,
    remaining,
    allowed: remaining > 0,
  };
}

/** Record one generation against the user's meter. */
export async function recordGeneration(userId: string): Promise<void> {
  await supabaseAdmin().from("generations").insert({ user_id: userId });
}
