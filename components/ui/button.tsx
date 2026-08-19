"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap",
  {
    variants: {
      variant: {
        /*
         * The disabled state steps out of the shared opacity rather than
         * fading with it. At 45% the white label over a washed-out blue
         * measured 2.22:1, and this is the one button that ships disabled by
         * default — on the generate page it holds the only sentence saying
         * what the page does while the posting box is still empty. Grey on
         * grey reads as "not yet" just as clearly and stays legible at 6.1:1.
         */
        primary:
          "bg-accent text-on-accent shadow-sm hover:bg-accent/90 disabled:opacity-100 disabled:bg-line-soft disabled:text-muted disabled:shadow-none",
        secondary:
          "border border-line bg-paper text-ink hover:border-faint hover:bg-surface",
        ghost: "text-muted hover:bg-surface hover:text-ink",
        danger: "border border-line bg-paper text-flag hover:bg-flag-soft",
      },
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-9 px-4 text-small",
        lg: "h-11 px-6 text-body",
        /* Hero and end-of-page calls to action only. */
        xl: "h-12 px-7 text-[1rem]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
