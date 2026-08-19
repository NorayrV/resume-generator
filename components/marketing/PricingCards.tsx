import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StartLink } from "./StartLink";
import {
  FREE_GENERATIONS_PER_MONTH,
  PRO_GENERATIONS_PER_MONTH,
  USAGE_WINDOW_DAYS,
  type PlanPricing,
} from "@/lib/plan";

/**
 * The two plans, side by side.
 *
 * Used by the pricing section of the landing page. The account page states
 * the price too, but it is answering a different question — what this account
 * would be charged, next to a button that charges it — so it keeps its own
 * block rather than sharing this one.
 *
 * The price comes from Polar at render time rather than being typed in here,
 * so changing it in Polar changes it on the site. When that read fails,
 * `plan.live` is false and the card says the figure is confirmed at checkout
 * instead of asserting a number nothing has verified.
 *
 * Both cards list the same four rows in the same order, and the free card
 * marks what it does not include rather than quietly leaving the row out.
 * A reader comparing two lists of different lengths has to read both in full;
 * a reader comparing two identical lists only has to find the row that
 * changed — which here is the cover letter.
 *
 * That comparison is why both cards open with the same header element even
 * though only one of them has a badge to put in it. Without the reserved
 * height the badge made the Pro header 24px against the free card's 20px, and
 * the 4px pushed every row below it out of line: the two prices, the two
 * hints, all four features, both buttons. Nothing looked broken, and nothing
 * lined up either.
 */

/** One row of a plan. `false` means the row is shown as not included. */
type Row = { label: React.ReactNode; included: boolean };

function rows(plan: "free" | "pro"): Row[] {
  const pro = plan === "pro";

  return [
    {
      label: (
        <>
          <strong className="font-medium text-ink">
            {pro ? PRO_GENERATIONS_PER_MONTH : FREE_GENERATIONS_PER_MONTH}{" "}
            applications
          </strong>{" "}
          {/*
            The same window on both plans, said the same way. Pro used to read
            "a month", but lib/usage.ts counts both tiers over one rolling
            USAGE_WINDOW_DAYS — so "a month" described the same mechanism in
            looser words, on the plan people pay for.
          */}
          every {USAGE_WINDOW_DAYS} days
        </>
      ),
      included: true,
    },
    { label: "Tailored resume, as Word or PDF", included: true },
    { label: "Matched keywords and missing requirements", included: true },
    {
      label: "Cover letters, in English, Russian or Spanish",
      included: pro,
    },
  ];
}

/** Reserves the badge's height in both cards, so the two lists stay in step. */
const HEADER = "flex min-h-[1.5rem] items-center justify-between gap-3";

export function PricingCards({ plan }: { plan: PlanPricing }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* ---- Free ---- */}
        <div className="card flex flex-col p-6 sm:p-7">
          <div className={HEADER}>
            <p className="text-small font-semibold text-muted">Free</p>
          </div>

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
            {rows("free").map((row, i) => (
              <Line key={i} included={row.included}>
                {row.label}
              </Line>
            ))}
          </ul>

          <StartLink className="mt-7 inline-flex h-11 items-center justify-center rounded-md border border-line bg-paper px-6 text-body font-medium text-ink transition-colors hover:border-faint hover:bg-surface">
            Start free
          </StartLink>
        </div>

        {/* ---- Pro ---- */}
        <div className="card-raised flex flex-col border-accent-line p-6 sm:p-7">
          <div className={HEADER}>
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
            {PRO_GENERATIONS_PER_MONTH} applications every {USAGE_WINDOW_DAYS}{" "}
            days, with cover letters. Cancel any time.
          </p>

          <ul className="mt-6 space-y-2.5">
            {rows("pro").map((row, i) => (
              <Line key={i} included={row.included}>
                {row.label}
              </Line>
            ))}
          </ul>

          <StartLink className="mt-7 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-body font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90">
            Start free, upgrade later
          </StartLink>
        </div>
      </div>

      {/*
        Said only when it needs saying, and said below both cards rather than
        inside one. `live` is false when Polar is unconfigured or the price
        read failed, in which case the figure above is a constant in
        lib/plan.ts rather than the amount Polar would charge — and a price
        stated with no hedge is a promise. Putting the hedge inside the Pro
        card would have pushed its feature list a line clear of the free one,
        which is the misalignment the reserved header exists to prevent.
      */}
      {!plan.live && (
        <p className="mt-4 text-micro text-faint">
          Polar confirms the exact amount at checkout, before anything is
          charged.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Line({
  included,
  children,
}: {
  included: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-2.5 text-small ${
        included ? "text-muted" : "text-faint"
      }`}
    >
      {included ? (
        <Check
          className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-accent-text"
          aria-hidden
        />
      ) : (
        <Minus className="mt-[0.2rem] h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {/* Named for screen readers, which cannot see which icon is beside it. */}
      <span>
        <span className="sr-only">
          {included ? "Included: " : "Not included: "}
        </span>
        {children}
      </span>
    </li>
  );
}
