import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import type { PersonalInformation, TailoredResume } from "./types";

/**
 * Builds the Word version, matching the master template exactly.
 *
 * Layout, fonts and sizes are lifted from the source .docx:
 *   name 20pt bold centred / headline 12pt bold centred / contact 9.5pt
 *   section headings 11pt bold with a hairline rule
 *   job titles bold 10.5pt / company lines 9.5pt / bullets 9.5pt
 *   Additional Information 10pt with bold labels
 *
 * Everything is single-column plain text: no tables, no text boxes, no
 * headers or footers. Those are what make an ATS drop half a resume.
 */

const FONT = "Calibri";
const INK = "1A1A1A";
const GREY = "4A4A4A";

// docx measures in half-points: 21 = 10.5pt.
const S_NAME = 40; // 20pt
const S_HEADLINE = 24; // 12pt
const S_CONTACT = 19; // 9.5pt
const S_SECTION = 22; // 11pt
const S_BODY = 21; // 10.5pt
const S_SMALL = 19; // 9.5pt
const S_EXTRA = 20; // 10pt

function run(text: string, opts: Partial<{ bold: boolean; size: number; color: string }> = {}) {
  return new TextRun({
    text,
    bold: opts.bold ?? false,
    size: opts.size ?? S_BODY,
    color: opts.color ?? INK,
    font: FONT,
  });
}

function centred(text: string, size: number, bold = false, color = INK, after = 20) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after },
    children: [run(text, { bold, size, color })],
  });
}

/** Section heading in caps with the rule beneath it. */
function heading(text: string) {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF", space: 2 },
    },
    children: [run(text.toUpperCase(), { bold: true, size: S_SECTION })],
  });
}

function bullet(text: string, size = S_SMALL) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 20, line: 252 },
    indent: { left: convertInchesToTwip(0.22), hanging: convertInchesToTwip(0.14) },
    children: [run(text, { size })],
  });
}

export async function generateDocx(
  resume: TailoredResume,
  person: PersonalInformation,
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // ---- Name, headline, contact --------------------------------------------
  children.push(centred(person.full_name.toUpperCase(), S_NAME, true, INK, 40));

  if (resume.headline) {
    children.push(centred(resume.headline, S_HEADLINE, true, INK, 20));
  }

  const line1 = [person.location, person.phone, person.email]
    .filter(Boolean)
    .join(" | ");
  if (line1) children.push(centred(line1, S_CONTACT, false, GREY, 20));

  // LinkedIn first, then whatever else was entered, each printed with the
  // label exactly as typed: "Telegram: @handle".
  const links = [
    person.linkedin ? `LinkedIn: ${person.linkedin}` : "",
    ...(person.additional_contacts ?? []).map((c) => `${c.label}: ${c.value}`),
  ].filter(Boolean);

  if (links.length) {
    children.push(centred(links.join(" | "), S_CONTACT, false, GREY, 120));
  }

  // ---- Summary -------------------------------------------------------------
  if (resume.summary) {
    children.push(heading("Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 40, line: 252 },
        children: [run(resume.summary, { size: S_BODY })],
      }),
    );
  }

  // ---- Technical skills ----------------------------------------------------
  if (resume.technical_skills?.length) {
    children.push(heading("Technical Skills"));
    for (const group of resume.technical_skills) {
      if (!group.items?.length) continue;
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20, line: 252 },
          indent: {
            left: convertInchesToTwip(0.22),
            hanging: convertInchesToTwip(0.14),
          },
          children: [
            run(`${group.category}: `, { bold: true, size: S_SMALL }),
            run(group.items.join(", "), { size: S_SMALL }),
          ],
        }),
      );
    }
  }

  // ---- Work experience -----------------------------------------------------
  if (resume.experience?.length) {
    children.push(heading("Work Experience"));
    for (const role of resume.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 0 },
          children: [run(role.title, { bold: true, size: S_BODY })],
        }),
      );

      const meta = [
        [role.company, role.location].filter(Boolean).join(" - "),
        `${role.start_date} \u2013 ${role.end_date}`,
      ]
        .filter(Boolean)
        .join(" | ");

      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [run(meta, { size: S_SMALL, color: GREY })],
        }),
      );

      for (const b of role.bullets ?? []) children.push(bullet(b));
    }
  }

  // ---- Education -----------------------------------------------------------
  if (resume.education?.length) {
    children.push(heading("Education"));
    for (const ed of resume.education) {
      const label = [ed.institution, [ed.degree, ed.field_of_study].filter(Boolean).join(" in ")]
        .filter(Boolean)
        .join(" - ");

      children.push(
        new Paragraph({
          spacing: { before: 100, after: 0 },
          children: [run(label, { bold: true, size: S_BODY })],
        }),
      );

      const years = [ed.start_date, ed.end_date].filter(Boolean).join(" - ");
      if (years) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [run(years, { size: S_SMALL, color: GREY })],
          }),
        );
      }

      for (const detail of ed.details ?? []) {
        children.push(
          new Paragraph({
            spacing: { after: 40, line: 252 },
            children: [run(detail, { size: S_BODY })],
          }),
        );
      }
    }
  }

  // ---- Additional information ---------------------------------------------
  const hasLanguages = resume.languages?.length > 0;
  const hasInterests = resume.interests?.length > 0;
  const hasCerts = (resume.certifications?.length ?? 0) > 0;

  if (hasLanguages || hasInterests || hasCerts) {
    children.push(heading("Additional Information"));

    if (hasLanguages) {
      const langs = resume.languages
        .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
        .join(", ");
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          indent: {
            left: convertInchesToTwip(0.22),
            hanging: convertInchesToTwip(0.14),
          },
          children: [
            run("Languages: ", { bold: true, size: S_EXTRA }),
            run(langs, { size: S_EXTRA }),
          ],
        }),
      );
    }

    if (hasCerts) {
      const certs = (resume.certifications ?? [])
        .map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", "))
        .join("; ");
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          indent: {
            left: convertInchesToTwip(0.22),
            hanging: convertInchesToTwip(0.14),
          },
          children: [
            run("Certifications: ", { bold: true, size: S_EXTRA }),
            run(certs, { size: S_EXTRA }),
          ],
        }),
      );
    }

    if (hasInterests) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          indent: {
            left: convertInchesToTwip(0.22),
            hanging: convertInchesToTwip(0.14),
          },
          children: [
            run("Interests: ", { bold: true, size: S_EXTRA }),
            run(resume.interests.join(", "), { size: S_EXTRA }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    creator: person.full_name,
    title: `${person.full_name} - Resume`,
    styles: {
      default: {
        document: { run: { font: FONT, size: S_BODY, color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
