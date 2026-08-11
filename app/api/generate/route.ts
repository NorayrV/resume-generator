import { NextResponse } from "next/server";
import { completeJSON, completeText, DeepSeekError } from "@/lib/deepseek";
import { RESUME_SYSTEM_PROMPT } from "@/prompts/resumePrompt";
import { COVER_LETTER_SYSTEM_PROMPT } from "@/prompts/coverLetterPrompt";
import {
  loadProfile,
  profileToPrompt,
  tailoredResumeToPrompt,
} from "@/lib/resumeStore";
import {
  coverLetterTokenBudget,
  languageInstruction,
  parseCoverLetter,
  sanitiseLangs,
  type Lang,
} from "@/lib/coverLetter";
import { anchorExperience } from "@/lib/anchorExperience";
import { currentUser } from "@/lib/supabase/server";
import { getPlanPricing } from "@/lib/polar";
import { claimGeneration, getUsage, releaseGeneration } from "@/lib/usage";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/lib/plan";
import type {
  GenerationResult,
  MasterProfile,
  TailoredResume,
} from "@/lib/types";

export const runtime = "nodejs";

/**
 * Generation is the slow step: DeepSeek writes a full resume and a cover
 * letter in one call. 60s is the ceiling on Vercel's free tier.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Middleware already rejects signed-out requests; this gives us the id.
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const jobDescription = String(body?.jobDescription ?? "").trim();

    // Which cover letter languages to write. Each extra one is output tokens
    // the user pays for, so we only ask for what was requested.
    const langs = sanitiseLangs(body?.languages);

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Paste the job description first." },
        { status: 400 },
      );
    }

    if (jobDescription.length < 120) {
      return NextResponse.json(
        {
          error:
            "That job description is too short to tailor against. Paste the full posting, including the requirements.",
        },
        { status: 400 },
      );
    }

    /*
     * A ceiling as well as a floor. Without one, a single request could carry
     * hundreds of kilobytes into two AI calls — billed to this deployment's
     * key. Checked before the meter, so a rejected oversize request does not
     * cost the user one of their free generations.
     */
    if (jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
      return NextResponse.json(
        {
          error: `That job description is ${jobDescription.length.toLocaleString()} characters. Paste just the posting itself — up to ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}.`,
        },
        { status: 413 },
      );
    }

    const profile = await loadProfile();

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "No master resume is stored yet. Upload your resume before generating.",
        },
        { status: 409 },
      );
    }

    /*
     * Take the slot before spending anything.
     *
     * This used to be a read here and a write at the end, with both AI calls
     * in between — a thirty-second window in which every concurrent request
     * read the same count and passed. The claim is now a single atomic step in
     * the database, and everything after it is wrapped so the slot goes back
     * if the generation fails.
     */
    const claim = await claimGeneration(user.id);

    if (!claim.ok) {
      // Send the live price with the refusal, so the upgrade prompt can quote
      // it without a second round trip.
      const plan = await getPlanPricing();

      return NextResponse.json(
        {
          error: `You have used all ${claim.limit} free generations this month. Upgrade for unlimited.`,
          code: "quota_exceeded",
          usage: { used: claim.used, limit: claim.limit },
          plan,
        },
        { status: 402 },
      );
    }

    try {
      return await generateFor({
        userId: user.id,
        profile,
        jobDescription,
        langs,
      });
    } catch (error) {
      // The user got nothing, so they keep the generation.
      await releaseGeneration(claim.id);
      throw error;
    }
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    }

    console.error("[generate]", error);
    return NextResponse.json(
      { error: "Generation failed. Try again in a moment." },
      { status: 500 },
    );
  }
}

/**
 * The two AI calls and everything built from them.
 *
 * Split out so the caller can wrap the whole thing in one try and hand the
 * claimed generation back on any failure — including the ones that return an
 * error response rather than throwing, which is why the incomplete-resume case
 * below throws instead.
 */
async function generateFor({
  userId,
  profile,
  jobDescription,
  langs,
}: {
  userId: string;
  profile: MasterProfile;
  jobDescription: string;
  langs: Lang[];
}): Promise<NextResponse> {
  /**
   * Step one: write the resume from the full profile and the posting.
   *
   * Both system prompts stay on the server; the browser never sees either.
   */
  const result = await completeJSON<GenerationResult>(
    RESUME_SYSTEM_PROMPT,
    [
      "Candidate Information:",
      profileToPrompt(profile),
      "",
      "Job Description:",
      jobDescription,
    ].join("\n"),
    { temperature: 0.4 },
  );

  /*
   * Thrown rather than returned, so the caller's catch releases the claimed
   * generation. Returning an error response here would leave the user charged
   * for a resume they never got.
   */
  if (!result?.resume?.experience) {
    throw new DeepSeekError(
      "The model returned an incomplete resume. Try generating again.",
      502,
    );
  }

  /**
   * The AI only ever writes five slots. Education and languages are grafted
   * back on from the stored profile here, so a hallucinated degree or a
   * quietly re-worded date can never reach the document.
   *
   * Job titles, companies and dates are re-anchored the same way — see
   * lib/anchorExperience.ts, which also guarantees that two roles at the
   * same employer stay two distinct roles.
   */
  const { experience: anchored, dropped } = anchorExperience(
    result.resume.experience,
    profile.experience,
  );

  if (dropped.length) {
    console.warn(
      "[generate] dropped unanchored roles",
      dropped.map((d) => `${d.title ?? "?"} @ ${d.company ?? "?"}`),
    );
  }

  const resume: TailoredResume = {
    headline: result.resume.headline ?? profile.personal_information.headline ?? "",
    summary: result.resume.summary ?? "",
    technical_skills: result.resume.technical_skills ?? [],
    experience: anchored,
    interests: result.resume.interests ?? [],
    education: profile.education,
    languages: profile.languages,
    certifications: profile.certifications,
  };

  /**
   * Step two: write the cover letter against the resume just produced.
   *
   * It reads the finished resume rather than the raw profile, so the letter
   * cites the same achievements, in the same words, as the document being
   * attached. That is why this call waits for the first one instead of
   * running alongside it.
   *
   * Only the requested languages are written, and the token ceiling scales
   * with that count. Cyrillic costs more tokens per character than Latin, so
   * the budget leaves headroom — a letter that runs past the limit is cut
   * off mid-sentence.
   */
  const coverLetter = await completeText(
    COVER_LETTER_SYSTEM_PROMPT,
    [
      "Candidate resume (already tailored to this job — quote from this):",
      tailoredResumeToPrompt(resume, profile.personal_information),
      "",
      "Job Description:",
      jobDescription,
      languageInstruction(langs),
    ].join("\n"),
    { temperature: 0.7, maxTokens: coverLetterTokenBudget(langs) },
  );

  const letters = parseCoverLetter(coverLetter);

  // The slot was already taken before the AI calls ran; this only reads the
  // resulting figures back for the UI.
  const after = await getUsage(userId);

  return NextResponse.json({
    resume,
    cover_letter: letters.versions,
    /** Languages in the order asked for: the posting's own language first. */
    cover_letter_order: letters.order,
    matched_keywords: result.matched_keywords ?? [],
    gaps: result.gaps ?? [],
    person: profile.personal_information,
    usage: {
      used: after.used,
      limit: after.limit,
      unlimited: after.unlimited,
      remaining: after.unlimited ? null : after.remaining,
    },
  });
}
