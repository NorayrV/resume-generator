"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Alert } from "./ui/alert";
import type {
  ContactEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  MasterProfile,
  ProfileSummary,
} from "@/lib/types";

/**
 * The profile, entered by hand.
 *
 * Nothing here is sent to the AI at save time — this is a plain form that
 * writes data/resume.json. The AI only ever reads the result, at generation.
 *
 * Grouped into one card per topic, with naturally paired fields (from/to,
 * title/company) on a single row so the page stays short enough to scan.
 */

interface Props {
  initial: MasterProfile;
  onSaved: (summary: ProfileSummary) => void;
  /** Shown as "Done" when there is somewhere to go back to. */
  onDone?: () => void;
  /** Fires when the form gains or loses unsaved edits. Must be stable. */
  onDirtyChange?: (dirty: boolean) => void;
}

const linesToArray = (value: string) =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const arrayToLines = (value: string[]) => value.join("\n");

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-body font-semibold tracking-[-0.01em]">{title}</h2>
      {hint && <p className="hint mt-1">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/**
 * One entry in a repeating list, with its own remove control.
 *
 * The remove used to be a 28px icon that deleted a whole job — title,
 * employer, both dates and every bullet — on one click, with no confirm and
 * no undo. It was simultaneously the smallest target in the form and the most
 * destructive thing in it, sitting a thumb's width from the fields you were
 * just typing into.
 *
 * It is 44px now and it asks first, except when the entry is empty and there
 * is nothing to lose. Two taps rather than a dialog: this needs a moment's
 * pause, not an interruption and a trapped focus. Focus moves to the
 * confirmation so a keyboard reader hears what the second press will do, and
 * it disarms on blur or after five seconds so a half-pressed remove never
 * sits there waiting to catch the next click.
 */
function Entry({
  title,
  onRemove,
  empty = false,
  children,
}: {
  title: string;
  onRemove: () => void;
  /** Nothing typed in here yet, so skip the confirm. */
  empty?: boolean;
  children: React.ReactNode;
}) {
  const [arming, setArming] = useState(false);

  useEffect(() => {
    if (!arming) return;
    const id = setTimeout(() => setArming(false), 5000);
    return () => clearTimeout(id);
  }, [arming]);

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-small font-medium text-muted">{title}</span>

        {arming ? (
          <button
            type="button"
            autoFocus
            onClick={onRemove}
            onBlur={() => setArming(false)}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-small font-medium text-flag transition-colors hover:bg-flag-soft"
            aria-label={`Confirm removing ${title}`}
          >
            <X className="h-4 w-4" aria-hidden />
            Remove?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (empty ? onRemove() : setArming(true))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-flag-soft hover:text-flag"
            aria-label={`Remove ${title}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2.5 text-small font-medium text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-text"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function ProfileEditor({
  initial,
  onSaved,
  onDone,
  onDirtyChange,
}: Props) {
  const [profile, setProfile] = useState<MasterProfile>(initial);
  const [skillsText, setSkillsText] = useState(arrayToLines(initial.skills));
  const [interestsText, setInterestsText] = useState(
    arrayToLines(initial.interests),
  );
  const [certsText, setCertsText] = useState(
    arrayToLines(initial.certifications.map((c) => c.name)),
  );

  /*
   * What a save would send. Comparing this against the last saved version is
   * how the form knows it is dirty — exact by construction, because it is the
   * same object the PUT body is built from rather than a parallel guess at
   * which fields count.
   */
  const payload: MasterProfile = {
    ...profile,
    raw_text: initial.raw_text,
    skills: linesToArray(skillsText),
    interests: linesToArray(interestsText),
    certifications: linesToArray(certsText).map((name) => ({ name })),
  };

  /* The baseline runs through the same transformation, so a profile that
     round-trips unchanged does not read as edited the moment it loads. */
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      ...initial,
      raw_text: initial.raw_text,
      skills: linesToArray(arrayToLines(initial.skills)),
      interests: linesToArray(arrayToLines(initial.interests)),
      certifications: linesToArray(
        arrayToLines(initial.certifications.map((c) => c.name)),
      ).map((name) => ({ name })),
    }),
  );

  const dirty = JSON.stringify(payload) !== savedSnapshot;

  /** Armed when "Back to generating" is pressed with edits outstanding. */
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(false), 5000);
    return () => clearTimeout(id);
  }, [leaving]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<{
    message: string;
    profile: MasterProfile;
  } | null>(null);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  /*
   * The only exit this can actually catch. Closing the tab, reloading, or
   * typing a new address all fire beforeunload; an in-app link does not, which
   * is why the save bar states the unsaved count permanently rather than
   * relying on being asked.
   */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const person = profile.personal_information;

  function setPerson<K extends keyof typeof person>(
    key: K,
    value: (typeof person)[K],
  ) {
    setProfile((p) => ({
      ...p,
      personal_information: { ...p.personal_information, [key]: value },
    }));
  }

  function setList<K extends keyof MasterProfile>(
    key: K,
    value: MasterProfile[K],
  ) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  const contacts = person.additional_contacts;
  const updateContact = (i: number, patch: Partial<ContactEntry>) =>
    setPerson(
      "additional_contacts",
      contacts.map((c, j) => (i === j ? { ...c, ...patch } : c)),
    );

  const updateRole = (i: number, patch: Partial<ExperienceEntry>) =>
    setList(
      "experience",
      profile.experience.map((r, j) => (i === j ? { ...r, ...patch } : r)),
    );

  const updateSchool = (i: number, patch: Partial<EducationEntry>) =>
    setList(
      "education",
      profile.education.map((e, j) => (i === j ? { ...e, ...patch } : e)),
    );

  const updateLanguage = (i: number, patch: Partial<LanguageEntry>) =>
    setList(
      "languages",
      profile.languages.map((l, j) => (i === j ? { ...l, ...patch } : l)),
    );

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    setManual(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      if (data.persisted === false) {
        setManual({ message: data.message, profile: data.profile });
      } else {
        setSaved(true);
        // This is the clean state now, so the form stops reading as edited.
        setSavedSnapshot(JSON.stringify(payload));
        setTimeout(() => setSaved(false), 2500);
      }

      onSaved(data.summary);
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * A real form, which it was not before: 32 inputs in loose divs, so Enter
   * did nothing, the browser could not validate, and nothing marked the one
   * field the resume cannot be built without.
   */
  function submit(event: React.FormEvent) {
    event.preventDefault();
    save();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {/* ---- Contact ---------------------------------------------------- */}
      {/*
        The five fields below carry autocomplete tokens. WCAG 1.3.5 asks for
        the purpose of a field collecting the user's own details to be
        programmatically identifiable, and these are the exact fields it names
        — but the practical reason is better: this is the first form a new
        account meets, often on a phone, and four of these are things the
        browser already knows. The repeating employer and school fields
        deliberately have none: there is no token for "a job I held in 2019",
        and organization/organization-title would make the browser fill the
        same employer into every role.
      */}
      <Card
        title="Contact details"
        hint="These print at the top of the resume. Only your name is required."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={person.full_name}
                onChange={(e) => setPerson("full_name", e.target.value)}
                required
                autoComplete="name"
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Location">
              <Input
                value={person.location ?? ""}
                onChange={(e) => setPerson("location", e.target.value)}
                autoComplete="address-level2"
                placeholder="Berlin, Germany"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={person.phone ?? ""}
                onChange={(e) => setPerson("phone", e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+49 30 1234567"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={person.email ?? ""}
                onChange={(e) => setPerson("email", e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
              />
            </Field>
          </div>

          <Field label="LinkedIn">
            <Input
              value={person.linkedin ?? ""}
              onChange={(e) => setPerson("linkedin", e.target.value)}
              autoComplete="url"
              inputMode="url"
              placeholder="linkedin.com/in/your-handle"
            />
          </Field>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <span className="label">Other links</span>
              {contacts.map((contact, i) => (
                /*
                  Stacked below sm. Side by side on a 375px screen the fixed
                  144px label left the value 101px — eight characters, for a
                  field holding a handle or a URL.
                */
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Input
                      className="sm:w-36 sm:shrink-0"
                      value={contact.label}
                      onChange={(e) =>
                        updateContact(i, { label: e.target.value })
                      }
                      placeholder="Telegram"
                      aria-label={`Link ${i + 1} label`}
                    />
                    <Input
                      value={contact.value}
                      onChange={(e) =>
                        updateContact(i, { value: e.target.value })
                      }
                      placeholder="@your_handle"
                      aria-label={`Link ${i + 1} value`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPerson(
                        "additional_contacts",
                        contacts.filter((_, j) => j !== i),
                      )
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-flag-soft hover:text-flag"
                    aria-label={`Remove link ${i + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          <AddButton
            label="Add another link"
            onClick={() =>
              setPerson("additional_contacts", [
                ...contacts,
                { label: "", value: "" },
              ])
            }
          />
        </div>
      </Card>

      {/* ---- Skills ----------------------------------------------------- */}
      <Card
        title="Skills"
        hint="One per line. List everything you can back up — the generator picks the ones each job asks for."
      >
        <Textarea
          rows={6}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder={"SQL\nPython\nTableau\nExcel"}
          aria-label="Skills, one per line"
        />
      </Card>

      {/* ---- Experience -------------------------------------------------- */}
      <Card
        title="Work experience"
        hint="Newest first. Describing a role is optional — what you write is rewritten for each posting and never replaced, and what you leave blank is written for you."
      >
        <div className="space-y-3">
          {profile.experience.map((role, i) => (
            <Entry
              key={i}
              empty={
                !role.title &&
                !role.company &&
                !role.location &&
                !role.start_date &&
                !role.end_date &&
                role.bullets.length === 0
              }
              title={role.title || role.company || `Role ${i + 1}`}
              onRemove={() =>
                setList(
                  "experience",
                  profile.experience.filter((_, j) => j !== i),
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Job title">
                  <Input
                    value={role.title}
                    onChange={(e) => updateRole(i, { title: e.target.value })}
                    placeholder="Data Analyst"
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={role.company}
                    onChange={(e) => updateRole(i, { company: e.target.value })}
                    placeholder="Acme Analytics"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Location">
                  <Input
                    value={role.location ?? ""}
                    onChange={(e) =>
                      updateRole(i, { location: e.target.value })
                    }
                    placeholder="Remote"
                  />
                </Field>
                <Field label="From">
                  <Input
                    value={role.start_date}
                    onChange={(e) =>
                      updateRole(i, { start_date: e.target.value })
                    }
                    placeholder="Apr 2024"
                  />
                </Field>
                <Field label="To">
                  <Input
                    value={role.end_date}
                    onChange={(e) =>
                      updateRole(i, { end_date: e.target.value })
                    }
                    placeholder="Present"
                  />
                </Field>
              </div>

              <Field label="What you did — one bullet per line (optional)">
                <Textarea
                  rows={4}
                  value={arrayToLines(role.bullets)}
                  onChange={(e) =>
                    updateRole(i, { bullets: e.target.value.split("\n") })
                  }
                  placeholder={
                    "Built Tableau dashboards tracking operational KPIs for leadership\nOptimised pricing strategy, contributing to an 80% increase in gross revenue"
                  }
                />
                <span className="hint mt-1.5 block">
                  {(role.bullets ?? []).some((b) => b.trim())
                    ? "Your own words. Rewritten for each posting, never replaced."
                    : "Left blank, so this role will be written for you from the job title and your skills — general duties only, no numbers. Read it before you send it."}
                </span>
              </Field>
            </Entry>
          ))}

          <AddButton
            label="Add role"
            onClick={() =>
              setList("experience", [
                ...profile.experience,
                {
                  title: "",
                  company: "",
                  location: "",
                  start_date: "",
                  end_date: "",
                  bullets: [],
                },
              ])
            }
          />
        </div>
      </Card>

      {/* ---- Education --------------------------------------------------- */}
      <Card title="Education">
        <div className="space-y-3">
          {profile.education.map((school, i) => (
            <Entry
              key={i}
              empty={
                !school.institution &&
                !school.degree &&
                !school.field_of_study &&
                !school.location &&
                !school.start_date &&
                !school.end_date
              }
              title={school.institution || `Education ${i + 1}`}
              onRemove={() =>
                setList(
                  "education",
                  profile.education.filter((_, j) => j !== i),
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Institution">
                  <Input
                    value={school.institution}
                    onChange={(e) =>
                      updateSchool(i, { institution: e.target.value })
                    }
                    placeholder="University of Example"
                  />
                </Field>
                <Field label="Degree">
                  <Input
                    value={school.degree}
                    onChange={(e) =>
                      updateSchool(i, { degree: e.target.value })
                    }
                    placeholder="BSc"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Field of study">
                  <Input
                    value={school.field_of_study ?? ""}
                    onChange={(e) =>
                      updateSchool(i, { field_of_study: e.target.value })
                    }
                    placeholder="Economics and Business"
                  />
                </Field>
                <Field label="From">
                  <Input
                    value={school.start_date ?? ""}
                    onChange={(e) =>
                      updateSchool(i, { start_date: e.target.value })
                    }
                    placeholder="2021"
                  />
                </Field>
                <Field label="To">
                  <Input
                    value={school.end_date ?? ""}
                    onChange={(e) =>
                      updateSchool(i, { end_date: e.target.value })
                    }
                    placeholder="2025"
                  />
                </Field>
              </div>

              <Field label="Notes — one per line, optional">
                <Textarea
                  rows={2}
                  value={arrayToLines(school.details ?? [])}
                  onChange={(e) =>
                    updateSchool(i, { details: e.target.value.split("\n") })
                  }
                  placeholder="Thesis on consumer credit risk modelling"
                />
              </Field>
            </Entry>
          ))}

          <AddButton
            label="Add education"
            onClick={() =>
              setList("education", [
                ...profile.education,
                {
                  institution: "",
                  degree: "",
                  field_of_study: "",
                  start_date: "",
                  end_date: "",
                  details: [],
                },
              ])
            }
          />
        </div>
      </Card>

      {/* ---- Extras ------------------------------------------------------ */}
      <Card
        title="Languages, certifications and interests"
        hint="These print at the bottom. Interests are filtered per job; the rest always print in full."
      >
        <div className="space-y-5">
          <div>
            <span className="label">Languages</span>
            <div className="space-y-2">
              {profile.languages.map((lang, i) => (
                /* Same squeeze: the language name had 85px, six characters. */
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Input
                      value={lang.language}
                      onChange={(e) =>
                        updateLanguage(i, { language: e.target.value })
                      }
                      placeholder="English"
                      aria-label={`Language ${i + 1}`}
                    />
                    <Input
                      className="sm:w-40 sm:shrink-0"
                      value={lang.proficiency ?? ""}
                      onChange={(e) =>
                        updateLanguage(i, { proficiency: e.target.value })
                      }
                      placeholder="Native"
                      aria-label={`Language ${i + 1} level`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setList(
                        "languages",
                        profile.languages.filter((_, j) => j !== i),
                      )
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-flag-soft hover:text-flag"
                    aria-label={`Remove language ${i + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              <AddButton
                label="Add language"
                onClick={() =>
                  setList("languages", [
                    ...profile.languages,
                    { language: "", proficiency: "" },
                  ])
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Certifications — one per line">
              <Textarea
                rows={3}
                value={certsText}
                onChange={(e) => setCertsText(e.target.value)}
                placeholder="CFA Level I Candidate"
              />
            </Field>

            <Field label="Interests — one per line">
              <Textarea
                rows={3}
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
                placeholder={"Chess\nFinancial markets"}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/*
        The outcome of a save, for anyone not watching the button change from
        "Save profile" to "Saved". Nothing else here is a live region: the
        Alert below is ordinary markup, so a failure was announced to nobody.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {saving
          ? "Saving your profile."
          : saved
            ? "Profile saved."
            : error
              ? `Could not save your profile. ${error}`
              : ""}
      </p>

      {error && <Alert tone="error">{error}</Alert>}

      {manual && (
        <div className="space-y-3">
          <Alert tone="info">{manual.message}</Alert>
          <pre className="max-h-72 overflow-auto rounded-md border border-line bg-surface p-4 text-[0.75rem] leading-relaxed">
            {JSON.stringify(manual.profile, null, 2)}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(
                JSON.stringify(manual.profile, null, 2),
              )
            }
          >
            Copy JSON
          </Button>
        </div>
      )}

      {/* The form is long; the primary action follows you down it. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button size="lg" type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saved && <Check className="h-4 w-4" aria-hidden />}
            {saved ? "Saved" : "Save profile"}
          </Button>

          {onDone &&
            (leaving ? (
              <Button
                variant="danger"
                autoFocus
                onClick={onDone}
                onBlur={() => setLeaving(false)}
              >
                Leave without saving?
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => (dirty ? setLeaving(true) : onDone())}
                disabled={saving}
              >
                Back to generating
              </Button>
            ))}

          {/*
            Stated, not asked. Every other way out of this page is an in-app
            link — the header's Generate and Account tabs, the logo, sign out —
            and the App Router gives no navigation event to intercept, so the
            only honest guard is for the bar that follows you down the form to
            say, permanently, that the work is not saved yet.
          */}
          {dirty && !saving && (
            <span className="ml-auto text-small text-muted">
              Unsaved changes
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
