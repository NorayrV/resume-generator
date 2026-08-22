import { ChevronDown } from "lucide-react";
import {
  FREE_GENERATIONS_PER_MONTH,
  MAX_JOB_DESCRIPTION_CHARS,
  USAGE_WINDOW_DAYS,
} from "@/lib/plan";

/**
 * The questions a visitor actually stops on before signing up.
 *
 * Every answer here is checkable against the code — the file limits, what is
 * stored, what the model is and is not allowed to write. Nothing is softened
 * to sound better: the honest answer to "is it ATS-friendly" is that no tool
 * can promise a score, and saying so is worth more than a claim a reader has
 * already seen on five other sites.
 *
 * Native <details> rather than a state hook: it is keyboard accessible and
 * announced correctly with no JavaScript at all, and this page should not
 * ship a bundle to open an accordion.
 */

const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Will it invent experience I do not have?",
    a: (
      <>
        No. Employers, job titles, dates and education are copied straight from
        your profile and never passed to the model as something to write, so
        they cannot drift. The model rewrites how your real experience is
        presented for the role. The one case worth knowing: if you leave a
        role&apos;s description blank, it drafts bullets from the job title and
        your skills — and labels them on screen so you can correct them.
      </>
    ),
  },
  {
    q: "Is the result ATS-friendly?",
    a: (
      <>
        The internet calls this ATSMAXXING, and most of what gets promised
        under that name is not real. What is real: the files are plain,
        single-column Word and PDF documents with standard headings and no
        tables, columns or graphics — the formatting that parsers read
        reliably. Keywords come from the posting itself. What no tool can
        honestly promise is a particular score in a particular system: there
        are dozens of them, they are private, and they change without notice.
      </>
    ),
  },
  {
    q: "What exactly do I get?",
    a: (
      <>
        On any plan: a resume tailored to the posting, downloadable as Word
        or PDF; the keywords from the posting that made it into your resume;
        and a list of requirements your profile does not cover. That last one
        is the part most tools leave out. Tailored cover letters are part of
        Pro.
      </>
    ),
  },
  {
    q: "Do I have to pay to try it?",
    a: (
      <>
        No. {FREE_GENERATIONS_PER_MONTH} applications in any {USAGE_WINDOW_DAYS}{" "}
        days, no card, no trial timer. You only pay if you are applying often
        enough to run out.
      </>
    ),
  },
  {
    q: "What happens to my data?",
    a: (
      <>
        Your profile is private to your account and enforced by the database
        itself, not just by our code. Uploaded files are read in memory and
        discarded — only the extracted text is kept. Your profile goes to the
        AI provider at the moment you press the button, and at no other time.
        Nothing is sold or shared. The{" "}
        <a
          href="/privacy"
          className="text-accent-text underline-offset-2 hover:underline"
        >
          privacy page
        </a>{" "}
        spells it out.
      </>
    ),
  },
  {
    q: "How long does it take?",
    a: (
      <>
        Setting up your profile takes a few minutes once — or seconds if you
        upload an existing resume and let it fill the fields. After that, each
        application takes under a minute: paste the posting (up to{" "}
        {MAX_JOB_DESCRIPTION_CHARS.toLocaleString()} characters) and the
        documents come back ready to download.
      </>
    ),
  },
];

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
      {ITEMS.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-body font-medium text-ink transition-colors hover:text-accent-text">
            {q}
            <ChevronDown
              className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="max-w-prose pb-5 pr-8 text-small leading-[1.7] text-muted">
            {a}
          </p>
        </details>
      ))}
    </div>
  );
}
