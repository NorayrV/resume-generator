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
 * Both cards list the same five rows in the same order, and the free card
 * marks what it does not include rather than quietly leaving the row out.
 * A reader comparing two lists of different lengths has to read both in full;
 * a reader comparing two identical lists only has to find the row that
 * changed — which here is the cover letter.
 *
 * That comparison is why the two cards share one set of grid rows.
 *
 * The first attempt reserved a fixed height for the header, because the Pro
 * badge made that row 24px against the free card's 20px. It fixed 1280 and it
 * fixed the stacked phone layout, and between 768 and about 1022px it fixed
 * nothing: the Pro hint is 413px of text on one line, so it wraps in a card
 * narrower than ~471px while the free card's shorter hint does not, and every
 * feature row and both buttons sat 21.13px apart with the cards side by side.
 * At 1024 the hint cleared its card by 0.8px. That is not a margin, it is a
 * coincidence, and reserving heights row by row only ever chases the string
 * that happens to be longest today.
 *
 * `grid-rows-subgrid` makes the alignment structural instead. Both cards span
 * the same five parent rows — header, price, hint, features, button — so each
 * row is as tall as the taller card needs and the two stay in step at every
 * width, whatever the copy grows into later.
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
            "a month"; both then read "every N days". lib/usage.ts counts rows
            since now minus N days, which is a window that rolls — "every"
            reads as a date the count resets on, and someone who spends three
            on day one and comes back on day 31 expecting a fresh three would
            have been told that by this line. "In any" describes the window
            that exists.
          */}
          in any {USAGE_WINDOW_DAYS} days
        </>
      ),
      included: true,
    },
    { label: "Tailored resume, as Word or PDF", included: true },
    { label: "The keywords from the posting that made it in", included: true },
    {
      /*
       * The one line here a competitor cannot write without rebuilding the
       * same separation between copied facts and generated wording — and it
       * used to be half of "Matched keywords and missing requirements": two
       * deliverables crammed into one row, third of four, in the same muted
       * grey as "Tailored resume, as Word or PDF", which every résumé tool on
       * the internet also offers.
       *
       * It gets its own row and the emphasis the count above it already had.
       * Weight rather than position: it reads better as the second half of
       * the in/out pair than above it, and a bold line among muted ones wins
       * a scan regardless of where it sits.
       *
       * Present on both plans, deliberately. It is what the product is, not
       * what the paid tier buys, and pretending otherwise to sell Pro would
       * be exactly the kind of claim this row exists to avoid.
       */
      label: (
        <>
          <strong className="font-medium text-ink">
            The requirements your profile does not cover
          </strong>
        </>
      ),
      included: true,
    },
    {
      /*
       * On both plans. The paid boundary is volume alone now — three
       * applications against a hundred — so a free visitor can try the whole
       * product rather than being sold the half of it they cannot see.
       */
      label: "Cover letters, in English, Russian or Spanish",
      included: true,
    },
  ];
}

/**
 * The plan name, and on Pro the badge beside it. The min-height is still here
 * because the subgrid rows are sized by content and this row's content is a
 * 20px label in one card and a 24px badge in the other; holding the floor at
 * the badge's height keeps the row from changing size when the badge is not
 * there to set it.
 */
const HEADER = "flex min-h-[1.5rem] items-center justify-between gap-3";

export function PricingCards({ plan }: { plan: PlanPricing }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 md:grid-rows-[auto_auto_auto_1fr_auto] md:gap-y-0">
        {/* ---- Free ---- */}
        <div className="card p-6 sm:p-7 md:row-span-5 md:grid md:grid-rows-subgrid">
          <div className={HEADER}>
            <p className="text-small font-semibold text-muted">Free</p>
          </div>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-figure font-semibold tracking-[-0.03em]">
              $0
            </span>
            <span className="text-small text-muted">forever</span>
          </p>

          <p className="hint mt-2">
            {FREE_GENERATIONS_PER_MONTH} applications in any {USAGE_WINDOW_DAYS}{" "}
            days. No card required.
          </p>

          <ul className="mt-6 space-y-2.5">
            {rows("free").map((row, i) => (
              <Line key={i} included={row.included}>
                {row.label}
              </Line>
            ))}
          </ul>

          <StartLink className="mt-7 flex h-11 w-full items-center justify-center self-end rounded-md border border-faint bg-paper px-6 text-body font-medium text-ink transition-colors hover:border-ink hover:bg-surface">
            Start free
          </StartLink>
        </div>

        {/* ---- Pro ---- */}
        <div className="card-raised border-accent-line p-6 sm:p-7 md:row-span-5 md:grid md:grid-rows-subgrid">
          <div className={HEADER}>
            <p className="text-small font-semibold text-accent-text">Pro</p>
            <Badge tone="accent">For an active search</Badge>
          </div>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-figure font-semibold tracking-[-0.03em]">
              {plan.price}
            </span>
            <span className="text-small text-muted">per {plan.period}</span>
          </p>

          {/*
            "with cover letters" used to sit here as the thing Pro bought. It
            is on both plans now, so naming it as a Pro feature would be a
            claim the card below it contradicts.
          */}
          <p className="hint mt-2">
            {PRO_GENERATIONS_PER_MONTH} applications in any {USAGE_WINDOW_DAYS}{" "}
            days. Cancel any time.
          </p>

          <ul className="mt-6 space-y-2.5">
            {rows("pro").map((row, i) => (
              <Line key={i} included={row.included}>
                {row.label}
              </Line>
            ))}
          </ul>

          <StartLink
            plan="pro"
            className="mt-7 flex h-11 w-full items-center justify-center self-end rounded-md bg-accent px-6 text-body font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
          >
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
