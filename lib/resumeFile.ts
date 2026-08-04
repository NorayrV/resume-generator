import "server-only";

/**
 * Turns an uploaded resume file into plain text.
 *
 * Only the text extraction lives here — no AI. The text then goes through the
 * same EXTRACT_SYSTEM_PROMPT the paste box has always used, so a file upload
 * and a paste produce identical profiles and there is one parser to maintain.
 *
 * The two extractors are imported dynamically. Whichever format the user did
 * not upload never gets loaded, which keeps the serverless function's cold
 * start down.
 */

/** Refused above this. Comfortably above any real resume, including scans. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Hard ceiling on what reaches the model. A resume is a page or two — anything
 * beyond this is a book, a merged PDF, or someone probing what the API will
 * swallow, and every character is billed to our DeepSeek key.
 */
export const MAX_TEXT_CHARS = 20_000;

/** Below this there is nothing worth parsing. Matches the paste box's floor. */
const MIN_TEXT_CHARS = 120;

export type ResumeFileKind = "pdf" | "docx";

/** What the file picker offers, and what the error messages name. */
export const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** A refusal we are happy to show the user verbatim. */
export class ResumeFileError extends Error {
  constructor(
    message: string,
    readonly status: number = 422,
  ) {
    super(message);
    this.name = "ResumeFileError";
  }
}

/**
 * Identify the file from its leading bytes rather than its name.
 *
 * Browsers report the DOCX MIME type inconsistently — sometimes the full
 * openxmlformats string, sometimes application/zip, sometimes nothing at all —
 * and a filename is only a suggestion. The magic number is the one signal a
 * caller cannot get wrong by accident or on purpose.
 */
function sniff(bytes: Uint8Array): ResumeFileKind {
  const startsWith = (sig: number[]) =>
    sig.every((byte, i) => bytes[i] === byte);

  // "%PDF"
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "pdf";

  // "PK\x03\x04" — a zip, which is what a .docx is.
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) return "docx";

  // The OLE2 container used by pre-2007 .doc files. Worth naming explicitly,
  // because "unsupported file" would leave someone with an old resume
  // guessing at what to do about it.
  if (startsWith([0xd0, 0xcf, 0x11, 0xe0])) {
    throw new ResumeFileError(
      "That looks like an old .doc file. Open it in Word or Google Docs, save it as .docx or PDF, then upload again.",
    );
  }

  throw new ResumeFileError(
    "That file is not a PDF or a Word document. Upload a .pdf or .docx.",
  );
}

/**
 * Tidy extracted text before it costs tokens.
 *
 * PDF extraction in particular produces ragged spacing, exotic Unicode spaces
 * and stray blank lines — harmless to read, but the model is billed for every
 * one of them.
 */
function tidy(raw: string): string {
  return (
    raw
      .replace(/\r\n?/g, "\n")
      // Non-breaking and typographic spaces become ordinary ones.
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      // Zero-width characters carry no meaning here.
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Control characters survive extraction and are pure noise.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      // Three or more blank lines carry no more meaning than one.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function fromPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  try {
    const document = await getDocumentProxy(bytes);
    const { text } = await extractText(document, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text ?? "");
  } catch {
    throw new ResumeFileError(
      "That PDF could not be opened. It may be password protected or damaged. Try exporting it again, or paste the text instead.",
    );
  }
}

async function fromDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = (await import("mammoth")).default;

  try {
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    return value ?? "";
  } catch {
    throw new ResumeFileError(
      "That Word file could not be read. Open it and re-save it as .docx, then try again.",
    );
  }
}

export interface ExtractedResume {
  text: string;
  kind: ResumeFileKind;
  /** True when the resume was longer than MAX_TEXT_CHARS and text was cut. */
  truncated: boolean;
}

/**
 * Read an uploaded file into resume text.
 *
 * Throws ResumeFileError with a message written for the person who uploaded
 * the file — every failure here is something they can act on.
 */
export async function extractResumeText(file: File): Promise<ExtractedResume> {
  if (file.size === 0) {
    throw new ResumeFileError("That file is empty.");
  }

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ResumeFileError(
      `That file is ${mb} MB. Upload a resume under ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);

  const extracted =
    kind === "pdf" ? await fromPdf(bytes) : await fromDocx(bytes);
  const text = tidy(extracted);

  if (text.length < MIN_TEXT_CHARS) {
    // Overwhelmingly this is a scan: a photo of a resume in a PDF wrapper,
    // which has no text layer at all. Say so, rather than "too short".
    throw new ResumeFileError(
      kind === "pdf"
        ? "No text could be read from that PDF — it looks like a scan or an image. Export a text PDF from Word or Google Docs, or paste your resume as text instead."
        : "That document has almost no text in it. Check you uploaded the right file.",
    );
  }

  return {
    text: text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text,
    kind,
    truncated: text.length > MAX_TEXT_CHARS,
  };
}
