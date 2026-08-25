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

/**
 * ...and the same question asked of one page.
 *
 * A whole-document floor cannot see a resume whose second page is a scan: page
 * one alone clears 120 characters, so the upload is accepted and page two is
 * dropped without a word. That is the worst failure this file can produce.
 * Everything else here either works or says why, but a half-read resume looks
 * exactly like a fully-read one, and the product's whole claim is that it
 * copies facts rather than inventing them.
 *
 * A real resume page runs to several hundred characters. A scanned one has
 * none. A page carrying nothing but a footer has a couple of dozen — and is
 * worth flagging too, because something was on it.
 */
const MIN_PAGE_CHARS = 40;

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

/**
 * A gap this wide, as a fraction of page width, is never a word space.
 *
 * Measured on a two-column resume at US Letter (612pt): the gutter between
 * the experience column and the skills sidebar came back as a single
 * whitespace item 232pt wide — 38% of the page. Ordinary word spacing at 10pt
 * is under 4pt. Anything past 10% is structural.
 */
const COLUMN_GAP_FRACTION = 0.1;

/** …and at least this many times the line's own height, so it scales with type. */
const COLUMN_GAP_LINES = 3;

/** Two items closer than this share a word boundary rather than a space. */
const WORD_GAP_RATIO = 0.2;

interface ReadPages {
  text: string;
  /** 1-based page numbers that came back with no usable text. */
  unreadable: number[];
  /**
   * Whether any page paints an image. Only meaningful — and only measured —
   * when there was too little text to use, because it is the difference
   * between two failures that look identical to the person uploading.
   */
  drawsImages: boolean;
}

interface Placed {
  str: string;
  x: number;
  y: number;
  right: number;
  height: number;
}

/**
 * Rebuild a page's text from where the glyphs actually sit.
 *
 * PDF.js hands back text items in content-stream order and joins them with
 * whatever whitespace item the producer emitted. On a single-column document
 * that is fine. On anything with a sidebar it is actively wrong: a row-based
 * layout engine writes the left cell, then the right cell, then moves down, so
 * the flat join produced lines like
 *
 *   "Financial Analyst, Ameriabank SQL"
 *   "Mar 2022 - Present Python"
 *
 * — the job title welded to a skill, the date range welded to another. That is
 * worse than ugly here. Employers, titles and dates are the facts this product
 * copies rather than writes, and anchorExperience will faithfully re-anchor a
 * title that was already corrupted before the model ever saw it.
 *
 * So: group items into visual lines by their baseline, walk each line left to
 * right, and break the line wherever the horizontal gap is too wide to be a
 * space. A break rather than a column-detection pass is deliberate. Detecting
 * columns means guessing whether a wide gap is a skills sidebar or a
 * right-aligned date, and guessing wrong either scatters the skills or strips
 * the dates off the roles. Breaking is right for both:
 *
 *   sidebar   →  "Financial Analyst, Ameriabank" / "SQL"
 *   date rail →  "Financial Analyst" / "Mar 2022 - Present"
 *
 * Neither loses a fact, and the second is exactly the shape the paste box's
 * own example uses.
 */
