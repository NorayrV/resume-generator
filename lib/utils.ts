import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught about this project's custom scales.
 *
 * It resolves conflicts by class group, and it works out the group from the
 * class name. `text-*` is ambiguous — it can set a font size or a colour —
 * so it matches the name against Tailwind's stock scales. Ours are not in
 * them, and an unrecognised `text-on-accent` was being filed as a font size:
 * the Button's `text-on-accent` and `text-small` looked like the same
 * property, the later one won, and the primary button silently lost its
 * label colour and inherited --ink instead.
 *
 * Declaring both groups explicitly is the fix. Any colour or size added to
 * tailwind.config.ts should be added here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["body", "small", "micro"] }],
      "text-color": [
        {
          text: [
            "paper",
            "surface",
            "ink",
            "muted",
            "faint",
            "placeholder",
            "on-accent",
            "accent",
            "accent-text",
            "accent-soft",
            "accent-line",
            "line",
            "line-soft",
            "flag",
            "flag-soft",
            "good",
            "good-soft",
            "doc-paper",
            "doc-ink",
            "doc-muted",
            "doc-line",
            "doc-accent",
          ],
        },
      ],
    },
  },
});

/** Merge Tailwind classes without fighting over specificity. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Mar 2024" style label, tolerant of whatever the AI hands back. */
export function formatDateRange(start?: string, end?: string) {
  const a = (start || "").trim();
  const b = (end || "").trim();
  if (!a && !b) return "";
  if (!b) return a;
  if (!a) return b;
  return `${a} – ${b}`;
}

export function pluralize(n: number, word: string, plural?: string) {
  return `${n} ${n === 1 ? word : plural ?? `${word}s`}`;
}
