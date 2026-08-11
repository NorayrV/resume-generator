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

export const OUTPUT_LABELS: Record<OutputKind, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
};

/**
 * Keep only recognised kinds, in a stable order.
 *
 * Falls back to both, which is what every generation did before this existed —
 * so an old client, or a request that forgets the field, behaves as it always
 * has rather than silently producing nothing.
 */
export function sanitiseOutputs(input: unknown): OutputKind[] {
  const wanted = Array.isArray(input) ? input : [];
  const picked = ALL_OUTPUTS.filter((kind) => wanted.includes(kind));
  return picked.length > 0 ? picked : [...ALL_OUTPUTS];
}
