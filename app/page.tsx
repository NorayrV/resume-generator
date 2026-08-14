"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, RotateCcw } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JobDescriptionInput } from "@/components/JobDescriptionInput";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ResultsOverview } from "@/components/ResultsOverview";
import { ResumeResult } from "@/components/ResumeResult";
import { CoverLetter } from "@/components/CoverLetter";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitiseLang, type Lang } from "@/lib/coverLetter";
import { DEFAULT_OUTPUTS, type OutputKind } from "@/lib/outputs";
import { PRO_GENERATIONS_PER_MONTH, type PlanPricing } from "@/lib/plan";
import type {
  CoverLetterVersions,
  PersonalInformation,
  ProfileSummary,
  TailoredResume,
} from "@/lib/types";

interface Generation {
  /** Absent on a cover-letter-only run. */
  resume: TailoredResume | null;
  cover_letter: CoverLetterVersions | null;
  /** Posting's own language first, so the UI can open on it. */
  cover_letter_order?: Lang[];
  matched_keywords: string[];
  gaps: string[];
  /** Roles whose bullets the model wrote, because none were supplied. */
  drafted_roles?: string[];
  person: PersonalInformation;
  /** What was asked for, so the summary line can name it after a reload. */
  requested?: OutputKind[];
}

/** Kept so a trip to Profile and back does not throw away a generation. */
const CACHE_KEY = "last-generation";

/**
 * Remembered cover letter language.
 *
 * The key keeps its plural name on purpose: it used to hold an array, and
 * sanitiseLang() reads that shape too, so an existing choice survives the
 * move to a single language instead of silently resetting to English.
 */
const LANGS_KEY = "cover-letter-langs";

