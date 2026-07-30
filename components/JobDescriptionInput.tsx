"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ALL_LANGS, LANGUAGES, type Lang } from "@/lib/coverLetter";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  busy: boolean;
  langs: Lang[];
  onLangsChange: (langs: Lang[]) => void;
}

const MIN_CHARS = 120;

export function JobDescriptionInput({
  value,
  onChange,
  onGenerate,
  busy,
  langs,
  onLangsChange,
}: Props) {
  const count = value.trim().length;
  const ready = count >= MIN_CHARS;

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

      {/* Each extra language is a longer, costlier generation, so this is an
          explicit choice rather than a default of everything. */}
      <fieldset disabled={busy} className="disabled:opacity-60">
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
        <p className="text-small text-muted tnum">
          {count === 0
            ? "Paste a posting to get started"
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
