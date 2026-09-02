import Link from "next/link";
import { HelpCircle } from "lucide-react";
import type { OpenQuestion } from "@/lib/types";

/**
 * Numbers the resume would be stronger for, that the profile does not hold.
 *
 * A bullet with a figure in it beats the same bullet without one, and most
 * people have the figures — they just did not think to write them down when
 * they filled in a profile. The model is forbidden from inventing them, so
 * where it wants one and cannot find it, it writes the bullet plainly and
 * asks here instead.
 *
 * Sits below the documents rather than above them. The resume is what the
 * user waited for; this is about the next one, and it is placed next to the
 * button that makes the next one.
 *
 * The link goes to the profile, because that is where an answer belongs. A
 * number typed into this screen would improve one document and be lost;
 * typed into the profile it improves every application from here on.
 *
 * Rendered once per page: the heading id is fixed, so two of these would
 * collide. That is the only use there is — a generation produces one set.
 */
export function OpenQuestions({ questions }: { questions: OpenQuestion[] }) {
  if (questions.length === 0) return null;

  const one = questions.length === 1;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="open-questions">
      <h2
        id="open-questions"
        className="flex items-center gap-2 text-small font-semibold"
      >
        <HelpCircle className="h-4 w-4 text-accent-text" aria-hidden />
        {one ? "One number would make this stronger" : `${questions.length} numbers would make this stronger`}
      </h2>

      <p className="hint mt-1.5 max-w-prose">
        {one ? "This bullet was" : "These bullets were"} written without a
        figure because your profile does not have one. Nothing was invented to
        fill the gap.
      </p>

      <ul className="mt-4 space-y-2.5">
        {questions.map((q, i) => (
          <li key={`${q.company}-${q.bullet_index}-${i}`} className="flex gap-2.5">
            <span
              className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            <p className="text-small">
              {q.question}{" "}
              {/* Which role it is about, so a question about one employer is
                  not read as a question about the whole career. */}
              {q.company && (
                <span className="text-faint">— {q.company}</span>
              )}
            </p>
          </li>
        ))}
      </ul>

      <p className="hint mt-4 max-w-prose">
        Answering {one ? "it" : "them"} means adding the figure to{" "}
        <Link
          href="/profile"
          className="font-medium text-accent-text underline-offset-2 hover:underline"
        >
          your profile
        </Link>{" "}
        and generating again — so it is worth doing once, before the next batch
        of applications, rather than for this one alone.
      </p>
    </section>
  );
}
