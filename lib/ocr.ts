/**
 * Read a PDF that has no text in it, in the browser.
 *
 * Some resumes arrive as pictures. A scan is the obvious case, but the commoner
 * one is a resume-builder site that exports by screenshotting its own preview —
 * two pages of image, no text layer, nothing for a parser to find. Text drawn
 * as vector outlines lands here too: it is not text to a parser, but it looks
 * like letters, which is all OCR needs.
 *
 * This runs on the user's machine, and that is the point. The alternative was
 * an OCR service, which would mean posting somebody's CV to a third party
 * before they had agreed to anything. Here the image never leaves the browser;
 * only the recognised text is sent on, which is exactly what a text PDF sends
 * anyway.
 *
 * Everything is imported dynamically. The pdf.js and Tesseract bundles are
 * several megabytes and almost nobody needs them, so they are not part of the
 * page — they arrive when a file turns out to be unreadable, and not before.
 * Their worker, WebAssembly and language model are served from our own origin
 * because the CSP forbids the CDN they would otherwise use; see
 * scripts/copy-ocr-assets.mjs.
 */

/** Where scripts/copy-ocr-assets.mjs puts the runtime. */
const OCR_ROOT = "/ocr";

/**
 * Render at roughly this width in pixels.
 *
 * Tesseract wants a capital letter around 20-30 pixels tall; body text on an
 * A4 page renders at about half that when you take the page at its own size.
 * Upscaling past the source image's own resolution adds no detail, but it does
 * give the line finder more to work with, and the cost is milliseconds.
 */
const RENDER_WIDTH = 1800;

/** Past this a "resume" is something else, and OCR is slow enough to matter. */
const MAX_OCR_PAGES = 8;

export interface OcrProgress {
  /** 1-based page being worked on. */
  page: number;
  pages: number;
  /** Whole-job progress, 0 to 1, for a bar or a percentage. */
  fraction: number;
  /** What to tell the user right now. */
  label: string;
}

export class OcrError extends Error {}

let pdfjs: typeof import("pdfjs-dist") | null = null;

/**
 * The legacy build, deliberately. The modern one assumes browser APIs that
 * Safari only grew recently, and a resume upload is not the place to discover
 * which browser somebody brought.
 */
async function loadPdfjs() {
  if (pdfjs) return pdfjs;
  const module = await import("pdfjs-dist/legacy/build/pdf.mjs");
  module.GlobalWorkerOptions.workerSrc = `${OCR_ROOT}/pdf.worker.min.mjs`;
  pdfjs = module as unknown as typeof import("pdfjs-dist");
  return pdfjs;
}

/**
 * Turn one page into a canvas at a size worth reading.
 */
async function renderPage(page: {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }) => { promise: Promise<void> };
}): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, Math.max(1.5, RENDER_WIDTH / base.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new OcrError("This browser would not give us a canvas to draw on.");

  // A white ground. A PDF page has no background of its own, and text
  // recognition on transparent-black is a study in false negatives.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas;
}

/**
 * Read the text out of a PDF by looking at it.
 *
 * Resolves to plain text in reading order, page by page. Throws OcrError with
 * something worth showing the user.
 */
export async function readPdfByOcr(
  file: File,
  onProgress: (progress: OcrProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const stop = () => {
    if (signal?.aborted) throw new OcrError("Cancelled.");
  };

  onProgress({ page: 0, pages: 0, fraction: 0, label: "Getting ready" });

  const [pdf, tesseract] = await Promise.all([loadPdfjs(), import("tesseract.js")]);
  stop();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdf.getDocument({ data: bytes });
  let document;
  try {
    document = await task.promise;
  } catch {
    throw new OcrError("That PDF could not be opened. It may be damaged or password protected.");
  }

  const pages = Math.min(document.numPages, MAX_OCR_PAGES);

  /*
   * One worker for the whole document. Starting it means fetching and
   * compiling several megabytes of WebAssembly, which is most of the wait on
   * a two-page resume — doing that per page would triple the time for nothing.
   */
  const worker = await tesseract.createWorker("eng", tesseract.OEM.LSTM_ONLY, {
    workerPath: `${OCR_ROOT}/worker.min.js`,
    corePath: OCR_ROOT,
    langPath: `${OCR_ROOT}/lang`,
    // The CSP has no blob: in script-src, and a worker built from a blob URL
    // is refused by it. Loading the worker from its own path is allowed.
    workerBlobURL: false,
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status === "loading tesseract core" || message.status === "loading language traineddata") {
        onProgress({ page: 0, pages, fraction: 0.02, label: "Getting ready" });
      }
    },
  });

  try {
    const text: string[] = [];

    for (let n = 1; n <= pages; n++) {
      stop();

      // Two thirds of a page's share goes to reading it, a third to drawing
      // it, which is roughly how the time actually divides.
      const share = (n - 1) / pages;
      onProgress({
        page: n,
        pages,
        fraction: 0.05 + 0.95 * share,
        label: `Reading page ${n} of ${pages}`,
      });

      const canvas = await renderPage(
        (await document.getPage(n)) as unknown as Parameters<typeof renderPage>[0],
      );
      stop();

      const { data } = await worker.recognize(canvas);
      text.push(data.text ?? "");

      // Let the page be collected rather than holding every rendered page in
      // memory until the end.
      canvas.width = 0;
      canvas.height = 0;
    }

    onProgress({ page: pages, pages, fraction: 1, label: "Done" });

    const joined = text.join("\n\n").trim();
    if (joined.replace(/\s/g, "").length < 120) {
      throw new OcrError(
        "We looked at every page and could not make out any text. If this is a photo, a straighter or sharper one may work — otherwise paste your resume as text.",
      );
    }

    return joined;
  } finally {
    await worker.terminate().catch(() => {});
    await task.destroy().catch(() => {});
  }
}
