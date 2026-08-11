import type { MasterProfile, ExperienceEntry } from "./types";

/**
 * Writing experience bullets for roles the candidate left blank.
 *
 * Filling in four bullets per role is the heaviest part of setting up a
 * profile, so the field is optional: describe a role yourself and the resume
 * uses your words, or leave it empty and the model writes it.
 *
 * The model already did this before there was any instruction for it — the
 * prompt demands "at least 4 bullets" and also "never invent", and with no
 * source material it resolved that by copying the job description's
 * responsibilities back as the candidate's own history. Measured on a real
 * generation, an empty profile produced eight bullets, claimed a tool the
 * candidate had never listed, and then reported that tool as covered rather
 * than as a gap.
 *
 * So this is not new behaviour. It makes the behaviour deliberate, names
 * exactly which roles may be written, and puts limits on what a written
 * bullet may claim — none of which existed while it was happening by
 * accident.
 */

/** A role counts as needing drafting when the user gave it nothing to rewrite. */
export function rolesNeedingDraft(profile: MasterProfile): ExperienceEntry[] {
  return profile.experience.filter(
    (role) => (role.bullets ?? []).filter((b) => b.trim()).length === 0,
  );
}

/** How a role is named to the model, matching how profileToPrompt prints it. */
export function describeRole(role: ExperienceEntry): string {
  return `${role.title || "Untitled role"} - ${role.company || "Unnamed employer"}`;
}

/**
 * Instruction appended to the resume request, naming the blank roles.
 *
 * Returns an empty string when every role has bullets, so a fully filled-in
 * profile sends exactly what it always did.
 */
export function draftingInstruction(profile: MasterProfile): string {
  const blank = rolesNeedingDraft(profile);
  if (blank.length === 0) return "";

  const skills = profile.skills.length
    ? profile.skills.join(", ")
    : "(none listed)";

  return [
    "",
    "==================================================",
    "ROLES WITH NO SUPPLIED BULLETS — WRITE THESE",
    "==================================================",
    "",
    "The candidate left the description blank for these roles:",
    ...blank.map((role) => `  - ${describeRole(role)}`),
    "",
    "For those roles ONLY, write the bullets yourself, from the job title,",
    "the employer, the candidate's own skills, and the terminology of the",
    "job description.",
    "",
    "Limits on bullets you write yourself:",
    "",
    "1. No numbers. No percentages, revenue figures, team sizes, budgets,",
    "   timeframes or named awards. You have no source for any of them, and",
    "   an invented metric is the single easiest claim for an interviewer to",
    "   disprove.",
    "",
    "2. Describe the ordinary duties of that job title at that kind of",
    "   employer. Do not describe achievements, which are specific to a",
    "   person and cannot be guessed.",
    "",
    "3. Three or four bullets is right for these roles.",
    "",
    "Roles that DID come with bullets are unaffected: rewrite what is there",
    "for this posting and invent nothing.",
    "",
    "--------------------------------------------------",
    "THE SKILL LIST IS CLOSED — THIS APPLIES EVERYWHERE",
    "--------------------------------------------------",
    "",
    "This is the complete set of tools, technologies and skills the",
    "candidate has actually claimed:",
    "",
    `  ${skills}`,
    "",
    "Nothing outside that list may appear anywhere in the resume you",
    "return — not in a bullet you wrote, not in a bullet you rewrote, and",
    "not in TECHNICAL SKILLS. A tool named in the job description but",
    "absent from that list is a requirement this candidate does not meet.",
    "Wanting someone who knows a tool is not evidence that this candidate",
    "knows it.",
    "",
    "Writing bullets for a blank role does not widen that list. The role",
    "having no description means less is known about the candidate, not",
    "more.",
    "",
    "Every required tool, technology, certification or methodology that is",
    "NOT in the list above must appear in \"gaps\". Returning an empty gaps",
    "array while the job description names tools the candidate has not",
    "claimed is wrong, and is the specific failure this instruction exists",
    "to prevent.",
  ].join("\n");
}
