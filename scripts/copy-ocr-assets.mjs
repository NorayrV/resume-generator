/**
 * Put the OCR runtime where the browser is allowed to fetch it from.
 *
 * Tesseract and pdf.js both default to loading their worker, their WebAssembly
 * and their language model from a CDN. This app's Content-Security-Policy says
 * `connect-src 'self'`, so every one of those requests is refused — correctly.
 * Rather than punch a hole in the policy for a third-party host, the files are
 * served from our own origin, and this copies them there.
 *
 * Runs automatically before `dev` and `build`. To run it by hand:
 *
 *     node scripts/copy-ocr-assets.mjs
 *
 * public/ocr/*.js is generated and git-ignored — it is a copy of what is
 * already in node_modules. public/ocr/lang/ is committed, because a language
 * model is not in node_modules and a deploy should not depend on a CDN being
 * up at the moment it builds.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "ocr");
fs.mkdirSync(path.join(out, "lang"), { recursive: true });

/**
 * Tesseract picks its own WebAssembly build at runtime from what the browser
 * supports, so all three candidates have to be present. Only one is ever
 * fetched. The `-lstm` builds are the neural engine alone; the legacy engine
 * is twice the size and we never ask for it.
 */
const copies = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["pdfjs-dist/legacy/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
];

let copied = 0;
for (const [from, to] of copies) {
  const source = path.join(root, "node_modules", from);
  if (!fs.existsSync(source)) {
    console.error(`missing: node_modules/${from} — run npm install`);
    process.exit(1);
  }
  const destination = path.join(out, to);
  const stale =
    !fs.existsSync(destination) ||
    fs.statSync(source).size !== fs.statSync(destination).size;
  if (stale) {
    fs.copyFileSync(source, destination);
    copied++;
  }
}

/*
 * The language model. `4.0.0_best_int` is what tesseract.js asks for when it
 * loads the neural engine on its own — the full-precision model is 10 MB for
 * accuracy nobody reading a resume would notice.
 */
const LANG = "eng.traineddata.gz";
const langFile = path.join(out, "lang", LANG);

if (!fs.existsSync(langFile)) {
  const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/${LANG}`;
  process.stdout.write(`fetching ${LANG} … `);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`\nfailed: ${response.status} ${url}`);
    process.exit(1);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1_000_000) {
    console.error(`\nrefusing a ${bytes.length}-byte language model — that is not it`);
    process.exit(1);
  }
  fs.writeFileSync(langFile, bytes);
  console.log(`${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
  copied++;
}

console.log(
  copied === 0
    ? "ocr assets already current"
    : `ocr assets ready (${copied} file${copied === 1 ? "" : "s"} written)`,
);