export default function GeneratePage() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [jobDescription, setJobDescription] = useState("");
  const [lang, setLang] = useState<Lang>("english");
  /*
   * Deliberately not remembered. Every visit starts on the resume alone, so
   * turning the cover letter on is a decision made per application rather
   * than once, months ago, and then silently repeated on every generation.
   * The language beside it does persist — that is a preference, not a choice
   * about what this particular application needs.
   */
  const [outputs, setOutputs] = useState<OutputKind[]>(DEFAULT_OUTPUTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [plan, setPlan] = useState<PlanPricing | null>(null);
  const [result, setResult] = useState<Generation | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data.summary))
      .catch(() => setProfile({ exists: false }))
      .finally(() => setLoading(false));

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) setResult(JSON.parse(cached));
    } catch {
      // A corrupt cache is not worth surfacing — just start clean.
    }

    try {
      const saved = localStorage.getItem(LANGS_KEY);
      if (saved) setLang(sanitiseLang(JSON.parse(saved)));
    } catch {
      // Fall back to the English default.
    }
  }, []);

  /** Remember the language choice, so it does not reset on every visit. */
  function changeLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem(LANGS_KEY, JSON.stringify(next));
    } catch {
      // Private browsing — the choice just will not persist.
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setQuotaExceeded(false);
    setResult(null);
    sessionStorage.removeItem(CACHE_KEY);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, language: lang, outputs }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 402 means the free tier is spent — point at the upgrade rather than
        // leaving a dead-end error message.
        setQuotaExceeded(data.code === "quota_exceeded");
        setPlan(data.plan ?? null);
        setError(data.error ?? "Generation failed.");
        return;
      }

      setQuotaExceeded(false);

      const generation: Generation = { ...data, requested: outputs };
      setResult(generation);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(generation));
      } catch {
        // Over quota is harmless: the result is already on screen.
      }

      requestAnimationFrame(() =>
        document
          .getElementById("output")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setError(
        "The request did not come back. Long postings can take up to a minute — try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const hasProfile = Boolean(profile?.exists);

  return (
    <>
      <AppHeader subtitle={hasProfile ? profile?.full_name : undefined} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : !hasProfile ? (
          <FirstRun />
        ) : (
          <div className="space-y-6">
            {/* ---- Step 1: the posting ---- */}
            <section className="card p-5 sm:p-6">
              <h1 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                Paste a job posting
              </h1>
              <p className="hint mt-1">
                Everything is tailored against this text and nothing else.
                Include the responsibilities and requirements.
              </p>

              <div className="mt-5">
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                  onGenerate={generate}
                  busy={busy}
                  lang={lang}
                  onLangChange={changeLang}
                  outputs={outputs}
                  onOutputsChange={setOutputs}
                />
              </div>
            </section>

            {error &&
              (quotaExceeded ? (
                <div className="card flex flex-wrap items-center justify-between gap-4 border-accent-line bg-accent-soft p-5">
                  <div>
                    <p className="text-body font-medium">{error}</p>
                    <p className="hint mt-0.5">
                      {PRO_GENERATIONS_PER_MONTH} applications a month
                      {plan ? ` for ${plan.price}/${plan.period}` : ""}.
                    </p>
                  </div>
                  <Link
                    href="/account"
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-accent px-5 text-small font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
                  >
                    See plans
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              ) : (
                <Alert tone="error">{error}</Alert>
              ))}

            {busy && <GenerationProgress outputs={outputs} />}

            {/* ---- Step 2: whichever documents were asked for ---- */}
            {result &&
              (() => {
                const hasResume = Boolean(result.resume);
                const hasLetter = Object.values(result.cover_letter ?? {}).some(
                  (v) => v?.trim(),
                );

                // One document gets the full width rather than half of it.
                const twoUp = hasResume && hasLetter;

                const produced: OutputKind[] =
                  result.requested ??
                  ([
                    hasResume ? "resume" : null,
                    hasLetter ? "cover_letter" : null,
                  ].filter(Boolean) as OutputKind[]);

                return (
                  <div id="output" className="animate-rise space-y-4">
                    <ResultsOverview
                      matchedKeywords={result.matched_keywords}
                      gaps={result.gaps}
                      outputs={produced}
                    />

                    <div
                      className={`grid gap-4 ${twoUp ? "lg:grid-cols-2" : ""}`}
                    >
                      {result.resume && (
                        <ResumeResult
                          resume={result.resume}
                          person={result.person}
                          draftedRoles={result.drafted_roles ?? []}
                        />
                      )}

                      {hasLetter && result.cover_letter && (
                        <CoverLetter
                          letters={result.cover_letter}
                          order={result.cover_letter_order}
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <Button
                        variant="secondary"
                        onClick={generate}
                        disabled={busy}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        Generate again
                      </Button>
                      <p className="text-small text-faint">
                        Uses another application from your allowance.
                      </p>
                    </div>
                  </div>
                );
              })()}

            {/* A quiet placeholder only when there is nothing on screen yet. */}
            {!result && !busy && (
              <div className="rounded-lg border border-dashed border-line py-12 text-center">
                <FileText
                  className="mx-auto h-5 w-5 text-faint"
                  aria-hidden
                />
                <p className="mt-2.5 text-small font-medium text-muted">
                  Your application will appear here
                </p>
                <p className="hint mx-auto mt-1 max-w-xs">
                  Resume, matched keywords, and the requirements your profile
                  does not cover.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * What a brand-new account sees.
 *
 * There is exactly one thing to do, so the screen says what will happen after
 * it rather than showing an empty generator the user cannot yet use.
 */
function FirstRun() {
  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
        Set up your profile first
      </h1>
      <p className="lead mx-auto mt-3 max-w-sm text-small">
        Gatecrash rewrites your own experience for each job, so it needs your
        history once. Upload an existing resume and the fields fill themselves.
      </p>

      <Link
        href="/profile"
        className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-6 text-body font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
      >
        Set up profile
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>

      <ol className="mx-auto mt-10 max-w-sm space-y-3 text-left">
        {[
          "Upload your resume, or type your history in",
          "Paste a job posting",
          "Download a resume written for that job",
        ].map((line, i) => (
          <li key={line} className="flex items-center gap-3 text-small">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-semibold tnum ${
                i === 0
                  ? "bg-accent text-on-accent"
                  : "border border-line text-faint"
              }`}
            >
              {i + 1}
            </span>
            <span className={i === 0 ? "font-medium text-ink" : "text-muted"}>
              {line}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
