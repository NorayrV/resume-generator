import { supabaseAdmin, supabaseServer } from "./supabase/server";
import {
  EMPTY_PROFILE,
  type MasterProfile,
  type PersonalInformation,
  type ProfileSummary,
  type TailoredResume,
} from "./types";

/**
 * Where a candidate profile lives.
 *
 * One row per user in the `profiles` table, keyed by their auth id. Reads and
 * writes go through the user-scoped client, so Row Level Security guarantees
 * a user can only ever touch their own row — application bugs included.
 *
 * This used to be a single data/resume.json on disk, which could only ever
 * hold one person.
 */

/** Read the signed-in user's profile. Returns null when nothing is entered yet. */
export async function loadProfile(): Promise<MasterProfile | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.data) return null;

  const parsed = data.data as Partial<MasterProfile>;
  return isEmpty(parsed) ? null : normalise(parsed);
}

/** Read the profile for editing — returns a blank one rather than null. */
export async function loadProfileForEditing(): Promise<MasterProfile> {
  return (await loadProfile()) ?? EMPTY_PROFILE;
}

export type SaveOutcome =
  | { persisted: true; profile: MasterProfile }
  | { persisted: false; reason: string; profile: MasterProfile };

/** Write the signed-in user's profile. */
export async function saveProfile(profile: MasterProfile): Promise<SaveOutcome> {
  const withTimestamp: MasterProfile = {
    ...normalise(profile),
    updated_at: new Date().toISOString(),
  };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      persisted: false,
      reason: "You are not signed in. Reload the page and sign in again.",
      profile: withTimestamp,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, data: withTimestamp, updated_at: withTimestamp.updated_at },
      { onConflict: "user_id" },
    );

  if (error) {
    return {
      persisted: false,
      reason: "Could not save your profile. Please try again.",
      profile: withTimestamp,
    };
  }

  return { persisted: true, profile: withTimestamp };
}

/**
 * Read a profile by user id, bypassing RLS.
 *
 * Only for server work that already knows which user it is acting for and
 * cannot go through the request-scoped client.
 */
export async function loadProfileForUser(
  userId: string,
): Promise<MasterProfile | null> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.data) return null;

  const parsed = data.data as Partial<MasterProfile>;
  return isEmpty(parsed) ? null : normalise(parsed);
}

function isEmpty(profile: Partial<MasterProfile> | null): boolean {
  if (!profile) return true;
  return (
    !profile.personal_information?.full_name &&
    (profile.experience?.length ?? 0) === 0 &&
    (profile.skills?.length ?? 0) === 0
  );
}

/** Drop blank rows and fill missing arrays, so nothing downstream null-checks. */
export function normalise(profile: Partial<MasterProfile>): MasterProfile {
  const p = profile.personal_information;

  return {
    personal_information: {
      full_name: p?.full_name?.trim() ?? "",
      location: p?.location?.trim() || undefined,
      phone: p?.phone?.trim() || undefined,
      email: p?.email?.trim() || undefined,
      linkedin: p?.linkedin?.trim() || undefined,
      additional_contacts: (p?.additional_contacts ?? []).filter(
        (c) => c.label?.trim() && c.value?.trim(),
      ),
      headline: p?.headline?.trim() || undefined,
    },
    skills: (profile.skills ?? []).map((s) => s.trim()).filter(Boolean),
    experience: (profile.experience ?? [])
      .filter((r) => r.company?.trim() || r.title?.trim())
      .map((r) => ({
        ...r,
        bullets: (r.bullets ?? []).map((b) => b.trim()).filter(Boolean),
      })),
    education: (profile.education ?? []).filter(
      (e) => e.institution?.trim() || e.degree?.trim(),
    ),
    languages: (profile.languages ?? []).filter((l) => l.language?.trim()),
    certifications: (profile.certifications ?? []).filter((c) => c.name?.trim()),
    interests: (profile.interests ?? []).map((i) => i.trim()).filter(Boolean),
    raw_text: profile.raw_text,
    updated_at: profile.updated_at,
  };
}

