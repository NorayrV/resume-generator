import type { ExperienceEntry } from "./types";

/**
 * Re-attaches AI-written bullets to the real employment history.
 *
 * The model is asked for bullets, never for employers, titles or dates — those
 * come back only so each block can be identified. This function throws the
 * model's versions away and restores the stored ones, so a re-worded job title
 * or a quietly shifted date can never reach the document.
 *
 * The matching has to be identity-aware. Two roles at the same employer — a
 * promotion, say Data Analyst then Financial Analyst at the same company — are
 * distinct rows that happen to share a company name. Matching on the company
 * alone returned the same stored row for both, so the newer title was printed
 * twice and the earlier role vanished. Every match therefore *consumes* the
 * row it matched, and no row can be claimed by two blocks.
 */

const norm = (value: string | undefined | null): string =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Strips punctuation and common suffixes, so "Acme, Inc." matches "Acme Inc". */
const loose = (value: string | undefined | null): string =>
  norm(value)
    .replace(/[.,'"()]/g, "")
    .replace(/\b(inc|llc|ltd|limited|gmbh|corp|corporation|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface AnchorResult {
  experience: ExperienceEntry[];
  /**
   * Blocks the model returned that matched no stored role. Dropped rather than
   * printed: an employer that is not in the profile is, by definition, not part
   * of the candidate's history, and printing it would break the one promise
   * this product makes.
   */
  dropped: { company?: string; title?: string }[];
}

/**
 * @param written  what the model returned, in the order it chose
 * @param stored   the user's real history, newest first
 */
export function anchorExperience(
  written: Partial<ExperienceEntry>[],
  stored: ExperienceEntry[],
): AnchorResult {
  // Unclaimed stored roles. Splicing out a match is what stops two blocks
  // resolving to the same row.
  const pool = stored.map((role, index) => ({ role, index }));

  const claim = (
    predicate: (candidate: ExperienceEntry) => boolean,
  ): ExperienceEntry | undefined => {
    const at = pool.findIndex((entry) => predicate(entry.role));
    if (at === -1) return undefined;
    return pool.splice(at, 1)[0].role;
  };

  const experience: ExperienceEntry[] = [];
  const dropped: AnchorResult["dropped"] = [];

  /*
   * Two passes. The first takes only confident matches, so that a block which
   * names both its employer and its title cannot have its row stolen by a
   * weaker match on an earlier block. Positional guessing is left to the end,
   * once everything identifiable has been settled.
   */
  const pending: { block: Partial<ExperienceEntry>; slot: number }[] = [];

  for (const block of written) {
    const company = norm(block.company);
    const title = norm(block.title);
    const start = norm(block.start_date);

    const source =
      // Same employer and same title: unambiguous.
      claim((r) => norm(r.company) === company && norm(r.title) === title) ??
      // Same employer, same start date: the promotion case, where the model
      // reworded the title but kept the dates.
      claim((r) => norm(r.company) === company && norm(r.start_date) === start) ??
      // Same employer and title once punctuation and Inc/Ltd are ignored.
      claim((r) => loose(r.company) === loose(block.company) && loose(r.title) === loose(block.title));

    if (source) {
      experience.push({ ...source, bullets: block.bullets ?? [] });
    } else {
      // Hold the slot so the ordering the model chose survives.
      pending.push({ block, slot: experience.length });
      experience.push(null as unknown as ExperienceEntry);
    }
  }

  // Second pass: weaker matches, then position, for whatever is left.
  for (const { block, slot } of pending) {
    const company = norm(block.company);
    const title = norm(block.title);

    const source =
      claim((r) => norm(r.company) === company) ??
      claim((r) => loose(r.company) === loose(block.company)) ??
      claim((r) => norm(r.title) === title) ??
      claim((r) => loose(r.title) === loose(block.title)) ??
      /*
       * Last resort: the model returned no more blocks than the profile holds,
       * so an unmatched one is far likelier to be a reworded real role than an
       * invented employer. Take the next unclaimed row in stored order.
       */
      (written.length <= stored.length ? claim(() => true) : undefined);

    if (source) {
      experience[slot] = { ...source, bullets: block.bullets ?? [] };
    } else {
      dropped.push({ company: block.company, title: block.title });
    }
  }

  return { experience: experience.filter(Boolean), dropped };
}
