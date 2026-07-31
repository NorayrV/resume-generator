"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JobDescriptionInput } from "@/components/JobDescriptionInput";
import { ResumeResult } from "@/components/ResumeResult";
import { CoverLetter } from "@/components/CoverLetter";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { sanitiseLangs, type Lang } from "@/lib/coverLetter";
import { PLAN_PERIOD_DISPLAY, PLAN_PRICE_DISPLAY } from "@/lib/plan";
import type {
  CoverLetterVersions,
  PersonalInformation,
  ProfileSummary,
  TailoredResume,
} from "@/lib/types";

interface Generation {
  resume: TailoredResume;
  cover_letter: CoverLetterVersions;
  /** Posting's own language first, so the UI can open on it. */
  cover_letter_order?: Lang[];
  matched_keywords: string[];
  gaps: string[];
  person: PersonalInformation;
}

/** Kept so a trip to Profile and back does not throw away a generation. */
const CACHE_KEY = "last-generation";

/** Remembered cover letter language choice. */
const LANGS_KEY = "cover-letter-langs";

export default function GeneratePage() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [jobDescription, setJobDescription] = useState("");
  // Defaults to English alone: extra languages cost extra output tokens, so
  // they are opted into rather than out of.
  const [langs, setLangs] = useState<Lang[]>(["english"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
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
      if (saved) setLangs(sanitiseLangs(JSON.parse(saved)));
    } catch {
      // Fall back to the English default.
    }
  }, []);

  /** Remember the language choice, so it does not reset on every visit. */
  function changeLangs(next: Lang[]) {
    setLangs(next);
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
        body: JSON.stringify({ jobDescription, languages: langs }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 402 means the free tier is spent — point at the upgrade rather than
        // leaving a dead-end error message.
        setQuotaExceeded(data.code === "quota_exceeded");
        setError(data.error ?? "Generation failed.");
        return;
      }

      setQuotaExceeded(false);

      setResult(data);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
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
          <div className="card h-64 animate-pulse" />
        ) : !hasProfile ? (
          /* Nothing to tailor from yet — one instruction, one button. */
          <div className="card mx-auto max-w-lg p-8 text-center">
            <h1 className="text-lg font-semibold tracking-[-0.01em]">
              Add your details first
            </h1>
            <p className="hint mx-auto mt-2 max-w-sm">
              The generator rewrites your own experience for each job. Fill in
              your profile once, then reuse it for every application.
            </p>
            <Link
              href="/profile"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-6 text-body font-medium text-white transition-colors hover:bg-accent/90"
            >
              Set up profile
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ---- Step 1: the posting ---- */}
            <section className="card p-5 sm:p-6">
              <h1 className="text-lg font-semibold tracking-[-0.01em]">
                Paste a job description
              </h1>
              <p className="hint mt-1">
                Your resume and cover letter are tailored against this text and
                nothing else.
              </p>

              <div className="mt-5">
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                  onGenerate={generate}
                  busy={busy}
                  langs={langs}
                  onLangsChange={changeLangs}
                />
              </div>
            </section>

            {error &&
              (quotaExceeded ? (
                <div className="card flex flex-wrap items-center justify-between gap-4 border-accent/30 bg-accent-soft p-5">
                  <div>
                    <p className="text-body font-medium">{error}</p>
                    <p className="hint mt-0.5">
                      Unlimited resumes and cover letters for{" "}
                      {PLAN_PRICE_DISPLAY}/{PLAN_PERIOD_DISPLAY}.
                    </p>
                  </div>
                  <Link
                    href="/account"
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-accent px-5 text-small font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    See plans
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              ) : (
                <Alert tone="error">{error}</Alert>
              ))}

            {busy && (
              <div
                className="relative h-1 overflow-hidden rounded-full bg-line"
                role="status"
                aria-label="Generating"
              >
                <div className="absolute inset-y-0 w-1/5 animate-sweep rounded-full bg-accent" />
              </div>
            )}

            {/* ---- Step 2: the two documents, side by side when there is room ---- */}
            {result && (
              <div id="output" className="animate-rise space-y-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <ResumeResult
                    resume={result.resume}
                    person={result.person}
                    role={result.resume.experience?.[0]?.title ?? ""}
                    matchedKeywords={result.matched_keywords}
                    gaps={result.gaps}
                  />

                  {Object.values(result.cover_letter ?? {}).some((v) =>
                    v?.trim(),
                  ) && (
                    <CoverLetter
                      letters={result.cover_letter}
                      order={result.cover_letter_order}
                    />
                  )}
                </div>

                <div className="flex justify-center pt-2">
                  <Button variant="secondary" onClick={generate} disabled={busy}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Generate again
                  </Button>
                </div>
              </div>
            )}

            {/* A quiet nudge only when there is nothing on screen yet. */}
            {!result && !busy && (
              <p className="flex items-center justify-center gap-2 text-small text-faint">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Your resume and cover letter will appear here.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
