"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-y rounded-md border border-line bg-paper p-3 text-body text-ink",
      "placeholder:text-faint",
      "transition-colors hover:border-faint",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
      "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
