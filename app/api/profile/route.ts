import { NextResponse } from "next/server";
import {
  loadProfile,
  loadProfileForEditing,
  saveProfile,
  summarise,
  normalise,
} from "@/lib/resumeStore";
import { completeJSON, DeepSeekError } from "@/lib/deepseek";
import { EXTRACT_SYSTEM_PROMPT } from "@/prompts/extractPrompt";
import { MAX_RESUME_TEXT_CHARS } from "@/lib/plan";
import type { MasterProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Full profile for the editor, plus the summary the header strip needs. */
export async function GET() {
  const [stored, editable] = await Promise.all([
    loadProfile(),
    loadProfileForEditing(),
  ]);

  return NextResponse.json({
    summary: summarise(stored),
    profile: editable,
  });
}

/** Save the profile from the editor. */
export async function PUT(request: Request) {
  let body: Partial<MasterProfile>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the form data." }, { status: 400 });
  }

  const profile = normalise(body);

  if (!profile.personal_information.full_name) {
    return NextResponse.json(
      { error: "Add your full name before saving." },
      { status: 422 },
    );
  }

  if (profile.experience.length === 0 && profile.skills.length === 0) {
    return NextResponse.json(
      { error: "Add at least one role or a few skills before saving." },
      { status: 422 },
    );
  }

  const outcome = await saveProfile(profile);

  if (!outcome.persisted) {
    // The write failed (expired session, or the database rejected it). Hand
    // the normalised profile back so the editor can keep the user's work.
    return NextResponse.json({
      ok: true,
      persisted: false,
      message: outcome.reason,
      profile: outcome.profile,
      summary: summarise(outcome.profile),
    });
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    summary: summarise(outcome.profile),
  });
}

/**
 * Save from the simple editor: one block of pasted resume text.
 *
 * Parsed once, here, into the structured profile the document writer needs.
 * Every later generation reads the stored JSON, so this call happens only
 * when you change your profile — not on every application.
 */
export async function POST(request: Request) {
  let text = "";

  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Could not read the text." }, { status: 400 });
  }

  if (text.length < 120) {
    return NextResponse.json(
      {
        error:
          "That is too short to read as a resume. Paste the whole thing — contact details, every role, skills and education.",
      },
      { status: 422 },
    );
  }

  /*
   * A ceiling as well as a floor, matching the one the file upload already
   * enforces. Every character here is billed to this deployment's DeepSeek
   * key, and a two-page resume is nowhere near this limit.
   */
  if (text.length > MAX_RESUME_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: `That is ${text.length.toLocaleString()} characters — too long to read as a resume. Paste up to ${MAX_RESUME_TEXT_CHARS.toLocaleString()}.`,
      },
      { status: 413 },
    );
  }

  let parsed: Partial<MasterProfile>;

  try {
    parsed = await completeJSON<Partial<MasterProfile>>(
      EXTRACT_SYSTEM_PROMPT,
      `Resume text:\n\n${text}`,
      { temperature: 0 },
    );
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not read that text. Try again." },
      { status: 500 },
    );
  }

  const profile = normalise({ ...parsed, raw_text: text });

  if (!profile.personal_information.full_name) {
    return NextResponse.json(
      {
        error:
          "No name was found in that text. Make sure your name is at the top, then save again.",
      },
      { status: 422 },
    );
  }

  const outcome = await saveProfile(profile);

  return NextResponse.json({
    ok: true,
    persisted: outcome.persisted,
    message: outcome.persisted ? undefined : outcome.reason,
    profile: outcome.profile,
    summary: summarise(outcome.profile),
  });
}
