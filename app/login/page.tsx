import { Suspense } from "react";
import { Check, FileText, ListChecks, Sparkles } from "lucide-react";
import { SignInCard } from "@/components/SignInCard";
import { FREE_GENERATIONS_PER_MONTH } from "@/lib/plan";
import { getPlanPricing } from "@/lib/stripe";

/**
 * The front door.
 *
 * Every visitor lands here, signed out, so it has two jobs at once: explain
 * what the product does, and let someone sign in without hunting for it. The
 * sign-in card therefore sits in the hero rather than below the pitch.
 *
 * A server component, so the price comes from Stripe already rendered — no
 * loading flash, and no figure typed into the source that could go stale.
 */

/** Price changes are rare; serve this from cache and refresh hourly. */
export const revalidate = 3600;

const STEPS = [
  {
    icon: ListChecks,
    title: "Fill in your profile once",
    body: "Contact details, every role, skills, education. Entered once and reused for every application.",
  },
  {
    icon: FileText,
    title: "Paste a job posting",
    body: "The whole thing — responsibilities, requirements, the company name. Everything is tailored against that text.",
  },
  {
    icon: Sparkles,
    title: "Get a resume and cover letter",
    body: "Rewritten for that specific job, ready to download as Word or PDF and send.",
  },
];

const INCLUDED = [
  "Resume tailored to each posting, as Word or PDF",
  "Cover letter in English, Russian or Spanish",
  "Keywords matched from the posting, so it reads well to an ATS",
  "An honest list of requirements your profile does not cover",
];

export default async function LoginPage() {
  const plan = await getPlanPricing();

  return (
    <div className="min-h-screen bg-surface">
      {/* ---- Header ---- */}
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
            Resume Generator
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/*
          Explicit grid placement so the reading order differs by width. On a
          phone the sign-in card comes straight after the headline, ahead of
          the feature list — otherwise the buttons sit below four bullets and
          a whole screen of scrolling.
        */}
        <section className="grid gap-x-14 gap-y-8 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr]">
          <div className="max-w-xl lg:col-start-1 lg:row-start-1">
            <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
              A resume written for the job you are actually applying to
            </h1>

            <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted">
              Paste a job posting. Get back a resume and cover letter rewritten
              around it, using your own experience — never invented.
            </p>
          </div>

          {/* Sticky on desktop so signing in is always one click away. */}
          <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Suspense
              fallback={<div className="card h-72 animate-pulse shadow-sm" />}
            >
              <SignInCard />
            </Suspense>
          </div>

          <ul className="max-w-xl space-y-2.5 lg:col-start-1 lg:row-start-2 lg:-mt-1">
            {INCLUDED.map((line) => (
              <li key={line} className="flex gap-2.5 text-body">
                <Check
                  className="mt-[0.3rem] h-4 w-4 shrink-0 text-accent"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- How it works ---- */}
        <section className="border-t border-line py-12 sm:py-14">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">
            How it works
          </h2>

          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft">
                  <Icon
                    className="h-[1.125rem] w-[1.125rem] text-accent"
                    aria-hidden
                  />
                </div>
                <p className="mt-3.5 text-small font-medium text-faint tnum">
                  Step {i + 1}
                </p>
                <h3 className="mt-0.5 text-body font-semibold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="hint mt-1.5">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- What it will not do ---- */}
        <section className="border-t border-line py-12 sm:py-14">
          <div className="card max-w-2xl p-6">
            <h2 className="text-body font-semibold tracking-[-0.01em]">
              It will not invent experience
            </h2>
            <p className="hint mt-2">
              Employers, job titles, dates and education are copied straight from
              your profile — the AI is never asked to write them, so it cannot
              quietly change a date or add a degree. It rewrites how your real
              experience is presented, and tells you plainly which requirements
              you do not meet.
            </p>
          </div>
        </section>

        {/* ---- Pricing ---- */}
        <section className="border-t border-line py-12 sm:py-14">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Pricing</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <p className="text-small font-medium text-muted">Free</p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-[-0.02em]">
                  $0
                </span>
              </p>
              <p className="hint mt-2">
                {FREE_GENERATIONS_PER_MONTH} generations every 30 days. No card
                required.
              </p>
            </div>

            <div className="card border-accent/30 p-6">
              <p className="text-small font-medium text-accent">Unlimited</p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-[-0.02em]">
                  {plan.price}
                </span>
                <span className="text-small text-muted">per {plan.period}</span>
              </p>
              <p className="hint mt-2">
                As many resumes and cover letters as you need. Cancel whenever
                you like.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-line py-8">
          <p className="text-[0.75rem] text-faint">
            Resume Generator — tailor your resume to one job at a time.
          </p>
        </footer>
      </main>
    </div>
  );
}
