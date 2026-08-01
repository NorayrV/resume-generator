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
} from "@/lib/coverLetter";
import { currentUser } from "@/lib/supabase/server";
import { getPlanPricing } from "@/lib/polar";
import { getUsage, recordGeneration } from "@/lib/usage";
import type { GenerationResult, TailoredResume } from "@/lib/types";

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

    /**
     * Check the meter before spending anything. Generation costs two API
     * calls, so the limit has to be enforced here rather than in the UI —
     * the button being hidden is a courtesy, not a control.
     */
    const usage = await getUsage(user.id);

    if (!usage.allowed) {
      // Send the live price with the refusal, so the upgrade prompt can quote
      // it without a second round trip.
      const plan = await getPlanPricing();

      return NextResponse.json(
        {
          error: `You have used all ${usage.limit} free generations this month. Upgrade for unlimited.`,
          code: "quota_exceeded",
          usage: { used: usage.used, limit: usage.limit },
          plan,
        },
        { status: 402 },
      );
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

    if (!result?.resume?.experience) {
      return NextResponse.json(
        { error: "The model returned an incomplete resume. Try generating again." },
        { status: 502 },
      );
    }

    /**
     * The AI only ever writes five slots. Education and languages are grafted
     * back on from the stored profile here, so a hallucinated degree or a
     * quietly re-worded date can never reach the document.
     *
     * Job titles, companies and dates are re-anchored the same way: we match
     * each returned role back to the profile and overwrite its metadata with
     * the stored values, keeping only the bullets the AI wrote.
     */
    const anchored = result.resume.experience.map((role) => {
      const source =
        profile.experience.find(
          (r) =>
            r.company.toLowerCase().trim() === role.company?.toLowerCase().trim(),
        ) ??
        profile.experience.find(
          (r) => r.title.toLowerCase().trim() === role.title?.toLowerCase().trim(),
        );

      return {
        company: source?.company ?? role.company,
        title: source?.title ?? role.title,
        location: source?.location ?? role.location,
        start_date: source?.start_date ?? role.start_date,
        end_date: source?.end_date ?? role.end_date,
        bullets: role.bullets ?? [],
      };
    });

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

    // Only meter a run that actually produced something. A failure above
    // throws, so the user is never charged for a generation they did not get.
    await recordGeneration(user.id);
    const after = await getUsage(user.id);

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
