import { cn } from "@/lib/utils";

/**
 * A placeholder shaped like the thing that is loading.
 *
 * Used instead of a spinner wherever the final layout is known, so the page
 * does not jump when the data lands. Marked aria-hidden: the surrounding
 * region carries the live status text, and a screen reader reading out a row
 * of empty boxes helps nobody.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-line-soft", className)}
    />
  );
}
