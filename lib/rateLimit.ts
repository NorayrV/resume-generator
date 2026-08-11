import { supabaseAdmin } from "./supabase/server";

/**
 * Per-user rate limiting, counted in the database.
 *
 * The check and the write have to happen together — two requests that read a
 * count and then write both pass — and serverless functions share no memory,
 * so the claim lives in Postgres. See supabase/007_rate_events.sql.
 *
 * `lib/importLimit.ts` predates this and keeps its own table. Both work; new
 * limits belong here rather than in a table of their own.
 */

/** Named limits, so the numbers are in one place rather than at call sites. */
export const LIMITS = {
  /**
   * Building a Word file or a PDF is the most CPU-hungry thing the server
   * does, and unlike a generation it costs no AI credit — so nothing stopped
   * a signed-in user looping it. Generous enough that nobody downloading both
   * formats a few times will notice.
   */
  download: { bucket: "download", limit: 40, windowSecs: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** Postgres and PostgREST spellings of "that relation does not exist". */
const MISSING = new Set(["42P01", "PGRST202", "PGRST205"]);

export interface RateResult {
  allowed: boolean;
  limit: number;
  /** Roughly when the caller can try again. Only set when refused. */
  retryAfterSecs?: number;
}

/**
 * Take one event off the named limit.
 *
 * Fails **open** when the table or function is missing, so deploying ahead of
 * the migration cannot take a feature down — that is the same trade made for
 * uploads, and it is safe here because the thing being limited costs CPU
 * rather than money. It fails **closed** on any other database error.
 */
export async function claimRateEvent(
  userId: string,
  name: LimitName,
): Promise<RateResult> {
  const { bucket, limit, windowSecs } = LIMITS[name];

  const { data, error } = await supabaseAdmin().rpc("claim_rate_event", {
    p_user_id: userId,
    p_bucket: bucket,
    p_limit: limit,
    p_window_secs: windowSecs,
  });

  if (error) {
    if (MISSING.has(error.code)) {
      console.warn(
        `[rateLimit] claim_rate_event is missing — "${bucket}" is NOT limited. Run supabase/007_rate_events.sql.`,
      );
      return { allowed: true, limit };
    }

    console.error("[rateLimit]", error);
    return { allowed: false, limit, retryAfterSecs: 60 };
  }

  return data === true
    ? { allowed: true, limit }
    : { allowed: false, limit, retryAfterSecs: windowSecs };
}

/** "in about 20 minutes" — for the message shown when someone is refused. */
export function describeWait(seconds: number | undefined): string {
  if (!seconds) return "shortly";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}
