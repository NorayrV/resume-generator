import { NextResponse } from "next/server";
import { generateDocx } from "@/lib/docxGenerator";
import { generatePdf } from "@/lib/pdfGenerator";
import { currentUser } from "@/lib/supabase/server";
import { claimRateEvent, describeWait } from "@/lib/rateLimit";
import type { PersonalInformation, TailoredResume } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Builds the downloadable file from content that has already been generated.
 *
 * Kept separate from /api/generate so re-downloading never costs another
 * AI call — the client posts back the resume it already holds, and can ask
 * for either format without regenerating anything.
 *
 * That design is also why this route needs its own limits. It accepts whatever
 * JSON the caller sends and renders it, which makes it the most CPU-hungry
 * thing the server does, and unlike a generation it costs no AI credit — so
 * nothing about the free tier stood between a signed-in user and an endless
 * loop of it. Two bounds now: how big one request can be, and how many a
 * single user gets per hour.
 */

/**
 * Ceiling on the posted body.
 *
 * A tailored resume serialises to a few kilobytes. This is far above anything
 * the app itself produces and far below what would take meaningful time to
 * lay out into a document.
 */
const MAX_BODY_BYTES = 256 * 1024;

const FORMATS = {
  docx: {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    build: generateDocx,
  },
  pdf: {
    ext: "pdf",
    mime: "application/pdf",
    build: generatePdf,
  },
} as const;

type Format = keyof typeof FORMATS;

function isFormat(value: unknown): value is Format {
  return value === "docx" || value === "pdf";
}

/** Characters no filesystem will accept, plus control characters. */
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\\/:*?"<>|\u0000-\u001F]/g;

const words = (value: string) =>
  value.replace(ILLEGAL, " ").trim().split(/\s+/).filter(Boolean);

/**
 * Name_Surname_Headline — "Norayr_Vardanyan_DataAnalyst".
 *
 * Underscores separate the person from the role; the headline itself closes
 * up, so "Data Analyst" reads as one token rather than splitting into two
 * more underscore-delimited parts.
 *
 * Letters are left in whatever script they were written in. The previous
 * version stripped anything outside [A-Za-z0-9_], which quietly deleted
 * Armenian and Cyrillic names entirely and downloaded the file as
 * "Resume.pdf" — the one part of the name that matters most, gone.
 */
function documentName(fullName: string, headline: string): string {
  const person = words(fullName).join("_");
  const role = words(headline).join("");

  return [person, role].filter(Boolean).join("_") || "Resume";
}

/**
 * A plain-ASCII version, for the `filename=` parameter.
 *
 * Content-Disposition's original parameter is not safe for non-ASCII, so the
 * real name travels in `filename*` (RFC 5987) and this is what an old client
 * falls back to. Accented Latin survives via NFKD; other scripts do not, and
 * "Resume" is better than mojibake.
 */
function asciiName(name: string): string {
  const stripped = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "");

  return stripped.replace(/^[._-]+/, "") || "Resume";
}

/** RFC 5987 encoding — stricter than encodeURIComponent about ' ( ) *. */
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/**
 * Both spellings of the filename, so every browser gets the best one it
 * understands.
 */
function contentDisposition(name: string, ext: string): string {
  const full = `${name}.${ext}`;
  return [
    "attachment",
    `filename="${asciiName(name)}.${ext}"`,
    `filename*=UTF-8''${rfc5987(full)}`,
  ].join("; ");
}

export async function POST(request: Request) {
  try {
    // Middleware turns away signed-out callers, but this route burns CPU on
    // caller-supplied input, so it checks rather than inheriting the promise.
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    /*
     * Read as text so the size can be measured before anything is parsed.
     * request.json() would happily deserialise a hundred megabytes first.
     */
    const raw = await request.text();

    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "That resume is too large to build into a document." },
        { status: 413 },
      );
    }

    let body: {
      resume?: TailoredResume;
      person?: PersonalInformation;
      format?: unknown;
    } | null = null;

    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }

    const resume = body?.resume;
    const person = body?.person;

    // Anything unrecognised falls back to Word, which is what the button did
    // before PDF existed.
    const format: Format = isFormat(body?.format) ? body.format : "docx";

    if (!resume || !person?.full_name) {
      return NextResponse.json(
        { error: "Nothing to download yet. Generate a resume first." },
        { status: 400 },
      );
    }

    // Claimed after validation so a malformed request does not spend one.
    const gate = await claimRateEvent(user.id, "download");

    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: `You have downloaded ${gate.limit} files in the past hour. Try again ${describeWait(gate.retryAfterSecs)}.`,
        },
        { status: 429 },
      );
    }

    const { build, mime, ext } = FORMATS[format];
    const buffer = await build(resume, person);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": contentDisposition(
          documentName(person.full_name, resume.headline ?? ""),
          ext,
        ),
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[download]", error);
    return NextResponse.json(
      { error: "The file could not be built. Try generating again." },
      { status: 500 },
    );
  }
}
