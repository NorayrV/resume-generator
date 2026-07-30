import type { CoverLetterVersions } from "./types";

/**
 * The cover letter prompt asks for three versions under markdown headings:
 *
 *   ## English Version
 *   ...
 *   ---
 *   ## Russian Version
 *   ...
 *   ---
 *   ## Spanish Version
 *   ...
 *
 * Any of them can come first — the prompt puts the job description's own
 * language first — so we match on the heading label rather than on position.
 *
 * If you rename those headings in prompts/coverLetterPrompt.ts, update the
 * patterns below to match.
 */

/**
 * The language word can sit anywhere in the heading — "## Spanish Version",
 * "## Versión en Español" and "## Испанская версия" all have to match, or that
 * version is silently dropped.
 */
const LANG_WORD = String.raw`english|russian|spanish|espa(?:ñ|n)ol|русск\w*|английск\w*|испанск\w*`;
const HEADING = new RegExp(
  String.raw`^\s{0,3}#{1,6}\s*([^\n]*?(?:${LANG_WORD})[^\n]*)$`,
  "gim",
);

export type Lang = keyof CoverLetterVersions;

const EMPTY: CoverLetterVersions = { english: "", russian: "", spanish: "" };

/**
 * The prompt puts the job description's own language first, so the order the
 * headings appear in tells us which version to show by default.
 */
export interface ParsedCoverLetter {
  versions: CoverLetterVersions;
  /** Languages in the order the model emitted them; primary first. */
  order: Lang[];
}

/** Trim stray separators and blank lines from a captured section. */
function clean(section: string): string {
  return section
    .replace(/^\s*-{3,}\s*$/gm, "") // horizontal rules between versions
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Map a heading label, in any of the three languages, to a field. */
function langFromLabel(label: string): Lang {
  const l = label.toLowerCase();
  if (/spanish|espa(ñ|n)ol|испанск/.test(l)) return "spanish";
  if (/russian|русск/.test(l)) return "russian";
  return "english";
}

export function parseCoverLetter(raw: string): ParsedCoverLetter {
  const text = raw.trim();

  const matches = [...text.matchAll(HEADING)];

  // No headings at all — treat the whole thing as one letter, and guess its
  // language from the script it is written in.
  if (matches.length === 0) {
    if (!text) return { versions: { ...EMPTY }, order: [] };
    return /[\u0400-\u04FF]/.test(text)
      ? { versions: { ...EMPTY, russian: clean(text) }, order: ["russian"] }
      : { versions: { ...EMPTY, english: clean(text) }, order: ["english"] };
  }

  const versions: CoverLetterVersions = { ...EMPTY };
  const order: Lang[] = [];

  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = clean(text.slice(start, end));

    if (!body) return;

    const lang = langFromLabel(match[1]);
    versions[lang] = body;
    if (!order.includes(lang)) order.push(lang);
  });

  // A heading was found but nothing landed — fall back rather than show blanks.
  if (order.length === 0) {
    return { versions: { ...EMPTY, english: clean(text) }, order: ["english"] };
  }

  return { versions, order };
}

/** Word count that works for Latin and Cyrillic text alike. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Per-request language selection                                       */
/* ------------------------------------------------------------------ */

/** Display name and the heading the model must emit for each language. */
export const LANGUAGES: Record<
  Lang,
  { label: string; heading: string; words: { min: number; max: number } }
> = {
  english: { label: "English", heading: "English Version", words: { min: 150, max: 220 } },
  russian: { label: "Русский", heading: "Russian Version", words: { min: 120, max: 180 } },
  spanish: { label: "Español", heading: "Spanish Version", words: { min: 150, max: 220 } },
};

export const ALL_LANGS: Lang[] = ["english", "russian", "spanish"];

/** Keep only recognised languages, in a stable order. Falls back to English. */
export function sanitiseLangs(input: unknown): Lang[] {
  const wanted = Array.isArray(input) ? input : [];
  const picked = ALL_LANGS.filter((l) => wanted.includes(l));
  return picked.length > 0 ? picked : ["english"];
}

/**
 * Instruction appended to the cover letter request.
 *
 * The system prompt tells the model to always write all three versions. Users
 * usually need one, and each extra version is output tokens they pay for, so
 * this overrides that for a single request. It is deliberately blunt: the
 * instruction it is countermanding is written in capitals.
 */
export function languageInstruction(langs: Lang[]): string {
  const list = langs.map((l) => LANGUAGES[l].heading).join(", ");

  return [
    "",
    "==================================================",
    "LANGUAGE OVERRIDE FOR THIS REQUEST",
    "==================================================",
    "",
    `Write ONLY the following version(s): ${list}.`,
    "",
    "This replaces any earlier instruction to always produce three versions.",
    "Do not write, translate, mention or leave a heading for any other language.",
    "",
    langs.length === 1
      ? `Output exactly one section, beginning with the heading "## ${LANGUAGES[langs[0]].heading}".`
      : [
          `Output exactly ${langs.length} sections, one per language, each under its own heading:`,
          langs.map((l) => `  ## ${LANGUAGES[l].heading}`).join("\n"),
          "",
          "Order them so the job description's own language comes first, if it is among them.",
        ].join("\n"),
    "",
    "Everything else in the instructions above still applies.",
  ].join("\n");
}

/**
 * Output ceiling for the cover letter call.
 *
 * Roughly one letter's worth per language plus headroom, so asking for one
 * language does not pay for a three-language budget.
 */
export function coverLetterTokenBudget(langs: Lang[]): number {
  return 600 + 1000 * Math.max(1, langs.length);
}
