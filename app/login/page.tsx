"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FREE_GENERATIONS_PER_MONTH } from "@/lib/plan";

type Provider = "google" | "github";

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Sign-in failed. Please try again." : null,
  );

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);

    const next = params.get("next") ?? "/";
    const supabase = supabaseBrowser();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(null);
    }
    // On success the browser is redirected away, so there is nothing to reset.
  }

  return (
    <div className="card w-full max-w-sm p-7">
      <h1 className="text-lg font-semibold tracking-[-0.01em]">
        Resume Generator
      </h1>
      <p className="hint mt-1">
        Tailor your resume and cover letter to any job posting. Sign in to get
        started — the first {FREE_GENERATIONS_PER_MONTH} generations are free.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => signIn("google")}
          disabled={busy !== null}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-line bg-paper text-body font-medium text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <GoogleMark />
          )}
          Continue with Google
        </button>

        <button
          onClick={() => signIn("github")}
          disabled={busy !== null}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-line bg-paper text-body font-medium text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <GitHubMark />
          )}
          Continue with GitHub
        </button>

        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <p className="mt-6 text-[0.75rem] leading-relaxed text-faint">
        Your profile is private to your account and is only ever sent to the AI
        to write your own resume.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Suspense fallback={<div className="card h-72 w-full max-w-sm animate-pulse" />}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
