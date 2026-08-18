"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Alert } from "./ui/alert";
import { Input } from "./ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * The ways in, on their own so the page can place them in more than one spot
 * without duplicating the sign-in logic.
 *
 * Three doors, not two. Google and GitHub are two taps and stay first because
 * that is genuinely the fastest path — but they were the *only* path, and this
 * product is aimed squarely at people applying abroad, changing careers, and
 * leaving their first job. The example in our own hero is a financial analyst
 * in Berlin, who has no reason to own a GitHub account. Anyone without either
 * provider previously had no way through this page at all, and no error to
 * tell them so, because it was not an error: they simply left.
 *
 * Email is a third button rather than an always-open form on purpose. The form
 * costs about 140px of card, and on a 375px phone the buttons are already
 * fighting the fold; a button costs 44px and keeps the three options at equal
 * weight.
 */

type Provider = "google" | "github";
type Mode = "choose" | "email" | "sent";

function GoogleMark() {
  return (
    <svg className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" aria-hidden>
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
    <svg
      className="h-[1.125rem] w-[1.125rem]"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * Turn a provider error into a sentence someone applying for a job can act on.
 *
 * supabase-js surfaces the auth server's response body as `message`, and when
 * that body is empty or unparseable the message is the literal string "{}".
 * Printing it raw tells the reader nothing at all — it does not name the
 * problem and it does not name a way out, which is the entire job of an error.
 *
 * The raw text is kept whenever it actually says something, because the person
 * reading it is as often the site owner as a customer.
 */
function describeAuthError(error: { message?: string; status?: number }): string {
  const raw = (error.message ?? "").trim();
  const status = error.status;

  // Empty body, stringified object, or an object that never had a message.
  const opaque = !raw || raw === "{}" || raw === "[object Object]";

  if (status === 429 || /rate limit|too many/i.test(raw)) {
    return "Too many sign-in emails have been requested from here. Wait a minute and try again.";
  }

  if (/signups? not allowed|logins? are disabled|provider is not enabled|email provider/i.test(raw)) {
    return "Email sign-in is not switched on for this site yet. Google and GitHub still work.";
  }

  if (/invalid.*email|valid email|unable to validate email/i.test(raw)) {
    return "That does not look like a complete email address.";
  }

  if (opaque) {
    return `The email could not be sent${status ? ` (error ${status})` : ""}. Email sign-in may not be fully set up yet — Google and GitHub still work.`;
  }

  return raw;
}

const BUTTON =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-line bg-paper text-body font-medium text-ink transition-colors hover:border-faint hover:bg-surface disabled:pointer-events-none disabled:opacity-50";

export function SignInButtons() {
  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState<Provider | "email" | null>(null);
  const [email, setEmail] = useState("");
  /*
   * Show what actually went wrong. A generic "try again" hides the one piece
   * of information needed to fix a misconfigured redirect or provider.
   */
  const [error, setError] = useState<string | null>(null);

  /*
   * The auth callback reports a failed sign-in by redirecting here with
   * ?error=. Read after mount rather than with useSearchParams, which would
   * force this into a Suspense boundary and knock the whole card out of the
   * static HTML — leaving a grey skeleton where the only call to action on
   * the page should be, for anyone on a slow connection or with JS disabled.
   */
  useEffect(() => {
    const reported = new URLSearchParams(window.location.search).get("error");
    if (reported) setError(reported);
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setError(describeAuthError(authError));
      setBusy(null);
    }
    // On success the browser is redirected away, so there is nothing to reset.
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setBusy(null);

    if (authError) {
      setError(describeAuthError(authError));
      // Log the untouched error so the owner can read the real cause in the
      // console; the sentence above is for the person trying to sign in.
      console.error("[signin] signInWithOtp", authError);
      return;
    }

    setMode("sent");
  }

  /* ---------------- Link sent ---------------- */
  if (mode === "sent") {
    return (
      <div className="space-y-3" role="status">
        <div className="rounded-md border border-good/20 bg-good-soft p-4">
          <p className="flex items-center gap-2 text-body font-medium text-good">
            <Mail className="h-4 w-4" aria-hidden />
            Check your email
          </p>
          <p className="mt-1.5 text-small leading-relaxed text-muted">
            A sign-in link is on its way to{" "}
            <strong className="font-medium text-ink">{email.trim()}</strong>.
            {/*
              Same-device is a real constraint of the PKCE flow, not a
              nicety: the verifier that completes the exchange lives in this
              browser, so a link opened on a phone after requesting it on a
              laptop fails. Better said now than discovered as an error.
            */}{" "}
            Open it on this device — the link only works in the browser that
            asked for it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode("email");
            setError(null);
          }}
          className="text-small font-medium text-accent-text underline-offset-2 hover:underline"
        >
          Use a different address
        </button>
      </div>
    );
  }

  /* ---------------- Email form ---------------- */
  if (mode === "email") {
    return (
      <form onSubmit={sendLink} className="space-y-3">
        <div>
          <label
            htmlFor="signin-email"
            className="label"
          >
            Email address
          </label>
          <Input
            id="signin-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy !== null}
          />
        </div>

        <button
          type="submit"
          disabled={busy !== null || email.trim().length < 3}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-accent text-body font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === "email" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Mail className="h-4 w-4" aria-hidden />
          )}
          Send me a sign-in link
        </button>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="button"
          onClick={() => {
            setMode("choose");
            setError(null);
          }}
          className="flex items-center gap-1.5 text-small font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Other ways to sign in
        </button>
      </form>
    );
  }

  /* ---------------- The three doors ---------------- */
  return (
    <div className="space-y-2.5">
      <button
        onClick={() => signIn("google")}
        disabled={busy !== null}
        className={BUTTON}
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
        className={BUTTON}
      >
        {busy === "github" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <GitHubMark />
        )}
        Continue with GitHub
      </button>

      <button
        onClick={() => {
          setMode("email");
          setError(null);
        }}
        disabled={busy !== null}
        className={BUTTON}
      >
        <Mail className="h-[1.125rem] w-[1.125rem] text-muted" aria-hidden />
        Continue with email
      </button>

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
