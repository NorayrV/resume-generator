/**
 * Every shape the app passes around lives here, so the profile editor, the
 * AI response and the DOCX writer can never drift apart.
 */

/** A freeform contact line, e.g. { label: "Telegram", value: "@your_handle" }. */
export interface ContactEntry {
  label: string;
  value: string;
}

export interface PersonalInformation {
  full_name: string;
  location?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  /** Anything else you want on the contact line, in the order you enter it. */
  additional_contacts: ContactEntry[];
  /**
   * Written by the AI per application, not entered by you. Stored on the
   * profile only as a fallback if a generation ever comes back without one.
   */
  headline?: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field_of_study?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  details?: string[];
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date: string;
  bullets: string[];
}

export interface CertificationEntry {
  name: string;
  issuer?: string;
  date?: string;
}

export interface LanguageEntry {
  language: string;
  proficiency?: string;
}

/** The permanent candidate profile. Entered by hand, edited whenever. */
export interface MasterProfile {
  personal_information: PersonalInformation;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: LanguageEntry[];
  certifications: CertificationEntry[];
  /** Exactly what you pasted, kept so the simple editor can show it again. */
  raw_text?: string;
  updated_at?: string;
}

/** Skills grouped by category — ATS parsers read grouped lists more reliably. */
export interface SkillGroup {
  category: string;
  items: string[];
}

/**
 * One tailored resume, rewritten for a single job description.
 *
 * Only four things here are written by the AI:
 *   headline, summary, technical_skills, each role's bullets.
 *
 * Everything else — employers, titles, dates, education, languages — is
 * copied through from the stored profile untouched. The AI is never asked
 * to produce them, so it cannot quietly change a date or a job title.
 */
export interface TailoredResume {
  /** One line under the name, aimed at this specific job. */
  headline: string;
  summary: string;
  technical_skills: SkillGroup[];
  experience: ExperienceEntry[];

  /** Copied from the profile, not generated. */
  education: EducationEntry[];
  languages: LanguageEntry[];
  certifications?: CertificationEntry[];
}

/**
 * A number the resume would be stronger for, that the profile does not hold.
 *
 * The model writes the bullet without the figure rather than inventing one,
 * and asks here instead. Answering one means editing the profile and
 * generating again — so these are a prompt to improve the source, not a
 * placeholder sitting in the finished document.
 */
export interface OpenQuestion {
  /** Which role the question is about, copied from the profile. */
  company: string;
  /** Which bullet within that role, 0-based. */
  bullet_index: number;
  question: string;
}

/** The cover letter call returns both language versions. */
export interface CoverLetterVersions {
  english: string;
  russian: string;
  spanish: string;
}

/**
 * What the resume API call returns. The cover letter is a separate call that
 * returns plain text, so it is not part of this shape.
 */
export interface GenerationResult {
  resume: TailoredResume;
  /** Figures the profile is missing, asked rather than invented. */
  open_questions?: OpenQuestion[];
  /** Keywords lifted from the job description that made it into the resume. */
  matched_keywords: string[];
  /** Requirements in the job description the profile does not evidence. */
  gaps: string[];
}

/** What the UI needs to render the loaded-profile strip. */
export interface ProfileSummary {
  exists: boolean;
  full_name?: string;
  role_count?: number;
  skill_count?: number;
  updated_at?: string;
}

export const EMPTY_PROFILE: MasterProfile = {
  personal_information: { full_name: "", additional_contacts: [] },
  skills: [],
  experience: [],
  education: [],
  languages: [],
  certifications: [],
};
