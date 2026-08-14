"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A plain bordered field — the shape people expect from a web form. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-line bg-paper px-3 text-body text-ink",
      "placeholder:text-placeholder",
      "transition-colors hover:border-faint",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
      "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