/** The compact readout shown in the header strip. */
export function summarise(profile: MasterProfile | null): ProfileSummary {
  if (!profile) return { exists: false };

  return {
    exists: true,
    full_name: profile.personal_information.full_name,
    role_count: profile.experience.length,
    skill_count: profile.skills.length,
    updated_at: profile.updated_at,
  };
}

/**
 * Flatten the profile into the text block sent to the model. Plain text costs
 * far fewer tokens than pretty-printed JSON and the model reads it just as well.
 */
export function profileToPrompt(profile: MasterProfile): string {
  const p = profile.personal_information;
  const lines: string[] = [];

  lines.push("CANDIDATE");
  lines.push([p.full_name, p.location].filter(Boolean).join(" | ") || "-");

  const contact = [
    p.email,
    p.phone,
    p.linkedin,
    ...p.additional_contacts.map((c) => `${c.label}: ${c.value}`),
  ]
    .filter(Boolean)
    .join(" | ");
  if (contact) lines.push(contact);

  if (profile.experience.length) {
    lines.push("\nEXPERIENCE");
    for (const role of profile.experience) {
      lines.push(
        `\n${role.title} - ${role.company}${role.location ? `, ${role.location}` : ""} (${role.start_date} to ${role.end_date})`,
      );
      for (const b of role.bullets) lines.push(`- ${b}`);
    }
  }

  if (profile.skills.length) {
    lines.push(`\nSKILLS\n${profile.skills.join(", ")}`);
  }

  if (profile.education.length) {
    lines.push("\nEDUCATION");
    for (const ed of profile.education) {
      lines.push(
        `${ed.degree}${ed.field_of_study ? `, ${ed.field_of_study}` : ""} - ${ed.institution} (${ed.start_date ?? ""} to ${ed.end_date ?? ""})`,
      );
      for (const d of ed.details ?? []) lines.push(`- ${d}`);
    }
  }

  if (profile.certifications.length) {
    lines.push("\nCERTIFICATIONS");
    for (const c of profile.certifications) {
      lines.push(
        `${c.name}${c.issuer ? ` - ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`,
      );
    }
  }

  if (profile.languages.length) {
    lines.push(
      `\nLANGUAGES\n${profile.languages
        .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
        .join(", ")}`,
    );
  }

  if (profile.interests.length) {
    lines.push(`\nINTERESTS\n${profile.interests.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Render the finished resume as plain text for the cover letter call.
 *
 * The letter is written second, against the resume that will actually be
 * sent — so it can reference the same bullets, in the same words, instead of
 * picking independently from the full profile.
 */
export function tailoredResumeToPrompt(
  resume: TailoredResume,
  person: PersonalInformation,
): string {
  const lines: string[] = [];

  lines.push(person.full_name);
  if (resume.headline) lines.push(resume.headline);
  if (resume.summary) lines.push(`\nSUMMARY\n${resume.summary}`);

  if (resume.technical_skills?.length) {
    lines.push("\nTECHNICAL SKILLS");
    for (const group of resume.technical_skills) {
      lines.push(`${group.category}: ${group.items.join(", ")}`);
    }
  }

  if (resume.experience?.length) {
    lines.push("\nWORK EXPERIENCE");
    for (const role of resume.experience) {
      lines.push(
        `\n${role.title} - ${role.company}${role.location ? `, ${role.location}` : ""} (${role.start_date} to ${role.end_date})`,
      );
      for (const b of role.bullets) lines.push(`- ${b}`);
    }
  }

  if (resume.education?.length) {
    lines.push("\nEDUCATION");
    for (const ed of resume.education) {
      lines.push(
        `${ed.degree}${ed.field_of_study ? `, ${ed.field_of_study}` : ""} - ${ed.institution} (${ed.start_date ?? ""} to ${ed.end_date ?? ""})`,
      );
    }
  }

  if (resume.languages?.length) {
    lines.push(
      `\nLANGUAGES\n${resume.languages
        .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
        .join(", ")}`,
    );
  }

  return lines.join("\n");
}
