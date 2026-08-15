import Link from "next/link";
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
 * A server component, deliberately. It used to read the query string with
 * useSearchParams, which forced a Suspense boundary around it — and a Suspense
 * boundary meant the static HTML shipped a 304px grey skeleton where the only
 * call to action on the page belongs. Three things followed from that: an
 * 89px layout shift on a phone as the real 393px card replaced it, a page
 * whose CTA never appeared at all with JavaScript disabled, and a first paint
 * that showed a pulsing rectangle to anyone on a slow connection.
 *
 * Nothing was lost by dropping it. `next` was dead — middleware clears the
 * query string when it redirects here, so the parameter was never populated —
 * and the sign-in error is read from window.location after mount instead,
 * inside the client component that already needed to be one.
 */
export function SignInCard() {
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
        <SignInButtons />
      </div>

      {/*
        The positioning, at the moment it is spent. Everything else that
        answers "can I trust this with my history" — the accuracy section, the
        gaps card, the privacy answer — sits between 1,500 and 5,700px below
        this button, which is to say after the decision it is meant to inform.
      */}
      <p className="mt-6 flex gap-2 border-t border-line-soft pt-5 text-micro leading-relaxed text-faint">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span>
          Employers, titles and dates are copied from your profile, never
          written by the AI. Your profile is private to your account, and is
          only ever sent to the AI to write your own documents.
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
