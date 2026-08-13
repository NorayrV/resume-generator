import Link from "next/link";
import { Logo } from "./Logo";

/**
 * The shell around the privacy policy and the terms.
 *
 * Both are plain documents, reachable signed out, and are the pages Google
 * looks for when verifying the OAuth consent screen — so they carry the same
 * header as the front door rather than the signed-in app chrome.
 */

/** Where to write about anything on these pages. */
export const CONTACT_EMAIL = "hello@gatecrash.app";

/** Changed only when the documents themselves change. */
export const LAST_UPDATED = "13 August 2026";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/login" aria-label="Gatecrash">
            <Logo size={22} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-muted">
          {intro}
        </p>
        <p className="mt-2 text-small text-faint">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-9">{children}</div>

        <footer className="mt-16 border-t border-line pt-8">
          <p className="text-[0.75rem] leading-relaxed text-faint">
            Questions about anything here? Write to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-accent underline-offset-2 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p className="mt-3 flex gap-4 text-[0.75rem] text-faint">
            <Link href="/login" className="hover:text-ink">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

/** One titled block of the document. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-body font-semibold tracking-[-0.01em]">{heading}</h2>
      <div className="mt-2.5 space-y-3 text-body leading-[1.7] text-muted">
        {children}
      </div>
    </section>
  );
}

/** A plain list, used where prose would turn into a run-on sentence. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="text-faint" aria-hidden>
            &bull;
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
