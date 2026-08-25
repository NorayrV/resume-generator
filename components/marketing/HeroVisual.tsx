/*
 * impeccable-disable design-system-font-size -- A miniature of the finished
 * resume, drawn at roughly a third of document scale. Its type sizes are
 * proportions of that drawing, not steps on the app's ramp. See DESIGN.md,
 * Typography.
 */
import { ArrowRight, Check, X } from "lucide-react";

/**
 * The hero's product demonstration: posting in, application out.
 *
 * Deliberately built from divs rather than a screenshot. A PNG of the app
 * would be another 200 kB to download, would blur on a retina display, and
 * would go stale the first time the resume layout changed. This is ~2 kB of
 * markup, stays sharp, and is real text — so it is selectable, translatable
 * and readable by a screen reader.
 *
 * The right-hand sheet mirrors components/ResumePreview.tsx: centred name,
 * caps headings with a rule beneath. Someone who signs up should recognise
 * what they saw here.
 *
 * The content is illustrative, and labelled as such for assistive tech — it
 * is not a real person's resume and is not one of the app's own outputs.
 */

/** Requirements as they appear in the posting, and how the profile answers. */
const REQUIREMENTS = [
  { label: "SQL", covered: true },
  { label: "Python", covered: true },
  { label: "Dashboards", covered: true },
  { label: "Power BI", covered: false },
];

export function HeroVisual() {
  return (
    <div
      className="relative"
      role="img"
      aria-label="Illustration: a job posting is pasted in, and cvmaxxing returns a tailored resume, the requirements it matched, and the one requirement the profile does not cover."
    >
      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1.25fr] lg:gap-4">
        {/* ---------- In: the posting ---------- */}
        <div className="card overflow-hidden" aria-hidden>
          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-faint" />
            <p className="text-micro font-medium text-muted">Job posting</p>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <p className="text-small font-semibold text-ink">
                Financial Analyst
              </p>
              <p className="text-micro text-faint">Northwind Group · Berlin</p>
            </div>

            {/* Body text as rules, so the eye goes to the requirements. */}
            <div className="space-y-1.5">
              <span className="block h-1.5 w-full rounded-full bg-line-soft" />
              <span className="block h-1.5 w-[92%] rounded-full bg-line-soft" />
              <span className="block h-1.5 w-[74%] rounded-full bg-line-soft" />
            </div>

            <div>
              <p className="text-micro font-medium text-muted">Requirements</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {REQUIREMENTS.map((r) => (
                  <span
                    key={r.label}
                    className="rounded border border-line bg-surface px-1.5 py-0.5 text-micro text-muted"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Through: the product ---------- */}
        {/*
          The connector has to follow the layout: the cards stack vertically
          until `lg`, where they sit side by side. So it runs down the page on
          a phone and across it on a desktop, and the arrow turns with it.
        */}
        <div
          className="flex flex-col items-center justify-center gap-2 lg:flex-row"
          aria-hidden
        >
          <span className="h-6 w-px bg-line lg:h-px lg:w-8" />
          <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-faint lg:rotate-0" />
          <span className="h-6 w-px bg-line lg:h-px lg:w-8" />
        </div>

        {/* ---------- Out: the application ---------- */}
        <div className="space-y-3" aria-hidden>
          {/* The sheet, styled like the real preview. */}
          <div className="card-raised overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
              <p className="text-micro font-medium text-ink">Your resume</p>
              <div className="flex gap-1">
                <span className="rounded border border-line px-1.5 py-0.5 text-micro text-muted">
                  PDF
                </span>
                <span className="rounded border border-line px-1.5 py-0.5 text-micro text-muted">
                  Word
                </span>
              </div>
            </div>

            {/*
              The sheet itself, in document colours rather than theme ones —
              it stays white when the page goes dark, exactly as the real
              preview does, because that is what the exported file looks like.
            */}
            <div className="bg-doc-paper px-5 py-4">
              {/*
                Not "Jane Doe". This is the first name a visitor reads, in the
                one element that shows what the product actually makes, and
                PRODUCT.md puts people applying abroad with names that
                Latin-only tooling handles badly at the top of the audience
                list. A Cyrillic name renders in Inter here because the font
                already loads the cyrillic subset for the Russian cover
                letters, so the demo proves a capability rather than just
                avoiding a cliché.
              */}
              <p className="text-center text-[0.8125rem] font-bold uppercase tracking-[0.02em] text-doc-ink">
                Марина Ковач
              </p>
              {/* The headline is rewritten per posting — the visible tailoring. */}
              <p className="mt-0.5 text-center text-micro font-bold text-doc-accent">
                Financial Analyst
              </p>

              <div className="mt-4 space-y-3">
                <Block heading="Summary" lines={["100%", "88%"]} />
                <Block
                  heading="Technical Skills"
                  chips={["SQL", "Python", "Tableau"]}
                />
                <Block
                  heading="Work Experience"
                  role="Data Analyst · Halvard Bank"
                  lines={["100%", "94%", "70%"]}
                />
              </div>
            </div>
          </div>

          {/* The two readouts that make the tailoring checkable. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-3">
              <p className="flex items-center gap-1.5 text-micro font-medium text-ink">
                <Check className="h-3 w-3 text-good" />
                Matched from the posting
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {REQUIREMENTS.filter((r) => r.covered).map((r) => (
                  <span
                    key={r.label}
                    className="rounded border border-good/20 bg-good-soft px-1.5 py-0.5 text-micro text-good"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-3">
              <p className="flex items-center gap-1.5 text-micro font-medium text-ink">
                <X className="h-3 w-3 text-flag" />
                Not in your profile
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {REQUIREMENTS.filter((r) => !r.covered).map((r) => (
                  <span
                    key={r.label}
                    className="rounded border border-flag/20 bg-flag-soft px-1.5 py-0.5 text-micro text-flag"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** One section of the mock sheet: caps heading, then rules or chips. */
function Block({
  heading,
  lines,
  chips,
  role,
}: {
  heading: string;
  lines?: string[];
  chips?: string[];
  role?: string;
}) {
  return (
    <div>
      <p className="border-b border-doc-ink/30 pb-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-doc-ink">
        {heading}
      </p>

      {role && (
        <p className="mt-1 text-[0.625rem] font-semibold text-doc-ink">{role}</p>
      )}

      {/*
        Chips use --doc-accent, not the themed --accent. These sit on the
        sheet, which stays white in both themes, so they need the darker blue
        that reads on white rather than the lifted one that reads on a dark
        page.
      */}
      {chips && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded bg-doc-accent/10 px-1.5 py-0.5 text-[0.625rem] font-medium text-doc-accent"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {lines && (
        <div className="mt-1.5 space-y-1">
          {lines.map((w, i) => (
            <span
              key={i}
              className="block h-1 rounded-full bg-doc-line/50"
              style={{ width: w }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
