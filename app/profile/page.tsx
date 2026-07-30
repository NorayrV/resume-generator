"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileInput } from "@/components/ProfileInput";
import type { MasterProfile, ProfileSummary } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<MasterProfile | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [justSaved, setJustSaved] = useState(false);

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
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
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
              <ProfileEditor
                initial={draft}
                onSaved={onSaved}
                onDone={hasProfile ? () => router.push("/") : undefined}
              />

              {/* The bulk shortcut, out of the way until wanted. */}
              <details className="card group p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="text-small font-medium text-ink">
                      Paste a whole resume instead
                    </span>
                    <span className="hint mt-0.5 block">
                      Fills the fields above in one go. Check them afterwards.
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
                      setSummary(next);
                      setDraft(saved);
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
