import { supabaseAdmin } from "./supabase/server";

/**
 * Caps how often one user can upload a resume.
 *
 * Every upload costs a DeepSeek call, and unlike a generation it is not
 * covered by the free-tier meter — a signed-in user could otherwise upload in
 * a loop and spend the deployment's API budget.
 *
 * The limit is deliberately generous. Uploading, spotting a bad date, fixing
 * the file and re-uploading is normal behaviour and should never hit it; only
 * scripted abuse should.
 */

/** Uploads allowed per user, per rolling window. */
export const IMPORTS_PER_WINDOW = 10;

/** The window those uploads are counted over. */
export const IMPORT_WINDOW_HOURS = 24;

const WINDOW_MS = IMPORT_WINDOW_HOURS * 60 * 60 * 1000;

export interface ImportLimitStatus {
  allowed: boolean;
  used: number;
  limit: number;
  /** When the user drops back under the limit. Only set when blocked. */
  retryAt?: Date;
}

/**
 * "That table does not exist", in the two dialects it arrives in.
 *
 * PGRST205 is what actually comes back through Supabase: PostgREST answers
 * from its own schema cache and never reaches Postgres, so the native 42P01 is
 * not what you get. Both are matched because a direct connection would raise
 * the latter, and being wrong here fails closed and breaks every upload.
 *
 * Deploying this code before running supabase/003_resume_imports.sql would
 * otherwise take the feature down. A missing table means "no limit configured"
 * and the request is allowed — exactly the behaviour before this file existed,
 * so it is not a regression, and it turns an outage into a logged warning.
 */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

/** How close to the limit this user is. */
export async function checkImportLimit(
  userId: string,
): Promise<ImportLimitStatus> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  /*
   * Newest first, capped at the limit. If that many rows come back the user is
   * blocked, and the last one is the oldest upload still counting against
   * them — so it is the one whose expiry frees a slot.
   */
  const { data, error } = await supabaseAdmin()
    .from("resume_imports")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(IMPORTS_PER_WINDOW);

  if (error) {
    if (MISSING_TABLE_CODES.has(error.code)) {
      console.warn(
        "[importLimit] resume_imports table is missing — uploads are NOT rate limited. Run supabase/003_resume_imports.sql.",
      );
      return { allowed: true, used: 0, limit: IMPORTS_PER_WINDOW };
    }

    // Any other failure fails closed. An upload is not urgent enough to hand
    // out an uncounted AI call over a database error.
    console.error("[importLimit]", error);
    return {
      allowed: false,
      used: IMPORTS_PER_WINDOW,
      limit: IMPORTS_PER_WINDOW,
    };
  }

  const rows = data ?? [];
  const used = rows.length;

  if (used < IMPORTS_PER_WINDOW) {
    return { allowed: true, used, limit: IMPORTS_PER_WINDOW };
  }

  const oldestCounted = rows[rows.length - 1]?.created_at;

  return {
    allowed: false,
    used,
    limit: IMPORTS_PER_WINDOW,
    retryAt: oldestCounted
      ? new Date(new Date(oldestCounted).getTime() + WINDOW_MS)
      : new Date(Date.now() + WINDOW_MS),
  };
}

/** Record one upload against the user's limit. */
export async function recordImport(userId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("resume_imports")
    .insert({ user_id: userId });

  if (error && !MISSING_TABLE_CODES.has(error.code)) {
    console.error("[importLimit] record", error);
  }
}

/** "in about 3 hours" — for the message shown when someone is blocked. */
export function describeRetry(retryAt: Date | undefined): string {
  if (!retryAt) return "later today";

  const minutes = Math.max(1, Math.round((retryAt.getTime() - Date.now()) / 60_000));

  if (minutes < 60) {
    return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.round(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}
