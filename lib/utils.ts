import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  return `${a} \u2013 ${b}`;
}

export function pluralize(n: number, word: string, plural?: string) {
  return `${n} ${n === 1 ? word : plural ?? `${word}s`}`;
}
