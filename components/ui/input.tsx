"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A plain bordered field — the shape people expect from a web form.
 *
 * 44px, not the 40 it was. Every button the product puts under a thumb is
 * already 44 — the option chips, the calls to action, the remove controls in
 * the profile — so the fields were both the one thing left under the
 * guideline and four pixels out of step with the controls they sit beside.
 * The profile form is 32 of these, met on a phone, before anything else in
 * the product works.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-md border border-line bg-paper px-3 text-body text-ink",
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
