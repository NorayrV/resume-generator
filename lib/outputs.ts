/**
 * Which documents a single generation should produce.
 *
 * Plenty of applications only need one of the two — a cover letter for a
 * posting you already have a good resume for, or a resume for a form that
 * never asks for a letter. Producing both regardless spent output tokens on
 * something the user then ignored, and output is the overwhelming majority of
 * what a generation costs.
 *
 * No imports in this file: the generate page needs the labels in the browser,
 * and it must never pull the AI client into the client bundle.
 */

export type OutputKind = "resume" | "cover_letter";

export const ALL_OUTPUTS: OutputKind[] = ["resume", "cover_letter"];

/**
 * What a generation produces when nobody has said otherwise.
 *
 * The resume alone. A cover letter is opt-in: many applications never ask for
 * one, and it is half the output tokens of a full run, so producing it by
 * default spent a pack's worth of writing on something most people discarded.
 */
export const DEFAULT_OUTPUTS: OutputKind[] = ["resume"];

export const OUTPUT_LABELS: Record<OutputKind, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
};

/**
 * Keep only recognised kinds, in a stable order.
 *
 * Falls back to the default rather than to both. A request that omits the
 * field should not quietly buy a cover letter nobody asked for — the previous
 * fallback did exactly that, which is the wrong way round now the letter is
 * opt-in.
 */
export function sanitiseOutputs(input: unknown): OutputKind[] {
  const wanted = Array.isArray(input) ? input : [];
  const picked = ALL_OUTPUTS.filter((kind) => wanted.includes(kind));
  return picked.length > 0 ? picked : [...DEFAULT_OUTPUTS];
}
