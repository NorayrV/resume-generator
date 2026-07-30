import { NextResponse } from "next/server";
import { generateDocx } from "@/lib/docxGenerator";
import { generatePdf } from "@/lib/pdfGenerator";
import type { PersonalInformation, TailoredResume } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Builds the downloadable file from content that has already been generated.
 *
 * Kept separate from /api/generate so re-downloading never costs another
 * AI call — the client posts back the resume it already holds, and can ask
 * for either format without regenerating anything.
 */

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
    const body = await request.json().catch(() => null);

    const resume = body?.resume as TailoredResume | undefined;
    const person = body?.person as PersonalInformation | undefined;
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
