import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FREE_GENERATIONS_PER_MONTH,
  PRO_GENERATIONS_PER_MONTH,
  USAGE_WINDOW_DAYS,
  type PlanPricing,
} from "@/lib/plan";

/**
 * The two plans, side by side.
 *
 * Shared by the landing page and /pricing so the figures can never disagree.
 * The price comes from Polar at render time rather than being typed in here,
 * so changing it in Polar changes it on the site.
 *
 * Both cards list the same four lines in the same order. A reader comparing
 * them only has to scan one column of differences, which is the whole point
 * of a comparison — feature lists that differ in length force them to read
 * both in full.
 */

const SHARED = [
  "Tailored resume, as Word or PDF",
  "Cover letter when you want one",
  "Matched keywords and missing requirements",
];

export function PricingCards({
  plan,
  ctaHref = "#start",
}: {
  plan: PlanPricing;
  /** Where both buttons point. The account page overrides this. */
  ctaHref?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ---- Free ---- */}
      <div className="card flex flex-col p-6 sm:p-7">
        <p className="text-small font-semibold text-muted">Free</p>

        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[2.25rem] font-semibold tracking-[-0.03em]">
            $0
          </span>
          <span className="text-small text-muted">forever</span>
        </p>

        <p className="hint mt-2">
          {FREE_GENERATIONS_PER_MONTH} applications every {USAGE_WINDOW_DAYS}{" "}
          days. No card required.
        </p>

        <ul className="mt-6 space-y-2.5">
          <Line>
            <strong className="font-medium text-ink">
              {FREE_GENERATIONS_PER_MONTH} applications
            </strong>{" "}
            every {USAGE_WINDOW_DAYS} days
          </Line>
          {SHARED.map((line) => (
            <Line key={line}>{line}</Line>
          ))}
        </ul>

        <a
          href={ctaHref}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-md border border-line bg-paper px-6 text-body font-medium text-ink transition-colors hover:border-faint hover:bg-surface"
        >
          Start free
        </a>
      </div>

      {/* ---- Pro ---- */}
      <div className="card-raised flex flex-col border-accent-line p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-semibold text-accent-text">Pro</p>
          <Badge tone="accent">For an active search</Badge>
        </div>

        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[2.25rem] font-semibold tracking-[-0.03em]">
            {plan.price}
          </span>
          <span className="text-small text-muted">per {plan.period}</span>
        </p>

        <p className="hint mt-2">
          {PRO_GENERATIONS_PER_MONTH} applications a month. Cancel any time.
        </p>

        <ul className="mt-6 space-y-2.5">
          <Line>
            <strong className="font-medium text-ink">
              {PRO_GENERATIONS_PER_MONTH} applications
            </strong>{" "}
            a month
          </Line>
          {SHARED.map((line) => (
            <Line key={line}>{line}</Line>
          ))}
        </ul>

        <a
          href={ctaHref}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-body font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
        >
          Start free, upgrade later
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Line({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-small text-muted">
      <Check className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
