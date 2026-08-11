"use client";

import { Loader2, Sparkles } from "lucide-react";
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
  langs: Lang[];
  onLangsChange: (langs: Lang[]) => void;
  outputs: OutputKind[];
  onOutputsChange: (outputs: OutputKind[]) => void;
}

const MIN_CHARS = 120;

export function JobDescriptionInput({
  value,
  onChange,
  onGenerate,
  busy,
  langs,
  onLangsChange,
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

  /** Toggle a language, but never let the last one be turned off. */
  function toggle(lang: Lang) {
    const next = langs.includes(lang)
      ? langs.filter((l) => l !== lang)
      : [...langs, lang];

    if (next.length === 0) return;
    onLangsChange(ALL_LANGS.filter((l) => next.includes(l)));
  }

  return (
    <div className="space-y-4">
      <Textarea
        rows={10}
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full posting here — title, company, responsibilities and requirements."
        aria-label="Job description"
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
                    ? "border-accent bg-accent text-white"
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
              : "No cover letter this time."}
        </p>
      </fieldset>

      {/* Each extra language is a longer, costlier generation, so this is an
          explicit choice rather than a default of everything. */}
      <fieldset
        disabled={busy || !wantsCoverLetter}
        className="disabled:opacity-60"
      >
        <legend className="label">Cover letter language</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_LANGS.map((lang) => {
            const on = langs.includes(lang);
            const only = on && langs.length === 1;
            return (
              <button
                key={lang}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(lang)}
                title={only ? "Keep at least one language" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-small font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-paper text-muted hover:border-faint hover:text-ink"
                } ${only ? "cursor-default" : ""}`}
              >
                {LANGUAGES[lang].label}
              </button>
            );
          })}
        </div>
        <p className="hint mt-2">
          {langs.length === 1
            ? "One version will be written."
            : `${langs.length} versions will be written — each one makes the generation longer.`}
        </p>
      </fieldset>

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
              Writing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
