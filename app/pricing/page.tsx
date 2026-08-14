import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Faq } from "@/components/marketing/Faq";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingCards } from "@/components/marketing/PricingCards";
import { USAGE_WINDOW_DAYS } from "@/lib/plan";
import { getPlanPricing } from "@/lib/polar";

/**
 * Pricing on its own page, so it can be linked to directly — from a comparison
 * post, a support reply, or the account screen — without sending someone to
 * the landing page to scroll for it.
 *
 * Every figure comes from the same PricingCards component the landing page
 * uses, so the two can never disagree.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing — Gatecrash",
  description:
    "Free for three applications every 30 days. Pro for an active job search. One application pack is one job.",
};

/** What a single pack buys, spelled out so the unit is not abstract. */
const INCLUDED = [
  "A resume tailored to that posting, as Word or PDF",
  "A cover letter, if you asked for one — Pro only",
  "The keywords from the posting that made it into your resume",
  "The requirements your profile does not cover",
];

/** What is explicitly free, because metered products make people cautious. */
const FREE_FOREVER = [
  "Editing anything that comes back",
  "Downloading the same application again, in either format",
  "Reading applications you generated earlier",
  "Changing your profile, as often as you like",
];

export default async function PricingPage() {
  const plan = await getPlanPricing();

  return (
    <div id="top" className="min-h-screen bg-surface">
      <MarketingNav />

      <main>
        <section className="section py-14 sm:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow">Pricing</p>
            <h1 className="h-display mt-2">One application pack is one job</h1>
            <p className="lead mt-5">
              No credits to convert, no per-document charges. You paste a
              posting, you use one pack, and everything you do with what comes
              back is free.
            </p>
          </div>

          <div className="mt-12">
            <PricingCards plan={plan} ctaHref="/login#start" />
          </div>

          <p className="mt-6 text-small text-faint">
            Free packs renew every {USAGE_WINDOW_DAYS} days. Paid plans are
            billed by Polar as merchant of record; cancel any time from your
            account.
          </p>
        </section>

        {/* ---- What the unit actually contains ---- */}
        <section className="border-t border-line bg-paper py-16 sm:py-20">
          <div className="section grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                What one pack gives you
              </h2>
              <ul className="mt-5 space-y-2.5">
                {INCLUDED.map((line) => (
                  <li key={line} className="flex gap-2.5 text-small text-muted">
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
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                What never counts
              </h2>
              <ul className="mt-5 space-y-2.5">
                {FREE_FOREVER.map((line) => (
                  <li key={line} className="flex gap-2.5 text-small text-muted">
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
        </section>

        {/* ---- Questions ---- */}
        <section className="border-t border-line py-16 sm:py-20">
          <div className="section">
            <h2 className="h-section">Questions</h2>
            <div className="mt-10">
              <Faq />
            </div>
          </div>
        </section>

        {/* ---- Close ---- */}
        <section className="border-t border-line bg-paper py-16 sm:py-20">
          <div className="section text-center">
            <h2 className="h-section">Start on the free plan</h2>
            <p className="lead mx-auto mt-4 max-w-md">
              No card, no trial countdown. Upgrade only if you run out.
            </p>
            <Link
              href="/login#start"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-accent px-7 text-[1rem] font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="section flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size={20} />
            <p className="mt-2 text-micro text-faint">
              Tailor your resume to one job at a time.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-micro text-faint">
            <Link href="/login" className="hover:text-ink">
              Home
            </Link>
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
