"use client";

import { ArrowRight, Loader2 } from "lucide-react";
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
}: Props) {
  const wantsCoverLetter = outputs.includes("cover_letter");

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
        <p className="hint mt-2">
          {outputs.length === 2
            ? "The letter is written against the finished resume, so the two agree."
            : wantsCoverLetter
              ? "Written from your full profile, since no resume is being tailored alongside it."
              : "Resume only. Add the cover letter if this application asks for one."}
        </p>
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
