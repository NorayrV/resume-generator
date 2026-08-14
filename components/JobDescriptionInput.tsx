"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ALL_LANGS, LANGUAGES, type Lang } from "@/lib/coverLetter";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/lib/plan";
import {
  ALL_OUTPUTS,
  OUTPUT_LABELS,
  type OutputKind,
} from "@/lib/outputs";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  busy: boolean;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  outputs: OutputKind[];
  onOutputsChange: (outputs: OutputKind[]) => void;
  /**
   * Whether this account may generate a cover letter.
   *
   * Presentation only. The server checks the same entitlement before it
   * touches the meter or the model — see lib/access.ts — so nothing here is
   * load-bearing for access, and editing it in devtools buys nothing. Its job
   * is to stop a free user pressing a button that was only ever going to
   * refuse them.
   *
   * Null while the account is still loading, so the control can hold its
   * shape instead of flickering between locked and unlocked.
   */
  canUseCoverLetter: boolean | null;
  /** Live price, for the upgrade line. Absent until the account loads. */
  planPrice?: string;
}

const MIN_CHARS = 120;

export function JobDescriptionInput({
  value,
  onChange,
  onGenerate,
  busy,
  lang,
  onLangChange,
  outputs,
  onOutputsChange,
  canUseCoverLetter,
  planPrice,
}: Props) {
  const wantsCoverLetter = outputs.includes("cover_letter");
  /* Treat "still loading" as unlocked, so the badge does not flash on for a
     subscriber every time the page opens. */
  const locked = canUseCoverLetter === false;

  /** Toggle a document, but never let the last one be turned off. */
  function toggleOutput(kind: OutputKind) {
    const next = outputs.includes(kind)
      ? outputs.filter((o) => o !== kind)
      : [...outputs, kind];

    if (next.length === 0) return;
    onOutputsChange(ALL_OUTPUTS.filter((o) => next.includes(o)));
  }

  const count = value.trim().length;
  const tooLong = count > MAX_JOB_DESCRIPTION_CHARS;
  // The server enforces both bounds; this only saves the round trip.
  const ready = count >= MIN_CHARS && !tooLong;

  return (
    <div className="space-y-4">
      <Textarea
        rows={11}
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Paste the job posting here.\n\nThe more of it you include \u2014 responsibilities, requirements, the company \u2014 the closer the tailoring gets."}
        aria-label="Job description"
        className="min-h-[13rem] leading-[1.7]"
      />

      {/* Producing a document nobody asked for is the bulk of a wasted
          generation, so this is an explicit choice. */}
      <fieldset disabled={busy} className="disabled:opacity-60">
        <legend className="label">What to generate</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_OUTPUTS.map((kind) => {
            const on = outputs.includes(kind);
            const only = on && outputs.length === 1;

            /*
             * The locked chip is a link to the upgrade page rather than a
             * dead control. Pressing it does something useful — it goes where
             * the feature is unlocked — instead of refusing silently, and it
             * carries the badge that says why.
             */
            if (kind === "cover_letter" && locked) {
              return (
                <Link
                  key={kind}
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-paper py-1.5 pl-3.5 pr-2 text-small font-medium text-muted transition-colors hover:border-accent-line hover:text-ink"
                >
                  <Lock className="h-3.5 w-3.5 text-faint" aria-hidden />
                  {OUTPUT_LABELS[kind]}
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-accent-text">
                    Pro
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={kind}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleOutput(kind)}
                title={only ? "Keep at least one" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-small font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line bg-paper text-muted hover:border-faint hover:text-ink"
                } ${only ? "cursor-default" : ""}`}
              >
                {OUTPUT_LABELS[kind]}
              </button>
            );
          })}
        </div>

        {locked ? (
          /*
           * Says what the feature is and what unlocks it, in that order.
           * Someone reading this has not been refused anything yet — they are
           * being told the shape of the product before they press anything.
           */
          <p className="hint mt-2">
            Tailored cover letters are included with Pro
            {planPrice ? ` (${planPrice} a month)` : ""}. Your resume is free,
            with no limit on how you edit or download it.{" "}
            <Link
              href="/account"
              className="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Upgrade to Pro
            </Link>
          </p>
        ) : (
          <p className="hint mt-2">
            {outputs.length === 2
              ? "The letter is written against the finished resume, so the two agree."
              : wantsCoverLetter
                ? "Written from your full profile, since no resume is being tailored alongside it."
                : "Resume only. Add the cover letter if this application asks for one."}
          </p>
        )}
      </fieldset>

      {/* Hidden rather than disabled when no letter is being written: a
          greyed-out control still asks to be read and reasoned about, and
          this one has nothing to say when there is no letter. */}
      {wantsCoverLetter && (
        <fieldset disabled={busy} className="disabled:opacity-60">
          <legend className="label">Cover letter language</legend>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {ALL_LANGS.map((option) => {
              const on = lang === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onLangChange(option)}
                  className={`rounded-full border px-3.5 py-1.5 text-small font-medium transition-colors ${
                    on
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line bg-paper text-muted hover:border-faint hover:text-ink"
                  }`}
                >
                  {LANGUAGES[option].label}
                </button>
              );
            })}
          </div>
          <p className="hint mt-2">
            Written in {LANGUAGES[lang].label}.
          </p>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Always says why the button is disabled, rather than leaving you guessing. */}
        <p
          className={`text-small tnum ${tooLong ? "text-flag" : "text-muted"}`}
        >
          {count === 0
            ? "Paste a posting to get started"
            : tooLong
              ? `${count.toLocaleString()} characters — ${(count - MAX_JOB_DESCRIPTION_CHARS).toLocaleString()} over the limit`
              : ready
                ? `${count.toLocaleString()} characters`
                : `${MIN_CHARS - count} more characters needed`}
        </p>

        <Button size="lg" onClick={onGenerate} disabled={busy || !ready}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Tailoring…
            </>
          ) : (
            <>
              Tailor my application
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
