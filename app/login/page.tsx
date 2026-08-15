import Link from "next/link";
import { ArrowRight, Check, Lock, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SignInCard } from "@/components/SignInCard";
import { HashScroll } from "@/components/HashScroll";
import { Faq } from "@/components/marketing/Faq";
import { HeroVisual } from "@/components/marketing/HeroVisual";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingCards } from "@/components/marketing/PricingCards";
import { FREE_GENERATIONS_PER_MONTH, USAGE_WINDOW_DAYS } from "@/lib/plan";
import { getPlanPricing } from "@/lib/polar";

/**
 * The front door.
 *
 * Every visitor lands here signed out, so the page has to do three things in
 * order: say what the product does, show what comes out of it, and let
 * someone start without hunting for the button.
 *
 * There is exactly one call to action on the page — signing in — and every
 * section points at the same card. The nav button, the buttons under pricing
 * and the one at the foot are all anchors to #start rather than competing
 * actions.
 *
 * A server component, so the price is already rendered when the HTML arrives:
 * no loading flash, and no figure typed into the source that could go stale.
 */

/** Price changes are rare; serve this from cache and refresh hourly. */
export const revalidate = 3600;

const STEPS = [
  {
    title: "Build your profile once",
    body: "Upload an existing resume and the fields fill themselves, or type it in. Your real roles, dates, skills and education.",
  },
  {
    title: "Paste a job posting",
    body: "The whole thing — responsibilities, requirements, the company. Everything is tailored against that text and nothing else.",
  },
  {
    title: "Get your application",
    body: "A tailored resume as Word or PDF, the keywords it matched, and what it could not cover. Cover letters come with Pro.",
  },
];

/** What a single pack buys, spelled out so the unit is not abstract. */
const PACK_INCLUDES = [
  "A resume tailored to that posting, as Word or PDF",
  "The keywords from the posting that made it into your resume",
  "The requirements your profile does not cover",
  "A cover letter, on Pro",
];

/** What is explicitly free, because metered products make people cautious. */
const NEVER_COUNTS = [
  "Editing anything that comes back",
  "Downloading the same application again, in either format",
  "Reading applications you generated earlier",
  "Changing your profile, as often as you like",
];

/** The five things the AI is never allowed to write. */
const COPIED = [
  "Employers",
  "Job titles",
  "Start and end dates",
  "Education and degrees",
  "Certifications",
];

/** The five it does write, from what is already in your profile. */
const REWRITTEN = [
  "The headline under your name",
  "Your summary",
  "How skills are grouped",
  "How each role is described",
  "Which interests to show",
];

