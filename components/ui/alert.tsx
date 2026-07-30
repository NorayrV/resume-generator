import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "error" | "info";

/** A soft filled panel. Errors say what happened and what to do next. */
export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2.5 text-small leading-relaxed",
        tone === "error"
          ? "border-flag/25 bg-flag-soft text-flag"
          : "border-line bg-surface text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