async function readByPosition(document: {
  numPages: number;
  getPage: (n: number) => Promise<unknown>;
}): Promise<ReadPages> {
  const pages: string[] = [];
  const unreadable: number[] = [];

  for (let n = 1; n <= document.numPages; n++) {
    const page = (await document.getPage(n)) as {
      getViewport: (o: { scale: number }) => { width: number };
      getTextContent: () => Promise<{ items: unknown[] }>;
    };

    const pageWidth = page.getViewport({ scale: 1 }).width;
    const { items } = await page.getTextContent();

    const placed: Placed[] = [];
    for (const raw of items) {
      const item = raw as {
        str?: unknown;
        width?: unknown;
        height?: unknown;
        transform?: unknown;
      };
      const str = typeof item.str === "string" ? item.str : "";
      // Whitespace-only items are dropped and the gap is measured from the
      // real glyphs instead — that spacer is the thing lying to us.
      if (!str.trim()) continue;
      if (!Array.isArray(item.transform) || item.transform.length < 6) continue;

      const x = Number(item.transform[4]);
      const y = Number(item.transform[5]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

      const width = Number(item.width);
      const height = Number(item.height);
      placed.push({
        str,
        x,
        y,
        right: x + (Number.isFinite(width) ? width : 0),
        height: Number.isFinite(height) && height > 0 ? height : 10,
      });
    }

    if (placed.length === 0) {
      unreadable.push(n);
      continue;
    }

    const medianHeight =
      [...placed].sort((a, b) => a.height - b.height)[
        Math.floor(placed.length / 2)
      ]?.height ?? 10;

    /* Same baseline, within half a line — PDF y grows upward. */
    const tolerance = Math.max(medianHeight * 0.5, 1);
    const lines: Placed[][] = [];
    for (const item of [...placed].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const line = lines[lines.length - 1];
      if (line && Math.abs(line[0].y - item.y) <= tolerance) line.push(item);
      else lines.push([item]);
    }

    const breakAt = Math.max(
      pageWidth * COLUMN_GAP_FRACTION,
      medianHeight * COLUMN_GAP_LINES,
    );
    const ordered = lines.map((line) => [...line].sort((a, b) => a.x - b.x));

    /*
     * Find the gutters, then apply them everywhere.
     *
     * A width threshold alone only catches the rows where the left column
     * happens to be short. On a row whose text runs most of the way to the
     * gutter the remaining gap is small, and that row welds back together —
     * measured on a sidebar layout, the two longest bullets kept their trailing
     * skill while the four short ones separated cleanly.
     *
     * So: the first pass records the x of every item that a wide gap already
     * proved to start a column, and the second pass breaks before anything that
     * begins at one of those x positions. A column start is evidence about the
     * whole page, not about the line it was noticed on. Two sightings are
     * required, so a single right-aligned page number does not invent a column.
     */
    const sightings: number[] = [];
    for (const line of ordered) {
      for (let i = 1; i < line.length; i++) {
        if (line[i].x - line[i - 1].right >= breakAt) sightings.push(line[i].x);
      }
    }

    const columnTolerance = pageWidth * 0.02;
    const columnStarts: number[] = [];
    for (const x of sightings.sort((a, b) => a - b)) {
      const last = columnStarts[columnStarts.length - 1];
      if (last !== undefined && Math.abs(last - x) <= columnTolerance) continue;
      if (sightings.filter((s) => Math.abs(s - x) <= columnTolerance).length >= 2) {
        columnStarts.push(x);
      }
    }

    const startsColumn = (x: number) =>
      columnStarts.some((start) => Math.abs(start - x) <= columnTolerance);

    const rendered: string[] = [];
    for (const line of ordered) {
      let text = line[0].str;

      for (let i = 1; i < line.length; i++) {
        const previous = line[i - 1];
        const current = line[i];
        const gap = current.x - previous.right;

        // A known column start still needs daylight in front of it, so text
        // that merely flows past that x keeps running.
        const atColumn =
          startsColumn(current.x) && gap > current.height * COLUMN_GAP_LINES;

        if (gap >= breakAt || atColumn) text += "\n";
        else if (gap > current.height * WORD_GAP_RATIO) text += " ";
        text += current.str;
      }
      rendered.push(text);
    }

    const body = rendered.join("\n");
    if (body.replace(/\s/g, "").length < MIN_PAGE_CHARS) unreadable.push(n);
    pages.push(body);
  }

  // Settled by fromPdf, and only when it turns out to matter.
  return { text: pages.join("\n\n"), unreadable, drawsImages: false };
}

/**
 * Does any page paint an image?
 *
 * Asked only when a PDF gave up almost no text, because the answer decides
 * which of two very different things we tell the user. A page carrying an
 * image and no text is a scan, and re-exporting will not help — the words are
 * pixels. A page carrying neither is a design-tool export with its text
 * converted to vector outlines, and telling that person to "export a text PDF
 * from Word" sends them somewhere they have never been; there is not even
 * anything for OCR to read.
 *
 * Walking the operator list parses every content stream, which is why this
 * runs only on the failure path, where the request is already lost.
 */
async function drawsImages(document: {
  numPages: number;
  getPage: (n: number) => Promise<unknown>;
}): Promise<boolean> {
  const { getResolvedPDFJS } = await import("unpdf");
  const { OPS } = await getResolvedPDFJS();

  const imageOps = new Set(
    [
      "paintImageXObject",
      "paintImageXObjectRepeat",
      "paintInlineImageXObject",
      "paintJpegXObject",
      "paintImageMaskXObject",
    ]
      .map((name) => (OPS as Record<string, number | undefined>)[name])
      .filter((op): op is number => op !== undefined),
  );

  for (let n = 1; n <= document.numPages; n++) {
    const page = (await document.getPage(n)) as {
      getOperatorList: () => Promise<{ fnArray: number[] }>;
    };
    const { fnArray } = await page.getOperatorList();
    for (const fn of fnArray) if (imageOps.has(fn)) return true;
  }

  return false;
}

async function fromPdf(bytes: Uint8Array): Promise<ReadPages> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  let document;
  try {
    document = await getDocumentProxy(bytes);
  } catch {
    throw new ResumeFileError(
      "That PDF could not be opened. It may be password protected or damaged. Try exporting it again, or paste the text instead.",
    );
  }

  /*
   * Position-aware first, PDF.js's own flat join as the net. The reader above
   * touches more of the API surface than extractText does, so a PDF that
   * confuses it should still come back through the path that has been in
   * production, rather than failing the upload outright.
   */
  /**
   * Runs before returning either result: a PDF that gave up almost nothing is
   * about to be refused, and the refusal should say which kind of nothing it
   * was. On the happy path this costs a comparison.
   */
  const explain = async (read: ReadPages): Promise<ReadPages> => {
    if (read.text.replace(/\s/g, "").length >= MIN_TEXT_CHARS) return read;
    try {
      read.drawsImages = await drawsImages(
        document as unknown as Parameters<typeof drawsImages>[0],
      );
    } catch {
      // Unknowable, so assume the commoner of the two. A wrong guess here
      // costs the accuracy of one sentence; throwing would cost the upload.
      read.drawsImages = true;
    }
    return read;
  };

  try {
    const laidOut = await readByPosition(
      document as unknown as Parameters<typeof readByPosition>[0],
    );
    if (laidOut.text.trim().length > 0) return await explain(laidOut);
  } catch {
    // fall through
  }

  try {
    const { text } = await extractText(document, { mergePages: true });
    return await explain({
      text: Array.isArray(text) ? text.join("\n") : String(text ?? ""),
      // The flat join has no page boundaries in it, so this path reports
      // nothing rather than guessing. Silence is honest; a wrong page number
      // is not.
      unreadable: [],
      drawsImages: false,
    });
  } catch {
    throw new ResumeFileError(
      "That PDF could not be opened. It may be password protected or damaged. Try exporting it again, or paste the text instead.",
    );
  }
}

