import { getEntitlement } from "./billing";
import {
  FREE_GENERATIONS_PER_MONTH,
  PRO_GENERATIONS_PER_MONTH,
  USAGE_WINDOW_DAYS,
} from "./plan";
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

export { FREE_GENERATIONS_PER_MONTH, PRO_GENERATIONS_PER_MONTH } from "./plan";

/**
 * Which allowance a user is on.
 *
 * "comp" is the owner and anyone they have granted access to by hand. It is
 * the only genuinely uncapped tier, because admin.grant_unlimited() says
 * unlimited and should mean it.
 */
export type Tier = "free" | "pro" | "comp";

export interface UsageStatus {
  used: number;
  limit: number;
  /** Only ever true for a comped account. */
  unlimited: boolean;
  remaining: number;
  allowed: boolean;
  tier: Tier;
}

/** The tier and the number of packs it includes per window. */
export async function getAllowance(
  userId: string,
): Promise<{ tier: Tier; limit: number; unlimited: boolean }> {
  const entitlement = await getEntitlement(userId);
  const live =
    entitlement?.accessUntil !== null &&
    entitlement?.accessUntil !== undefined &&
    entitlement.accessUntil.getTime() > Date.now();

  if (!live) {
    return { tier: "free", limit: FREE_GENERATIONS_PER_MONTH, unlimited: false };
  }

  if (entitlement?.provider === "comp") {
    return { tier: "comp", limit: PRO_GENERATIONS_PER_MONTH, unlimited: true };
  }

  return { tier: "pro", limit: PRO_GENERATIONS_PER_MONTH, unlimited: false };
}

/** How much of this user's allowance is left. */
export async function getUsage(userId: string): Promise<UsageStatus> {
  const { tier, limit, unlimited } = await getAllowance(userId);

  if (unlimited) {
    return {
      used: 0,
      limit,
      unlimited: true,
      remaining: Number.POSITIVE_INFINITY,
      allowed: true,
      tier,
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

  // Fail closed on a counting error rather than handing out free packs.
  const used = error ? limit : (count ?? 0);
  const remaining = Math.max(0, limit - used);

  return { used, limit, unlimited: false, remaining, allowed: remaining > 0, tier };
}

/** Record one generation against the user's meter, with no limit check. */
export async function recordGeneration(userId: string): Promise<void> {
  await supabaseAdmin().from("generations").insert({ user_id: userId });
}

/** A slot taken before generating, to be released if generation fails. */
export type Claim =
  | { ok: true; id: number | null }
  | { ok: false; used: number; limit: number; tier: Tier };

/**
 * Take one generation off the meter *before* the AI calls run.
 *
 * Checking the count and writing the row have to happen together, or they
 * don't happen at all: the two DeepSeek calls sit between them and take half
 * a minute, and every request that started inside that window used to read the
 * same stale count and pass. Serverless functions share no memory, so the
 * database is the only place the two steps can be made atomic — see
 * supabase/005_claim_generation.sql.
 *
 * Paid users skip the check entirely; their generations are still recorded.
 */
export async function claimGeneration(userId: string): Promise<Claim> {
  const { tier, limit, unlimited } = await getAllowance(userId);

  // Only a comped account skips the meter. Paid accounts run through the
  // same atomic claim as free ones, with a larger number.
  if (unlimited) {
    await recordGeneration(userId);
    return { ok: true, id: null };
  }

  const { data, error } = await supabaseAdmin().rpc("claim_generation", {
    p_user_id: userId,
    p_limit: limit,
    p_window_days: USAGE_WINDOW_DAYS,
  });

  if (error) {
    /*
     * Fail closed. Handing out an uncounted AI call because the meter is
     * unreachable is the one outcome worth avoiding — it is exactly what an
     * attacker would try to induce.
     */
    console.error("[usage] claim_generation", error);
    return { ok: false, used: limit, limit, tier };
  }

  // NULL means the allowance is already used up.
  if (data === null || data === undefined) {
    const usage = await getUsage(userId);
    return { ok: false, used: usage.used, limit: usage.limit, tier };
  }

  return { ok: true, id: Number(data) };
}

/**
 * Hand a claimed slot back after a failed generation.
 *
 * Deletes by row id, so it can only ever remove the row this request created.
 * A failure here is logged and swallowed: the user already has an error, and
 * one over-counted generation is not worth a second one on top of it.
 */
export async function releaseGeneration(id: number | null): Promise<void> {
  if (id === null) return;

  const { error } = await supabaseAdmin().rpc("release_generation", {
    p_id: id,
  });

  if (error) console.error("[usage] release_generation", error);
}
