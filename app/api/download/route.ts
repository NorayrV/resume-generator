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

function filename(name: string, role: string, ext: string) {
  const slug = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const parts = [slug(name) || "Resume", slug(role)].filter(Boolean);
  return `${parts.join("-")}.${ext}`;
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
      role?: unknown;
      format?: unknown;
    } | null = null;

    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }

    const resume = body?.resume;
    const person = body?.person;
    const role = String(body?.role ?? "");

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
        "Content-Disposition": `attachment; filename="${filename(person.full_name, role, ext)}"`,
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
