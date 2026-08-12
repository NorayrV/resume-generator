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
  sanitiseLang,
  type Lang,
  type ParsedCoverLetter,
} from "@/lib/coverLetter";
import { anchorExperience } from "@/lib/anchorExperience";
import { currentUser } from "@/lib/supabase/server";
import { getPlanPricing } from "@/lib/polar";
import { claimGeneration, getUsage, releaseGeneration } from "@/lib/usage";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/lib/plan";
import { sanitiseOutputs, type OutputKind } from "@/lib/outputs";
import {
  describeRole,
  draftingInstruction,
  rolesNeedingDraft,
} from "@/lib/draftBullets";
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

    // Which language the cover letter is written in. `languages` is the older
    // field name and still resolves, so a cached client keeps working.
    const lang = sanitiseLang(body?.language ?? body?.languages);

    // Which documents to produce. Defaults to the resume alone; the cover
    // letter is opt-in.
    const outputs = sanitiseOutputs(body?.outputs);

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
      /*
       * Only a free account is offered an upgrade. A Pro subscriber who has
       * worked through their monthly packs needs to know when they come back,
       * not a pitch for the plan they are already paying for.
       */
      if (claim.tier !== "free") {
        return NextResponse.json(
          {
            error: `You have used all ${claim.limit} application packs this month. Each one frees up 30 days after you used it.`,
            usage: { used: claim.used, limit: claim.limit },
          },
          { status: 429 },
        );
      }

      // Send the live price with the refusal, so the upgrade prompt can quote
      // it without a second round trip.
      const plan = await getPlanPricing();

      return NextResponse.json(
        {
          error: `You have used all ${claim.limit} free application packs this month.`,
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
        lang,
        outputs,
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
 * The AI calls and everything built from them.
 *
 * Split out so the caller can wrap the whole thing in one try and hand the
 * claimed generation back on any failure — including the ones that return an
 * error response rather than throwing, which is why the incomplete-resume case
 * below throws instead.
 *
 * Either document can be skipped. The resume costs one call and the letter
 * another, and output tokens are the bulk of what a generation costs, so
 * asking for one produces one.
 */
async function generateFor({
  userId,
  profile,
  jobDescription,
  lang,
  outputs,
}: {
  userId: string;
  profile: MasterProfile;
  jobDescription: string;
  lang: Lang;
  outputs: OutputKind[];
}): Promise<NextResponse> {
  const wantResume = outputs.includes("resume");
  const wantCoverLetter = outputs.includes("cover_letter");

  let resume: TailoredResume | null = null;
  let matchedKeywords: string[] = [];
  let gaps: string[] = [];

  /*
   * Roles the user left blank, so the finished resume can say which bullets
   * were written for them. They are the ones worth reading twice.
   */
  const draftedRoles = wantResume
    ? rolesNeedingDraft(profile).map(describeRole)
    : [];

  if (wantResume) {
    /**
     * Five sections are rewritten for this posting; everything else is
     * restored from the stored profile afterwards.
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
        // Empty when every role has bullets, so a filled-in profile sends
        // exactly what it always did.
        draftingInstruction(profile),
      ].join("\n"),
      { temperature: 0.4 },
    );

    /*
     * Thrown rather than returned, so the caller's catch releases the claimed
     * generation. Returning an error response here would leave the user
     * charged for a resume they never got.
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

    resume = {
      headline:
        result.resume.headline ?? profile.personal_information.headline ?? "",
      summary: result.resume.summary ?? "",
      technical_skills: result.resume.technical_skills ?? [],
      experience: anchored,
      interests: result.resume.interests ?? [],
      education: profile.education,
      languages: profile.languages,
      certifications: profile.certifications,
    };

    // Both readouts describe the resume, so they only exist when one was made.
    matchedKeywords = result.matched_keywords ?? [];
    gaps = result.gaps ?? [];
  }

  let letters: ParsedCoverLetter | null = null;

  if (wantCoverLetter) {
    /**
     * Written against the resume just produced, when there is one, so the
     * letter cites the same achievements in the same words as the document
     * being attached. That is why this call waits for the first rather than
     * running alongside it.
     *
     * On a letter-only run there is no tailored resume to quote, so the stored
     * profile goes in instead. The prompt is written against "the candidate's
     * stored resume/profile" throughout and reads either happily — but the
     * letter is then drawn from the whole profile rather than from a document
     * already narrowed to this posting.
     *
     * Only the requested languages are written, and the token ceiling scales
     * with that count. Cyrillic costs more tokens per character than Latin, so
     * the budget leaves headroom — a letter that runs past the limit is cut
     * off mid-sentence.
     */
    const source = resume
      ? [
          "Candidate resume (already tailored to this job — quote from this):",
          tailoredResumeToPrompt(resume, profile.personal_information),
        ]
      : [
          "Candidate profile (their full stored experience — quote from this):",
          profileToPrompt(profile),
        ];

    const coverLetter = await completeText(
      COVER_LETTER_SYSTEM_PROMPT,
      [
        ...source,
        "",
        "Job Description:",
        jobDescription,
        languageInstruction(lang),
      ].join("\n"),
      { temperature: 0.7, maxTokens: coverLetterTokenBudget() },
    );

    letters = parseCoverLetter(coverLetter);
  }

  // The slot was already taken before the AI calls ran; this only reads the
  // resulting figures back for the UI.
  const after = await getUsage(userId);

  return NextResponse.json({
    /** Which documents this run actually produced. */
    outputs,
    /** Roles whose bullets the model wrote, because none were supplied. */
    drafted_roles: draftedRoles,
    resume,
    cover_letter: letters?.versions ?? null,
    /** Languages in the order asked for: the posting's own language first. */
    cover_letter_order: letters?.order ?? [],
    matched_keywords: matchedKeywords,
    gaps,
    person: profile.personal_information,
    usage: {
      used: after.used,
      limit: after.limit,
      unlimited: after.unlimited,
      remaining: after.unlimited ? null : after.remaining,
    },
  });
}
