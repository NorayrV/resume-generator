"use client";

import { Check, Info, X } from "lucide-react";
import type { OutputKind } from "@/lib/outputs";

/**
 * The readout above the documents: how much of this posting your profile
 * actually answers.
 *
 * The figure is arithmetic, not an opinion. The model returns two lists —
 * requirements from the posting that are evidenced in the resume, and ones
 * that are not — and the percentage is simply the first as a share of both.
 * That is why the exact counts sit next to it: a reader can check the sum.
 *
 * Deliberately NOT called a match score, and deliberately not presented as a
 * prediction. It says nothing about whether anyone will call you back, and
 * the note under it says so, because a number that quietly implies otherwise
 * is the kind of thing that sells a subscription and loses a user.
 */

interface Props {
  matchedKeywords: string[];
  gaps: string[];
  outputs: OutputKind[];
}

/** Below this, the gaps deserve more emphasis than the coverage. */
const WEAK = 60;

export function ResultsOverview({ matchedKeywords, gaps, outputs }: Props) {
  const matched = matchedKeywords.length;
  const missing = gaps.length;
  const total = matched + missing;

  // Nothing to divide. A posting this vague gives the model nothing to
  // extract, and inventing a number for it would be worse than saying so.
  if (total === 0) return null;

  const pct = Math.round((matched / total) * 100);
  const weak = pct < WEAK;

  return (
    <section className="card-raised overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:gap-8">
        {/* ---- The figure ---- */}
        <div className="md:w-52">
          <p className="text-small font-medium text-muted">
            Requirements covered
          </p>

          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[2.5rem] font-semibold leading-none tracking-[-0.03em] tnum">
              {pct}%
            </span>
            <span className="text-small text-muted tnum">
              {matched} of {total}
            </span>
          </p>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft"
            role="img"
            aria-label={`${matched} of ${total} requirements covered`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                weak ? "bg-flag" : "bg-good"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-3 text-micro leading-relaxed text-faint">
            Requirements from this posting that your resume evidences. Not a
            prediction of whether you will be called.
          </p>
        </div>

        {/* ---- The two lists ---- */}
        <div className="grid gap-5 border-t border-line-soft pt-5 sm:grid-cols-2 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div>
            <p className="flex items-center gap-1.5 text-small font-medium">
              <Check className="h-3.5 w-3.5 text-good" aria-hidden />
              Matched
              <span className="font-normal text-faint tnum">({matched})</span>
            </p>

            {matched > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {matchedKeywords.map((word) => (
                  <span
                    key={word}
                    className="rounded border border-good/20 bg-good-soft px-1.5 py-0.5 text-micro text-good"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="hint mt-2.5">
                Nothing from this posting matched your profile.
              </p>
            )}
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-small font-medium">
              <X className="h-3.5 w-3.5 text-flag" aria-hidden />
              Not covered
              <span className="font-normal text-faint tnum">({missing})</span>
            </p>

            {missing > 0 ? (
              <>
                <ul className="mt-2.5 space-y-1">
                  {gaps.map((gap) => (
                    <li key={gap} className="flex gap-2 text-small text-muted">
                      <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-flag" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-micro text-faint">
                  Left off the resume rather than papered over. Worth a sentence
                  in the interview.
                </p>
              </>
            ) : (
              <p className="hint mt-2.5">
                Your profile covers everything the posting asked for.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* What was produced, so the header states it rather than implying it. */}
      <p className="flex items-start gap-2 border-t border-line-soft bg-surface px-5 py-3 text-micro text-muted sm:px-6">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
        <span>
          {outputs.includes("resume") && outputs.includes("cover_letter")
            ? "Resume and cover letter below. Read both before you send them."
            : outputs.includes("cover_letter")
              ? "Cover letter below. Read it before you send it."
              : "Resume below. Read it before you send it."}
        </span>
      </p>
    </section>
  );
}
