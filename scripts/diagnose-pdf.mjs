/**
 * Explain why a PDF did or did not give up its text.
 *
 * "No text could be read from that PDF" has several causes that look identical
 * from the outside — a scan, text flattened to vector outlines, a CID font with
 * no usable character map, an XFA form, or text that lives in form fields
 * rather than on the page. The advice we print only fits the first of those, so
 * when someone reports the error, run this against their file before believing
 * the message we showed them:
 *
 *     node scripts/diagnose-pdf.mjs path/to/resume.pdf
 *
 * It reports what each page actually contains and what our own pipeline makes
 * of it. No AI, no network, nothing written anywhere.
 */

import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/diagnose-pdf.mjs <file.pdf>");
  process.exit(2);
}
const file = path.resolve(target);
if (!fs.existsSync(file)) {
  console.error("no such file: " + file);
  process.exit(2);
}

/* pdf.js detaches whatever buffer it is handed, so every consumer gets its own. */
const fresh = () => new Uint8Array(fs.readFileSync(file));

const { getDocumentProxy, extractText, getResolvedPDFJS } = await import("unpdf");
const pdfjs = await getResolvedPDFJS();
const { OPS } = pdfjs;

const IMAGE_OPS = new Set(
  ["paintImageXObject", "paintImageXObjectRepeat", "paintInlineImageXObject",
   "paintJpegXObject", "paintImageMaskXObject"]
    .map((name) => OPS[name])
    .filter((op) => op !== undefined),
);

const size = fs.statSync(file).size;
console.log(`\nfile        ${file}`);
console.log(`size        ${(size / 1024).toFixed(0)} KB`);

let doc;
try {
  doc = await getDocumentProxy(fresh());
} catch (error) {
  console.log(`\nThe file could not be opened at all: ${error.message}`);
  console.log("That is a damaged or password-protected PDF, not an extraction problem.");
  process.exit(1);
}

console.log(`pages       ${doc.numPages}`);

const meta = await doc.getMetadata().catch(() => null);
if (meta?.info) {
  const { Producer, Creator, IsXFAPresent, IsAcroFormPresent, Encrypted } = meta.info;
  console.log(`producer    ${Producer ?? "—"}${Creator ? `  (creator: ${Creator})` : ""}`);
  const flags = [
    IsXFAPresent && "XFA form",
    IsAcroFormPresent && "AcroForm",
    Encrypted && "encrypted",
  ].filter(Boolean);
  if (flags.length) console.log(`flags       ${flags.join(", ")}`);
}

console.log("\n page  textItems  chars  images  annotTexts  fonts");
console.log(" ----  ---------  -----  ------  ----------  -----");

let totalChars = 0;
let totalImages = 0;
const fontNames = new Set();

for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);

  const content = await page.getTextContent();
  const items = content.items.filter((i) => typeof i.str === "string");
  const chars = items.reduce((sum, i) => sum + i.str.trim().length, 0);
  totalChars += chars;

  for (const style of Object.values(content.styles ?? {})) {
    if (style?.fontFamily) fontNames.add(style.fontFamily);
  }

  let images = 0;
  try {
    const { fnArray } = await page.getOperatorList();
    for (const fn of fnArray) if (IMAGE_OPS.has(fn)) images++;
  } catch { /* operator list is a nicety, not a requirement */ }
  totalImages += images;

  let annotTexts = 0;
  try {
    for (const a of await page.getAnnotations()) {
      const value = a.fieldValue ?? a.contents ?? a.alternativeText;
      if (typeof value === "string" && value.trim()) annotTexts++;
    }
  } catch { /* same */ }

  const fonts = Object.keys(content.styles ?? {}).length;
  console.log(
    ` ${String(n).padStart(4)}  ${String(items.length).padStart(9)}  ${String(chars).padStart(5)}` +
    `  ${String(images).padStart(6)}  ${String(annotTexts).padStart(10)}  ${String(fonts).padStart(5)}`,
  );
}

console.log(`\nfonts seen  ${fontNames.size ? [...fontNames].join(", ") : "none"}`);

/* ---- What the two extractors make of it -------------------------------- */

const flat = await extractText(await getDocumentProxy(fresh()), { mergePages: true })
  .then((r) => (Array.isArray(r.text) ? r.text.join("\n") : String(r.text ?? "")))
  .catch((e) => `<threw: ${e.message}>`);

let ours;
let extractResumeText;
try {
  /* Needs two flags plain `node` does not set: server-only is a no-op only
     under the react-server condition, and strip-only type removal chokes on a
     constructor parameter property. Missing them is not worth failing over —
     everything above this line is the part that explains the PDF. */
  ({ extractResumeText } = await import("../lib/resumeFile.ts"));
} catch {
  ours = null;
}

if (extractResumeText) {
  try {
    const result = await extractResumeText(
      new File([fresh()], path.basename(file), { type: "application/pdf" }),
    );
    ours = `accepted — ${result.text.length} chars` +
      (result.unreadablePages.length ? `, unreadable pages [${result.unreadablePages}]` : "") +
      `\n\n${result.text.slice(0, 600)}${result.text.length > 600 ? "\n…" : ""}`;
  } catch (error) {
    ours = "REJECTED — " + error.message;
  }
}

console.log(`\nunpdf extractText: ${flat.trim().length} chars`);
if (flat.trim().length) console.log(flat.trim().slice(0, 300) + (flat.length > 300 ? "\n…" : ""));

if (ours) {
  console.log(`\nour pipeline: ${ours}`);
} else {
  console.log("\nour pipeline: not run. To include it:");
  console.log("  node --experimental-transform-types --conditions=react-server \\");
  console.log("    scripts/diagnose-pdf.mjs " + target);
}

/* ---- The verdict -------------------------------------------------------- */

console.log("\n" + "-".repeat(60));
if (totalChars >= 120) {
  console.log("VERDICT  There is text here. If the upload was still refused,");
  console.log("         the problem is downstream of extraction, not in the PDF.");
} else if (totalImages > 0 && totalChars === 0) {
  console.log("VERDICT  A scan. Every page is a picture with no text layer.");
  console.log("         The message we show is correct; only OCR would read this.");
} else if (totalChars === 0 && totalImages === 0) {
  console.log("VERDICT  No text and no images — the words are drawn as vector");
  console.log("         outlines. Some designer-tool exports do this. The message");
  console.log("         we show is misleading here: re-exporting will not help,");
  console.log("         and there is nothing to OCR either.");
} else {
  console.log("VERDICT  Some text came back, but not enough to parse. Check the");
  console.log("         fonts above: a CID font with no character map extracts as");
  console.log("         empty strings even though the page looks fine on screen.");
}
console.log("-".repeat(60) + "\n");
