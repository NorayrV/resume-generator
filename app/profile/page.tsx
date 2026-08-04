"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileInput } from "@/components/ProfileInput";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Alert } from "@/components/ui/alert";
import type { MasterProfile, ProfileSummary } from "@/lib/types";

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

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setDraft(data.profile);
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function onSaved(next: ProfileSummary) {
    setSummary(next);
    setReview(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  /** Replace the form contents with a parsed resume. Nothing is saved yet. */
  function applyImport(profile: MasterProfile, warnings: string[]) {
    setDraft(profile);
    setEditorKey((k) => k + 1);
    setReview({ warnings });

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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.01em]">
              Your profile
            </h1>
            <p className="hint mt-1">
              Entered once, reused for every application. The generator can only
              use what is here — it never invents experience.
            </p>
          </div>

          {justSaved && (
            <span className="flex items-center gap-1.5 text-small font-medium text-accent">
              <Check className="h-4 w-4" aria-hidden />
              Saved
            </span>
          )}
        </div>

        {loading ? (
          <div className="card mt-6 h-96 animate-pulse" />
        ) : (
          draft && (
            <div className="mt-6 space-y-4">
              {/*
                First thing on the page for someone with nothing entered yet:
                filling this form by hand is the reason people give up.
              */}
              <section className="card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft">
                    <Sparkles
                      className="h-[1.125rem] w-[1.125rem] text-accent"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <h2 className="text-body font-semibold tracking-[-0.01em]">
                      {hasProfile
                        ? "Replace this from a resume file"
                        : "Already have a resume? Upload it"}
                    </h2>
                    <p className="hint mt-1">
                      {hasProfile
                        ? "Reads the file and puts it in the fields below, replacing what is there. Nothing is saved until you press Save profile."
                        : "We read the file and fill in everything below. You check it and press Save — no typing."}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <ResumeUpload onImported={applyImport} />
                </div>
              </section>

              {review && (
                <Alert tone={review.warnings.length ? "error" : "info"}>
                  {review.warnings.length ? (
                    <>
                      <strong className="font-medium">
                        Check the fields below before saving.
                      </strong>{" "}
                      We could not find {formatList(review.warnings)} — add that
                      by hand. Nothing has been saved yet.
                    </>
                  ) : (
                    <>
                      <strong className="font-medium">
                        Resume read. Check the fields below.
                      </strong>{" "}
                      Dates and job titles are worth a second look. Nothing has
                      been saved until you press Save profile.
                    </>
                  )}
                </Alert>
              )}

              <div ref={editorRef}>
                <ProfileEditor
                  key={editorKey}
                  initial={draft}
                  onSaved={onSaved}
                  onDone={hasProfile ? () => router.push("/") : undefined}
                />
              </div>

              {/* The text shortcut, out of the way until wanted. */}
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

                <div className="mt-5 border-t border-line pt-5">
                  <ProfileInput
                    initialText={draft.raw_text ?? ""}
                    onSaved={(next, saved) => {
                      setDraft(saved);
                      // Same remount as an import — otherwise the fields above
                      // keep showing the profile from before the paste.
                      setEditorKey((k) => k + 1);
                      onSaved(next);
                    }}
                  />
                </div>
              </details>
            </div>
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
