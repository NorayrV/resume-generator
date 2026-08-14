"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { OutputKind } from "@/lib/outputs";

/**
 * What is happening during the half-minute the generator takes.
 *
 * The stages are real and happen in this order on the server: the posting and
 * the profile go into one call that writes the resume, and the cover letter
 * is a second call made afterwards so it can be written against the finished
 * resume. What is estimated is the *timing* — the API returns once, at the
 * end, with no progress events to subscribe to.
 *
 * So the rule here is: never claim a stage finished early. The clock advances
 * the highlight, but the final stage stays lit until the response actually
 * lands, however long that takes, and after the estimate is spent the note
 * underneath says plainly that it is running long rather than pretending the
 * bar is nearly full.
 */

interface Props {
  outputs: OutputKind[];
}

/** Rough seconds each stage takes, measured against the live API. */
const STAGES: { label: string; secs: number; needs?: OutputKind }[] = [
  { label: "Reading the job description", secs: 4 },
  { label: "Matching it against your experience", secs: 7 },
  { label: "Writing your resume", secs: 16, needs: "resume" },
  { label: "Writing your cover letter", secs: 12, needs: "cover_letter" },
];

export function GenerationProgress({ outputs }: Props) {
  const stages = STAGES.filter((s) => !s.needs || outputs.includes(s.needs));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(
      () => setElapsed((Date.now() - started) / 1000),
      500,
    );
    return () => clearInterval(id);
  }, []);

  /* Which stage the clock says we are on, capped at the last one. */
  let active = 0;
  let spent = 0;
  for (let i = 0; i < stages.length; i++) {
    spent += stages[i].secs;
    if (elapsed < spent) {
      active = i;
      break;
    }
    active = stages.length - 1;
  }

  const total = stages.reduce((n, s) => n + s.secs, 0);
  const overrunning = elapsed > total;

  return (
    <section
      className="card p-5 sm:p-6"
      role="status"
      aria-live="polite"
      aria-label="Generating your application"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-medium">Tailoring your application</p>
        <span className="text-small text-faint tnum">
          {Math.floor(elapsed)}s
        </span>
      </div>

      {/* Indeterminate on purpose — there is no real percentage to report. */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full w-1/3 animate-sweep rounded-full bg-accent"
          aria-hidden
        />
      </div>

      <ol className="mt-5 space-y-2.5">
        {stages.map((stage, i) => {
          const done = i < active;
          const current = i === active;

          return (
            <li
              key={stage.label}
              className={`flex items-center gap-2.5 text-small transition-colors ${
                current
                  ? "font-medium text-ink"
                  : done
                    ? "text-muted"
                    : "text-faint"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-3.5 w-3.5 text-good" aria-hidden />
                ) : current ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-accent-text"
                    aria-hidden
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                )}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ol>

      <p className="hint mt-5 border-t border-line-soft pt-4">
        {overrunning
          ? "Taking longer than usual — long postings can push this past a minute. Still working."
          : "Usually takes under a minute. You can leave this tab open."}
      </p>
    </section>
  );
}
