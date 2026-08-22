"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, FileUp, PenLine } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileInput } from "@/components/ProfileInput";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { MasterProfile, ProfileSummary } from "@/lib/types";

/**
 * Your history, entered once.
 *
 * The page changes shape depending on whether there is anything here yet.
 * Someone arriving with an empty profile is shown one thing — upload a resume
 * — with the hundred-odd fields of the editor folded away behind a second
 * option, because opening on that form is the moment people give up. Once a
 * profile exists, or a file has been read, the editor is the page and the
 * upload demotes itself to a line of small print.
 */

export default function ProfilePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<MasterProfile | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [justSaved, setJustSaved] = useState(false);

  /*
   * ProfileEditor copies `initial` into its own state on mount, so handing it
   * a new profile does nothing on its own — it has to be remounted. Bumping
   * this key is what makes an imported resume actually appear in the fields.
   */
  const [editorKey, setEditorKey] = useState(0);

  /** Set after an import, until the user saves. Null the rest of the time. */
  const [review, setReview] = useState<{ warnings: string[] } | null>(null);

  /** Whether the long form is on screen. See the note at the top. */
  const [editing, setEditing] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setDraft(data.profile);
        setSummary(data.summary);
        // An existing profile is here to be edited; a new one is not.
        if (data.summary?.exists) setEditing(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /*
   * The saved panel below claims "Profile saved. You are ready to apply." and
   * lives for four seconds. Editing inside that window made the claim false
   * while it was still on screen, with a button that would have navigated
   * away from the edit. It retracts the moment the form is touched instead.
   *
   * Stable identity on purpose: the editor fires this from an effect keyed on
   * the callback, so an inline arrow would re-run it on every render.
   */
  const onDirtyChange = useCallback((dirty: boolean) => {
    if (dirty) setJustSaved(false);
  }, []);

  function onSaved(next: ProfileSummary) {
    setSummary(next);
    setReview(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
  }

  /** Replace the form contents with a parsed resume. Nothing is saved yet. */
  function applyImport(profile: MasterProfile, warnings: string[]) {
    setDraft(profile);
    setEditorKey((k) => k + 1);
    setReview({ warnings });
    setEditing(true);

    // The fields are below the fold on most screens; without this the upload
    // looks like it did nothing.
    requestAnimationFrame(() =>
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const hasProfile = Boolean(summary?.exists);

  return (
    <>
      <AppHeader subtitle={hasProfile ? summary?.full_name : undefined} />

      {/* pb leaves room for the fixed save bar. */}
      <main className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-28">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        ) : (
          draft && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-subhead font-semibold tracking-[-0.015em]">
                    Your profile
                  </h1>
                  <p className="hint mt-1">
                    Entered once, reused for every application. The generator
                    can only use what is here — it never invents experience.
                  </p>
                </div>

                {justSaved && (
                  <span className="flex items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-1 text-small font-medium text-good">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Saved
                  </span>
                )}
              </div>

              {/* Saved and nothing else to do here — say where to go next. */}
              {justSaved && hasProfile && (
                <div className="card-raised mt-5 flex flex-wrap items-center justify-between gap-4 border-accent-line p-5">
                  <div>
                    <p className="text-body font-medium">
                      Profile saved. You are ready to apply.
                    </p>
                    <p className="hint mt-0.5">
                      Paste a job posting and get a resume written for it.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/")}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-accent px-5 text-small font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
                  >
                    Paste a job posting
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {/* ---- The way in ---- */}
                {editing ? (
                  /* Demoted: still reachable, no longer the loudest thing. */
                  <details className="card group p-5 sm:p-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span>
                        <span className="text-small font-medium text-ink">
                          Replace everything from a resume file
                        </span>
                        <span className="hint mt-0.5 block">
                          Reads the file into the fields below. Nothing is saved
                          until you press Save profile.
                        </span>
                      </span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>

                    <div className="mt-5 border-t border-line-soft pt-5">
                      <ResumeUpload onImported={applyImport} />
                    </div>
                  </details>
                ) : (
                  /* Empty profile: one obvious path, one quiet alternative. */
                  <section className="card-raised p-6 sm:p-8">
                    <div className="text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft">
                        <FileUp className="h-5 w-5 text-accent-text" aria-hidden />
                      </div>
                      <h2 className="mt-4 text-subhead font-semibold tracking-[-0.015em]">
                        Start from your existing resume
                      </h2>
                      <p className="hint mx-auto mt-1.5 max-w-sm">
                        We read the file and fill in every field for you. You
                        check it and save — no typing.
                      </p>
                    </div>

                    <div className="mt-6">
                      <ResumeUpload onImported={applyImport} />
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t border-line-soft pt-5">
                      <PenLine
                        className="h-4 w-4 shrink-0 text-faint"
                        aria-hidden
                      />
                      <p className="hint flex-1">
                        No file to hand? Fill the fields in yourself.
                      </p>
                      <button
                        onClick={() => {
                          setEditing(true);
                          requestAnimationFrame(() =>
                            editorRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          );
                        }}
                        className="shrink-0 text-small font-medium text-accent-text underline-offset-2 hover:underline"
                      >
                        Enter it by hand
                      </button>
                    </div>
                  </section>
                )}

                {review && (
                  <Alert tone={review.warnings.length ? "error" : "info"}>
                    {review.warnings.length ? (
                      <>
                        <strong className="font-medium">
                          Check the fields below before saving.
                        </strong>{" "}
                        We could not find {formatList(review.warnings)} — add
                        that by hand. Nothing has been saved yet.
                      </>
                    ) : (
                      <>
                        <strong className="font-medium">
                          Resume read. Check the fields below.
                        </strong>{" "}
                        Dates and job titles are worth a second look. Nothing
                        has been saved until you press Save profile.
                      </>
                    )}
                  </Alert>
                )}

                {/* ---- The form itself ---- */}
                <div ref={editorRef}>
                  {editing && (
                    <ProfileEditor
                      key={editorKey}
                      initial={draft}
                      onSaved={onSaved}
                      onDirtyChange={onDirtyChange}
                      onDone={hasProfile ? () => router.push("/") : undefined}
                    />
                  )}
                </div>

                {/* The text shortcut, out of the way until wanted. */}
                {editing && (
                  <details className="card group p-5 sm:p-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span>
                        <span className="text-small font-medium text-ink">
                          Paste resume text instead
                        </span>
                        <span className="hint mt-0.5 block">
                          For when you have the text but not the file.
                        </span>
                      </span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>

                    <div className="mt-5 border-t border-line-soft pt-5">
                      <ProfileInput
                        initialText={draft.raw_text ?? ""}
                        onSaved={(next, saved) => {
                          setDraft(saved);
                          // Same remount as an import — otherwise the fields
                          // above keep showing the profile from before.
                          setEditorKey((k) => k + 1);
                          onSaved(next);
                        }}
                      />
                    </div>
                  </details>
                )}
              </div>
            </>
          )
        )}
      </main>
    </>
  );
}

/** "your name, your skills and the end of the document" */
function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
