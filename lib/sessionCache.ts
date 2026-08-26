/**
 * Page state that outlives a navigation, kept honest about whose it is.
 *
 * The generate page remembers the last result and the posting being worked on,
 * so that a trip to Profile or Account and back does not throw away a minute
 * of work. Both live in sessionStorage, which belongs to the browser tab —
 * not to the account.
 *
 * That distinction was the bug. Signing out cleared the Supabase session and
 * nothing else, so signing in as somebody else in the same tab restored the
 * previous person's generated resume: their name, their contact details, their
 * employment history, replayed from the tab rather than fetched for the new
 * user. Harmless on your own laptop, not harmless on a shared one.
 *
 * So every entry is stamped with the id of the user it was written for, and a
 * read that does not match is discarded rather than returned. Sign-out clears
 * these too, but the stamp is what actually protects: sign-out is one path
 * among several, and the ones that matter — an expired session, a closed
 * laptop, a second tab — never run it.
 *
 * Values here are conveniences. Losing one costs a retype; returning the wrong
 * one costs somebody their privacy, so every failure discards.
 */

/** The last generation, so leaving the page and coming back keeps it. */
export const CACHE_KEY = "last-generation";

/** The posting being worked on, so it survives a trip to upgrade. */
export const DRAFT_KEY = "job-description-draft";

/** Everything written per-user. Cleared together. */
const OWNED_KEYS = [CACHE_KEY, DRAFT_KEY] as const;

interface Owned {
  /** The user this was written for. */
  owner: string;
  value: unknown;
}

/**
 * Read an entry back, but only for the user it was written for.
 *
 * Anything else — a different user, an entry written before this file existed,
 * a corrupt value — is removed and reported as absent. Removing rather than
 * ignoring matters: an entry that cannot be read by anyone should not sit in
 * the tab waiting for a future bug to hand it out.
 */
export function readOwned<T>(key: string, owner: string | null): T | null {
  if (!owner) return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Owned>;
    if (typeof parsed?.owner !== "string" || parsed.owner !== owner) {
      sessionStorage.removeItem(key);
      return null;
    }

    return (parsed.value ?? null) as T | null;
  } catch {
    // Private browsing, a quota error, or an unparseable value. Start clean.
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* nothing further to try */
    }
    return null;
  }
}

/** Write an entry against its owner. A missing owner writes nothing. */
export function writeOwned(key: string, owner: string | null, value: unknown) {
  if (!owner) return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ owner, value } satisfies Owned));
  } catch {
    // Over quota or blocked. The value is already on screen; it just will not
    // survive a navigation.
  }
}

/** Forget one entry — used when the thing it remembers is emptied. */
export function forgetOwned(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/**
 * Drop everything held for the signed-in user.
 *
 * Called on the way out, before the session goes, so the next person to use
 * this tab starts from nothing.
 */
export function clearOwned() {
  for (const key of OWNED_KEYS) forgetOwned(key);
}
