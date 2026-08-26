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

/**
 * Ceilings on a stored profile.
 *
 * Nothing bounded this before, and the profile is not just a row in a table:
 * every generation flattens the whole thing into the prompt, so an oversized
 * profile is re-sent to DeepSeek on every run, for as long as it exists. A
 * single bad write therefore became a recurring bill and a permanently slow
 * account.
 *
 * These are far above any real career — the longest genuine profile in the
 * database uses a small fraction of them — so trimming here is silent by
 * design. It bounds abuse, it does not shape ordinary use.
 */
const CAP = {
  field: 300,
  bullet: 1_000,
  bulletsPerRole: 60,
  roles: 50,
  skills: 300,
  education: 30,
  languages: 40,
  certifications: 60,
  contacts: 20,
  rawText: 20_000,
} as const;

const cut = (value: string | undefined | null, max: number): string =>
  (value ?? "").trim().slice(0, max);

/** Trimmed, capped, and dropped if empty. */
const cutOrNone = (value: string | undefined | null, max: number) =>
  cut(value, max) || undefined;

/** Drop blank rows, fill missing arrays and bound every size. */
export function normalise(profile: Partial<MasterProfile>): MasterProfile {
  const p = profile.personal_information;

  return {
    personal_information: {
      full_name: cut(p?.full_name, CAP.field),
      location: cutOrNone(p?.location, CAP.field),
      phone: cutOrNone(p?.phone, CAP.field),
      email: cutOrNone(p?.email, CAP.field),
      linkedin: cutOrNone(p?.linkedin, CAP.field),
      additional_contacts: (p?.additional_contacts ?? [])
        .filter((c) => c.label?.trim() && c.value?.trim())
        .slice(0, CAP.contacts)
        .map((c) => ({
          label: cut(c.label, CAP.field),
          value: cut(c.value, CAP.field),
        })),
      headline: cutOrNone(p?.headline, CAP.field),
    },
    skills: (profile.skills ?? [])
      .map((s) => cut(s, CAP.field))
      .filter(Boolean)
      .slice(0, CAP.skills),
    experience: (profile.experience ?? [])
      .filter((r) => r.company?.trim() || r.title?.trim())
      .slice(0, CAP.roles)
      .map((r) => ({
        ...r,
        company: cut(r.company, CAP.field),
        title: cut(r.title, CAP.field),
        location: cutOrNone(r.location, CAP.field),
        start_date: cut(r.start_date, CAP.field),
        end_date: cut(r.end_date, CAP.field),
        bullets: (r.bullets ?? [])
          .map((b) => cut(b, CAP.bullet))
          .filter(Boolean)
          .slice(0, CAP.bulletsPerRole),
      })),
    education: (profile.education ?? [])
      .filter((e) => e.institution?.trim() || e.degree?.trim())
      .slice(0, CAP.education)
      .map((e) => ({
        ...e,
        institution: cut(e.institution, CAP.field),
        degree: cut(e.degree, CAP.field),
        field_of_study: cutOrNone(e.field_of_study, CAP.field),
        location: cutOrNone(e.location, CAP.field),
        start_date: cutOrNone(e.start_date, CAP.field),
        end_date: cutOrNone(e.end_date, CAP.field),
        details: (e.details ?? [])
          .map((d) => cut(d, CAP.bullet))
          .filter(Boolean)
          .slice(0, CAP.bulletsPerRole),
      })),
    languages: (profile.languages ?? [])
      .filter((l) => l.language?.trim())
      .slice(0, CAP.languages)
      .map((l) => ({
        language: cut(l.language, CAP.field),
        proficiency: cutOrNone(l.proficiency, CAP.field),
      })),
    certifications: (profile.certifications ?? [])
      .filter((c) => c.name?.trim())
      .slice(0, CAP.certifications)
      .map((c) => ({
        name: cut(c.name, CAP.field),
        issuer: cutOrNone(c.issuer, CAP.field),
        date: cutOrNone(c.date, CAP.field),
      })),
    raw_text: profile.raw_text
      ? profile.raw_text.slice(0, CAP.rawText)
      : undefined,
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