async function fromDocx(bytes: Uint8Array): Promise<ReadPages> {
  const mammoth = (await import("mammoth")).default;

  try {
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    // A .docx has no fixed pages until something lays it out, so there is no
    // page to report on.
    return { text: value ?? "", unreadable: [], drawsImages: false };
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
  /**
   * 1-based pages that held no readable text while the rest of the file did —
   * a scan bound into a text PDF. Empty for .docx and for the flat fallback,
   * neither of which can see pages.
   */
  unreadablePages: number[];
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
  const text = tidy(extracted.text);

  if (text.length < MIN_TEXT_CHARS) {
    if (kind !== "pdf") {
      throw new ResumeFileError(
        "That document has almost no text in it. Check you uploaded the right file.",
      );
    }

    /*
     * Two failures, one appearance. Both give back a PDF that looks perfectly
     * readable on screen and yields nothing here, and the fix for one is
     * useless for the other, so they get separate sentences.
     *
     * The image case is not only scanners. A resume-builder site that exports
     * by screenshotting its own preview — html2canvas into jsPDF, which is the
     * cheap way to do it — produces a PDF of pictures from a page that never
     * touched paper. Calling that "a scan" to someone who has never owned a
     * scanner just reads as broken, so the sentence names the shape of the
     * problem and leaves the cause open.
     */
    throw new ResumeFileError(
      extracted.drawsImages
        ? "No text could be read from that PDF — every page in it is a picture rather than text. Scans look like this, and so do the downloads from some resume-builder sites. Paste your resume as text instead, or upload a PDF exported from Word or Google Docs."
        : "No text could be read from that PDF — its words are drawn as shapes rather than stored as text, which is what some design tools do when they export. Paste your resume as text instead, or export it again as a PDF from Word or Google Docs.",
    );
  }

  return {
    text: text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text,
    kind,
    truncated: text.length > MAX_TEXT_CHARS,
    unreadablePages: extracted.unreadable,
  };
}
