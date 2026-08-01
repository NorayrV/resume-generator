"use client";

import { useSearchParams } from "next/navigation";
import { SignInButtons } from "./SignInButtons";
import { FREE_GENERATIONS_PER_MONTH } from "@/lib/plan";

/**
 * The sign-in panel on the landing page.
 *
 * Client-side because it reads `next` and `error` off the query string, which
 * is how the auth callback reports a failed sign-in.
 */
export function SignInCard() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const failed = params.get("error");

  return (
    <div className="card p-6 shadow-sm">
      <h2 className="text-body font-semibold tracking-[-0.01em]">
        Start for free
      </h2>
      <p className="hint mt-1">
        {FREE_GENERATIONS_PER_MONTH} generations a month, no card needed.
      </p>

      <div className="mt-5">
        <SignInButtons next={next} initialError={failed} />
      </div>

      <p className="mt-5 text-[0.75rem] leading-relaxed text-faint">
        Your profile is private to your account, and is only ever sent to the AI
        to write your own documents.
      </p>
    </div>
  );
}
