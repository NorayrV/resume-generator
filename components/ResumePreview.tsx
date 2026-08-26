"use client";

/*
 * impeccable-disable design-system-font-size -- This component draws a
 * reduced-scale picture of the Word/PDF file the user is about to send, so its
 * type is set in the proportions of a printed résumé rather than on the app's
 * ramp. Same exception the --doc-* palette makes: see DESIGN.md, Typography.
 */

import { formatDateRange } from "@/lib/utils";
import type { PersonalInformation, TailoredResume } from "@/lib/types";

/**
 * What the Word file will look like, on screen.
 *
 * Everything inside the sheet uses the doc-* colours, which do not follow the
 * app theme. In dark mode the page around it goes dark and the sheet stays
 * white, because the Word and PDF files the user is about to send are black
 * on white either way — showing them a dark resume would be showing them
 * something they are not going to get.
 *
 * This mirrors lib/docxGenerator.ts section for section — same order, same
 * centred name and headline, same caps headings with a rule under them, same
 * bulleted skills and roles. It is a reading proof, not a pixel-exact render:
 * the page is shown at screen sizes, in the app's own type, so it stays
 * readable. Anything that changes in the generator should change here too.
 */

interface Props {
  resume: TailoredResume;
  person: PersonalInformation;
  /**
   * Roles whose bullets the model wrote, because the profile had none.
   *
   * Marked in place rather than only named in the banner above. The banner
   * used to assert a role title and leave the reader to find it by hand in a
   * document with no anchors — a memory task, on the one screen that exists
   * for checking.
   */
  draftedRoles?: string[];
}

/** Stable anchor for a role, so the drafted-roles banner can point at it. */
export function roleAnchor(title: string): string {
  return `role-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** Caps heading with the hairline rule, matching heading() in the generator. */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 border-b border-doc-ink/40 pb-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-doc-ink">
      {children}
    </h3>
  );
}

/** A bulleted line, matching bullet() in the generator. */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[0.75rem] leading-[1.5] text-doc-ink">
      <span className="text-doc-ink" aria-hidden>
        •
      </span>
      <span>{children}</span>
    </li>
  );
}

export function ResumePreview({ resume, person, draftedRoles = [] }: Props) {
  const contactLine = [person.location, person.phone, person.email]
    .filter(Boolean)
    .join("  |  ");

  const links = [
    person.linkedin ? `LinkedIn: ${person.linkedin}` : "",
    ...(person.additional_contacts ?? []).map((c) => `${c.label}: ${c.value}`),
  ].filter(Boolean);

  const hasAdditional =
    resume.languages?.length > 0 ||
    (resume.certifications?.length ?? 0) > 0;

  return (
    /* A sheet of paper: white, bordered, and scrollable once it runs long. */
    /*
      No inner scroller, and no fixed height.
      
      This used to be a 26rem window onto a document that measured 999px at
      1280 and 1308px at 375 — so it showed 41% and 32% of itself, with no
      fade, no page count, and overlay scrollbars that are invisible at rest.
      On the one screen whose stated instruction is "read it before you send
      it", a reader could believe they had read the document having seen a
      third of it.
      
      A long page is the correct shape for a long document. The page's own
      scroll now carries it, which also removes the need to make this a tab
      stop: it is ordinary content again, reachable the way text is.
    */
    <div className="rounded-md border border-doc-line bg-doc-paper px-5 py-5 sm:px-7">
      {/* ---- Name, headline, contact ---- */}
      <p className="text-center text-[1.05rem] font-bold uppercase tracking-[0.02em] text-doc-ink">
        {person.full_name}
      </p>

      {resume.headline && (
        <p className="mt-1 text-center text-[0.8125rem] font-bold text-doc-ink">
          {resume.headline}
        </p>
      )}

      {contactLine && (
        <p className="mt-1.5 text-center text-[0.6875rem] text-doc-muted">
          {contactLine}
        </p>
      )}

      {links.length > 0 && (
        <p className="mt-0.5 text-center text-[0.6875rem] text-doc-muted">
          {links.join("  |  ")}
        </p>
      )}

      <div className="mt-6 space-y-5">
        {/* ---- Summary ---- */}
        {resume.summary && (
          <section>
            <Heading>Summary</Heading>
            <p className="text-[0.75rem] leading-[1.55] text-doc-ink">
              {resume.summary}
            </p>
          </section>
        )}

        {/* ---- Technical skills ---- */}
        {resume.technical_skills?.length > 0 && (
          <section>
            <Heading>Technical Skills</Heading>
            <ul className="space-y-0.5">
              {resume.technical_skills.map((group) => (
                <Bullet key={group.category}>
                  <span className="font-semibold">{group.category}:</span>{" "}
                  {group.items.join(", ")}
                </Bullet>
              ))}
            </ul>
          </section>
        )}

        {/* ---- Work experience ---- */}
        {resume.experience?.length > 0 && (
          <section>
            <Heading>Work Experience</Heading>
            <div className="space-y-3">
              {resume.experience.map((role, i) => (
                <div key={`${role.company}-${i}`} id={roleAnchor(role.title)}>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] font-bold text-doc-ink">
                    {role.title}
                    {/*
                      An annotation, not document content — which is why it
                      wears the app's accent rather than doc ink, and why it
                      is worded as something the app did. Nothing here is in
                      the exported file, and the preview otherwise matches
                      that file field for field.
                    */}
                    {draftedRoles.includes(role.title) && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.04em] text-accent-text">
                        Written for you
                      </span>
                    )}
                  </p>
                  <p className="text-[0.6875rem] text-doc-muted">
                    {[
                      [role.company, role.location].filter(Boolean).join(" - "),
                      formatDateRange(role.start_date, role.end_date),
                    ]
                      .filter(Boolean)
                      .join("  |  ")}
                  </p>
                  {role.bullets?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {role.bullets.map((b, j) => (
                        <Bullet key={j}>{b}</Bullet>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Education ---- */}
        {resume.education?.length > 0 && (
          <section>
            <Heading>Education</Heading>
            <div className="space-y-3">
              {resume.education.map((ed, i) => (
                <div key={`${ed.institution}-${i}`}>
                  <p className="text-[0.8125rem] font-bold text-doc-ink">
                    {[
                      ed.institution,
                      [ed.degree, ed.field_of_study].filter(Boolean).join(" in "),
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                  {[ed.start_date, ed.end_date].filter(Boolean).length > 0 && (
                    <p className="text-[0.6875rem] text-doc-muted">
                      {[ed.start_date, ed.end_date].filter(Boolean).join(" - ")}
                    </p>
                  )}
                  {ed.details?.map((detail, j) => (
                    <p
                      key={j}
                      className="mt-1 text-[0.75rem] leading-[1.55] text-doc-ink"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Additional information ---- */}
        {hasAdditional && (
          <section>
            <Heading>Additional Information</Heading>
            <ul className="space-y-0.5">
              {resume.languages?.length > 0 && (
                <Bullet>
                  <span className="font-semibold">Languages:</span>{" "}
                  {resume.languages
                    .map(
                      (l) =>
                        `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`,
                    )
                    .join(", ")}
                </Bullet>
              )}

              {(resume.certifications?.length ?? 0) > 0 && (
                <Bullet>
                  <span className="font-semibold">Certifications:</span>{" "}
                  {(resume.certifications ?? [])
                    .map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", "))
                    .join("; ")}
                </Bullet>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