export default async function LoginPage() {
  const plan = await getPlanPricing();

  return (
    <div id="top" className="min-h-screen bg-surface">
      {/* Arriving at /login#pricing should land on pricing, not the top. */}
      <HashScroll />
      <MarketingNav onHome />

      <main>
        {/* ================= Hero ================= */}
        <section className="section pb-14 pt-12 sm:pb-16 sm:pt-16">
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-2xl">
              <h1 className="h-display">
                A resume written for the job you are actually applying to
              </h1>

              <p className="lead mt-5 max-w-xl">
                Paste a job posting. Gatecrash rewrites your resume and cover
                letter around it — using your real experience, never inventing
                anything.
              </p>

              {/*
                The last two are hidden on a phone, not deleted: both are
                restated word for word in PACK_INCLUDES further down, and at
                375px they cost about 115px of the space between the headline
                and the only button on the page. Measured before this change,
                the Google button began at 801px against an 812px fold.
              */}
              <ul className="mt-7 space-y-2.5">
                {[
                  { line: "Tailored resume, as Word or PDF", onPhone: true },
                  {
                    line: "Cover letters when the application asks for one, with Pro",
                    onPhone: true,
                  },
                  {
                    line: "The keywords from the posting that made it in",
                    onPhone: false,
                  },
                  {
                    line: "An honest list of what your profile does not cover",
                    onPhone: false,
                  },
                ].map(({ line, onPhone }) => (
                  <li
                    key={line}
                    className={`gap-2.5 text-body ${onPhone ? "flex" : "hidden sm:flex"}`}
                  >
                    <Check
                      className="mt-[0.3rem] h-4 w-4 shrink-0 text-accent-text"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {/*
                Concrete and checkable — no invented counts or testimonials.
                Hidden on a phone because the card immediately below already
                says "3 applications every 30 days. No card, no trial timer."
                and carries the privacy line; repeating it here only pushed the
                button past the fold.
              */}
              <p className="mt-7 hidden flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-faint sm:flex">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {FREE_GENERATIONS_PER_MONTH} free applications
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Your data is never sold
                </span>
              </p>
            </div>

            {/*
              The one action on the page, in the static HTML rather than
              behind a Suspense boundary — see the note in SignInCard for why
              that boundary was costing an 89px shift and a CTA that never
              rendered without JavaScript.
            */}
            <div id="start" className="lg:sticky lg:top-24 lg:self-start">
              <SignInCard />
            </div>
          </div>

          {/* Show the thing before explaining it. */}
          <div className="mt-14 sm:mt-16">
            <HeroVisual />
          </div>
        </section>

        {/* ================= How it works ================= */}
        <section
          id="how-it-works"
          className="border-t border-line bg-paper py-16 sm:py-20"
        >
          <div className="section">
            <p className="eyebrow">How it works</p>
            <h2 className="h-section mt-2 max-w-xl">
              Three steps, and the first one only happens once
            </h2>

            <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-3">
              {STEPS.map(({ title, body }, i) => (
                <li key={title}>
                  <p className="text-small font-semibold text-accent-text tnum">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2.5 text-[1.0625rem] font-semibold tracking-[-0.015em]">
                    {title}
                  </h3>
                  <p className="mt-2 text-small leading-[1.7] text-muted">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================= Accuracy ================= */}
        <section id="accuracy" className="border-t border-line py-16 sm:py-20">
          <div className="section">
            <p className="eyebrow">Accuracy</p>
            <h2 className="h-section mt-2 max-w-2xl">
              AI that works with your experience, not around it
            </h2>
            <p className="lead mt-4 max-w-2xl">
              Most tools hand your history to a model and hope. Gatecrash
              splits the job in two: the facts are copied, and only the wording
              is written.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-body font-semibold tracking-[-0.01em]">
                  <Lock className="h-4 w-4 text-ink" aria-hidden />
                  Copied from your profile
                </h3>
                <p className="hint mt-1.5">
                  Never sent to the model as something to write, so it cannot
                  quietly change a date or add a degree.
                </p>
                <ul className="mt-5 space-y-2">
                  {COPIED.map((item) => (
                    <li key={item} className="flex gap-2.5 text-small">
                      <Lock
                        className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-faint"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-body font-semibold tracking-[-0.01em]">
                  <ArrowRight className="h-4 w-4 text-accent-text" aria-hidden />
                  Rewritten for the role
                </h3>
                <p className="hint mt-1.5">
                  Built only from what is already in your profile, aimed at the
                  posting in front of it.
                </p>
                <ul className="mt-5 space-y-2">
                  {REWRITTEN.map((item) => (
                    <li key={item} className="flex gap-2.5 text-small">
                      <Check
                        className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-accent-text"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* The part competitors leave out, given its own weight. */}
            <div className="card-raised mt-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-flag-soft">
                <X className="h-5 w-5 text-flag" aria-hidden />
              </div>
              <div>
                <h3 className="text-body font-semibold tracking-[-0.01em]">
                  It tells you what you are missing
                </h3>
                <p className="hint mt-1.5">
                  Every application comes with the requirements your profile
                  does not evidence — the certification you do not hold, the
                  tool you have not used. They are left off the resume rather
                  than papered over, so you walk into the interview knowing
                  exactly where the questions are coming from.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= Pricing ================= */}
        <section
          id="pricing"
          className="border-t border-line bg-paper py-16 sm:py-20"
        >
          <div className="section">
            <p className="eyebrow">Pricing</p>
            <h2 className="h-section mt-2">One application pack is one job</h2>
            <p className="lead mt-4 max-w-2xl">
              Paste a posting and you get the resume, the matched keywords
              and the missing requirements — all counted as one, on either
              plan. Pro adds a tailored cover letter to the same pack. Editing
              what comes back and downloading it again are free and never
              count.
            </p>

            <div className="mt-10">
              <PricingCards plan={plan} />
            </div>

            {/*
              What the unit contains, and what is outside it. Metered pricing
              makes people cautious about touching anything, so the second
              list matters as much as the first.
            */}
            <div className="mt-12 grid gap-10 border-t border-line pt-10 md:grid-cols-2 md:gap-16">
              <div>
                <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                  What one pack gives you
                </h3>
                <ul className="mt-5 space-y-2.5">
                  {PACK_INCLUDES.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2.5 text-small text-muted"
                    >
                      <Check
                        className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-accent-text"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                  What never counts
                </h3>
                <ul className="mt-5 space-y-2.5">
                  {NEVER_COUNTS.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2.5 text-small text-muted"
                    >
                      <Check
                        className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-good"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 text-small text-faint">
              Free packs renew every {USAGE_WINDOW_DAYS} days. Paid plans are
              billed by Polar as merchant of record; cancel any time from your
              account.
            </p>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" className="border-t border-line py-16 sm:py-20">
          <div className="section">
            <p className="eyebrow">Questions</p>
            <h2 className="h-section mt-2">Before you hand over your history</h2>

            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>

        {/* ================= Close ================= */}
        <section className="border-t border-line bg-paper py-16 sm:py-20">
          <div className="section text-center">
            <h2 className="h-section mx-auto max-w-xl">
              Stop sending the same resume to every job
            </h2>
            <p className="lead mx-auto mt-4 max-w-lg">
              Set up your profile once. Every application after that takes about
              a minute.
            </p>

            <a
              href="#start"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-accent px-7 text-[1rem] font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-small text-faint">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {FREE_GENERATIONS_PER_MONTH} applications free, no card required
            </p>
          </div>
        </section>
      </main>

      {/* ================= Footer ================= */}
      <footer className="border-t border-line py-10">
        <div className="section flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size={20} />
            <p className="mt-2 text-micro text-faint">
              Tailor your resume to one job at a time.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-micro text-faint">
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
