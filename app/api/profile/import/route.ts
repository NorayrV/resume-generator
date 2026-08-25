import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { normalise, summarise } from "@/lib/resumeStore";
import { completeJSON, DeepSeekError } from "@/lib/deepseek";
import { extractResumeText, ResumeFileError } from "@/lib/resumeFile";
import { checkImportLimit, describeRetry, recordImport } from "@/lib/importLimit";
import { EXTRACT_SYSTEM_PROMPT } from "@/prompts/extractPrompt";
import type { MasterProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Reads an uploaded resume into a profile — without saving it.
 *
 * That is the whole point of a separate route from POST /api/profile, which
 * parses pasted text and writes it straight to the database. Here the result
 * goes back to the editor for the user to check first, because extraction is
 * a guess: a two-column PDF can interleave lines, and dates and job titles
 * are exactly the fields nobody wants quietly wrong on a resume.
 *
 * Nothing is persisted until the user presses Save in the editor, which goes
 * through the existing PUT and its validation.
 */
export async function POST(request: Request) {
  // Middleware already turns away signed-out callers, but this route spends
  // money on every request, so it checks for itself rather than inheriting
  // that guarantee from a file someone might later edit.
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  /*
   * Checked before the body is read, so a user who is over the limit is turned
   * away without uploading several megabytes first.
   */
  const limit = await checkImportLimit(user.id);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `You have uploaded ${limit.limit} resumes today. Try again ${describeRetry(limit.retryAt)}, or fill the form in by hand.`,
      },
      { status: 429 },
    );
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read the upload. Try again." },
      { status: 400 },
    );
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  // ---- File to text -------------------------------------------------------
  let extracted;

  try {
    extracted = await extractResumeText(file);
  } catch (error) {
    if (error instanceof ResumeFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[profile/import] extraction", error);
    return NextResponse.json(
      { error: "Could not read that file. Try a different export, or paste the text instead." },
      { status: 500 },
    );
  }

  // ---- Text to profile ----------------------------------------------------
  /*
   * Counted here rather than on a successful parse: this is the point where a
   * paid API call becomes unavoidable, and a call that fails still cost money.
   * Rejected files never reach this line, so uploading the wrong thing does
   * not burn an attempt.
   */
  await recordImport(user.id);

  let parsed: Partial<MasterProfile>;

  try {
    parsed = await completeJSON<Partial<MasterProfile>>(
      EXTRACT_SYSTEM_PROMPT,
      `Resume text:\n\n${extracted.text}`,
      { temperature: 0 },
    );
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[profile/import] parse", error);
    return NextResponse.json(
      { error: "Could not read that resume. Try again." },
      { status: 500 },
    );
  }

  const profile = normalise({ ...parsed, raw_text: extracted.text });

  const person = profile.personal_information;
  const foundSomething =
    Boolean(person.full_name) ||
    profile.experience.length > 0 ||
    profile.skills.length > 0 ||
    profile.education.length > 0;

  if (!foundSomething) {
    return NextResponse.json(
      {
        error:
          "Nothing recognisable as a resume was found in that file. Check you uploaded the right one, or fill the form in by hand.",
      },
      { status: 422 },
    );
  }

  /*
   * Missing fields are reported, not refused. The user is about to review
   * this in the editor anyway, so handing back everything that did parse and
   * pointing at the gap beats rejecting the upload and making them start over
   * — which is the abandonment this feature exists to prevent.
   */
  const warnings: string[] = [];

  if (!person.full_name) warnings.push("your name");
  if (profile.experience.length === 0) warnings.push("your work experience");
  if (profile.skills.length === 0) warnings.push("your skills");
  if (extracted.truncated) {
    warnings.push("the end of the document, which was too long to read in full");
  }

  /*
   * A scan bound into a text PDF. Page one parses, so nothing above this line
   * notices, and the user gets back a profile built from half their resume
   * that looks exactly like one built from all of it. Naming the page is the
   * whole fix: they can paste that part in, and they know to look.
   */
  const blank = extracted.unreadablePages;
  if (blank.length === 1) {
    warnings.push(`anything on page ${blank[0]}, which looks like a scan`);
  } else if (blank.length > 1) {
    const list = `${blank.slice(0, -1).join(", ")} and ${blank[blank.length - 1]}`;
    warnings.push(`anything on pages ${list}, which look like scans`);
  }

  return NextResponse.json({
    ok: true,
    profile,
    summary: summarise(profile),
    kind: extracted.kind,
    warnings,
  });
}
