import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A small status label.
 *
 * Four tones, each with one job: `neutral` for a plain fact, `accent` for the
 * current plan or an active state, `good` for a requirement that is covered,
 * `flag` for one that is not. Nothing here is a button — if it can be clicked,
 * it should be a Button instead.
 */

type Tone = "neutral" | "accent" | "good" | "flag";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-surface text-muted",
  accent: "border-accent-line bg-accent-soft text-accent",
  good: "border-good/20 bg-good-soft text-good",
  flag: "border-flag/20 bg-flag-soft text-flag",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
