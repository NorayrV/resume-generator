"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { SignInButtons } from "./SignInButtons";
import { FREE_GENERATIONS_PER_MONTH, USAGE_WINDOW_DAYS } from "@/lib/plan";

/**
 * The landing page's one call to action.
 *
 * Raised rather than flat: it is the single thing on the page that should be
 * found without looking, and the only element using shadow-card above the
 * fold.
 *
 * Client-side because it reads `next` and `error` off the query string, which
 * is how the auth callback reports a failed sign-in.
 */
export function SignInCard() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const failed = params.get("error");

  return (
    <div className="card-raised p-6 sm:p-7">
      <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
        Start free
      </h2>
      <p className="hint mt-1">
        {FREE_GENERATIONS_PER_MONTH} applications every {USAGE_WINDOW_DAYS}{" "}
        days. No card, no trial timer.
      </p>

      <div className="mt-6">
        <SignInButtons next={next} initialError={failed} />
      </div>

      <p className="mt-6 flex gap-2 border-t border-line-soft pt-5 text-micro leading-relaxed text-faint">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span>
          Your profile is private to your account, and is only ever sent to the
          AI to write your own documents.
        </span>
      </p>

      <p className="mt-3 text-micro leading-relaxed text-faint">
        By continuing you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-ink"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
