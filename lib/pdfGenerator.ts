import path from "path";
import PDFDocument from "pdfkit";
import type { PersonalInformation, TailoredResume } from "./types";

/**
 * Builds the PDF version, mirroring lib/docxGenerator.ts section for section.
 *
 * Same order, same centred name and headline, same caps headings with a
 * hairline rule beneath, same bulleted skills and roles. Sizes are the docx
 * half-point values halved, so the two documents read alike.
 *
 * Everything is real, selectable text in a single column: no tables, no text
 * boxes, no images. That is what keeps an ATS able to parse it.
 *
 * DejaVu Sans is embedded rather than using PDF's built-in Helvetica, because
 * Helvetica is a single-byte WinAnsi font — a Cyrillic name silently renders
 * as mojibake. DejaVu covers Latin, Cyrillic and Greek.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const REGULAR = path.join(FONT_DIR, "DejaVuSans.ttf");
const BOLD = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");

const INK = "#1A1A1A";
const GREY = "#4A4A4A";
const RULE = "#BFBFBF";

// Points, matching the docx half-point sizes.
const S_NAME = 20;
const S_HEADLINE = 12;
const S_CONTACT = 9.5;
const S_SECTION = 11;
const S_BODY = 10.5;
const S_SMALL = 9.5;
const S_EXTRA = 10;

const MARGIN = { top: 43, bottom: 43, left: 50, right: 50 }; // 0.6in / 0.7in

export async function generatePdf(
  resume: TailoredResume,
  person: PersonalInformation,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: MARGIN,
    info: {
      Title: `${person.full_name} - Resume`,
      Author: person.full_name,
    },
  });

  doc.registerFont("body", REGULAR);
  doc.registerFont("bold", BOLD);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const finished = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  const width = doc.page.width - MARGIN.left - MARGIN.right;

  /** Caps heading with the hairline rule under it. */
  const heading = (text: string) => {
    doc.moveDown(0.7);
    doc
      .font("bold")
      .fontSize(S_SECTION)
      .fillColor(INK)
      .text(text.toUpperCase(), { align: "left" });

    const y = doc.y + 2;
    doc
      .moveTo(MARGIN.left, y)
      .lineTo(MARGIN.left + width, y)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke();

    doc.moveDown(0.45);
  };

  /** A bulleted line, hanging-indented so wrapped text lines up. */
  const bullet = (
    render: () => void,
    size = S_SMALL,
  ) => {
    const x = doc.x;
    doc.font("body").fontSize(size).fillColor(INK).text("•", x + 4, doc.y, {
      continued: false,
      width: 10,
    });
    doc.moveUp();
    doc.x = x + 16;
    render();
    doc.x = x;
    doc.moveDown(0.15);
  };

  // ---- Name, headline, contact --------------------------------------------
  doc
    .font("bold")
    .fontSize(S_NAME)
    .fillColor(INK)
    .text(person.full_name.toUpperCase(), { align: "center" });

  if (resume.headline) {
    doc.moveDown(0.25);
    doc
      .font("bold")
      .fontSize(S_HEADLINE)
      .text(resume.headline, { align: "center" });
  }

  const line1 = [person.location, person.phone, person.email]
    .filter(Boolean)
    .join(" | ");

  if (line1) {
    doc.moveDown(0.3);
    doc
      .font("body")
      .fontSize(S_CONTACT)
      .fillColor(GREY)
      .text(line1, { align: "center" });
  }

  const links = [
    person.linkedin ? `LinkedIn: ${person.linkedin}` : "",
    ...(person.additional_contacts ?? []).map((c) => `${c.label}: ${c.value}`),
  ].filter(Boolean);

  if (links.length) {
    doc.moveDown(0.15);
    doc
      .font("body")
      .fontSize(S_CONTACT)
      .fillColor(GREY)
      .text(links.join(" | "), { align: "center" });
  }

  doc.moveDown(0.3);

  // ---- Summary -------------------------------------------------------------
  if (resume.summary) {
    heading("Summary");
    doc
      .font("body")
      .fontSize(S_BODY)
      .fillColor(INK)
      .text(resume.summary, { align: "left", lineGap: 1.5 });
  }

  // ---- Technical skills ----------------------------------------------------
  if (resume.technical_skills?.length) {
    heading("Technical Skills");
    for (const group of resume.technical_skills) {
      if (!group.items?.length) continue;
      bullet(() => {
        doc
          .font("bold")
          .fontSize(S_SMALL)
          .fillColor(INK)
          .text(`${group.category}: `, { continued: true })
          .font("body")
          .text(group.items.join(", "));
      });
    }
  }

  // ---- Work experience -----------------------------------------------------
  if (resume.experience?.length) {
    heading("Work Experience");
    for (const role of resume.experience) {
      doc.moveDown(0.3);
      doc.font("bold").fontSize(S_BODY).fillColor(INK).text(role.title);

      const meta = [
        [role.company, role.location].filter(Boolean).join(" - "),
        `${role.start_date} – ${role.end_date}`,
      ]
        .filter(Boolean)
        .join(" | ");

      doc.font("body").fontSize(S_SMALL).fillColor(GREY).text(meta);
      doc.moveDown(0.2);

      for (const b of role.bullets ?? []) {
        bullet(() => {
          doc
            .font("body")
            .fontSize(S_SMALL)
            .fillColor(INK)
            .text(b, { lineGap: 1 });
        });
      }
    }
  }

  // ---- Education -----------------------------------------------------------
  if (resume.education?.length) {
    heading("Education");
    for (const ed of resume.education) {
      doc.moveDown(0.3);

      const label = [
        ed.institution,
        [ed.degree, ed.field_of_study].filter(Boolean).join(" in "),
      ]
        .filter(Boolean)
        .join(" - ");

      doc.font("bold").fontSize(S_BODY).fillColor(INK).text(label);

      const years = [ed.start_date, ed.end_date].filter(Boolean).join(" - ");
      if (years) {
        doc.font("body").fontSize(S_SMALL).fillColor(GREY).text(years);
      }

      for (const detail of ed.details ?? []) {
        doc.moveDown(0.15);
        doc
          .font("body")
          .fontSize(S_BODY)
          .fillColor(INK)
          .text(detail, { lineGap: 1.5 });
      }
    }
  }

  // ---- Additional information ---------------------------------------------
  const hasLanguages = (resume.languages?.length ?? 0) > 0;
  const hasInterests = (resume.interests?.length ?? 0) > 0;
  const hasCerts = (resume.certifications?.length ?? 0) > 0;

  if (hasLanguages || hasInterests || hasCerts) {
    heading("Additional Information");

    const labelled = (label: string, value: string) =>
      bullet(() => {
        doc
          .font("bold")
          .fontSize(S_EXTRA)
          .fillColor(INK)
          .text(`${label}: `, { continued: true })
          .font("body")
          .text(value);
      }, S_EXTRA);

    if (hasLanguages) {
      labelled(
        "Languages",
        resume.languages
          .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
          .join(", "),
      );
    }

    if (hasCerts) {
      labelled(
        "Certifications",
        (resume.certifications ?? [])
          .map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", "))
          .join("; "),
      );
    }

    if (hasInterests) {
      labelled("Interests", resume.interests.join(", "));
    }
  }

  doc.end();
  await finished;

  return Buffer.concat(chunks);
}
