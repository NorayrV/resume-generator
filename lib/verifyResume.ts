import "server-only";

import type { MasterProfile } from "./types";

/**
 * Deterministic checks the model cannot talk its way past.
 *
 * `response_format: json_object` guarantees valid JSON syntax. It guarantees
 * nothing about the schema and nothing at all about whether the content is
 * true, which is the only thing that matters for a document someone will be
 * interviewed against.
 *
 * lib/anchorExperience.ts already restores company, title and dates from the
 * stored profile, so a re-worded employer cannot reach the page. What it
 * cannot see is the inside of a bullet — and an invented metric is both the
 * most tempting thing for a model to add and the easiest thing for an
 * interviewer to disprove. That is what this is for.
 *
 * Two checks, in the order they catch things:
 *
 *   provenance — every bullet carries an excerpt the model says supports it,
 *                and that excerpt has to actually appear in the profile.
 *   figures    — every number in a bullet has to appear in the profile too.
 *
 * Roles the candidate left blank are exempt from the first check and not the
 * second. lib/draftBullets.ts asks the model to write those bullets from the
 * job title and the employer, so there is no excerpt to quote — but that same
 * instruction forbids numbers outright, so a figure appearing in one is a
 * fabrication by definition rather than an unsourced quote.
 */

/** A bullet as the model returns it, before the evidence is discarded. */
export interface RawBullet {
  text: string;
  evidence?: string;
}

/** A role as the model returns it. */
export interface RawRole {
  company?: string;
  title?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets?: RawBullet[];
}

/** Enough of an excerpt to be worth checking. Shorter is not provenance. */
const MIN_EVIDENCE_CHARS = 15;

/** Compare on a prefix: models trim and re-punctuate the tail of a quote. */
const EVIDENCE_PREFIX = 40;

/**
 * Did the candidate leave this role's description blank?
 *
 * Matched on company and title together, because two roles at one employer
 * are two roles — the same reason anchorExperience matches on the pair.
 */
function wasDrafted(role: RawRole, profile: MasterProfile): boolean {
  const same = (a?: string, b?: string) =>
    (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

  const stored = profile.experience.find(
    (r) => same(r.company, role.company) && same(r.title, role.title),
  );

  // An unmatched role is not "drafted" — it is unanchored, and
  // anchorExperience drops it. Checking it here would only add noise.
  if (!stored) return false;

  return (stored.bullets ?? []).every((b) => !b.trim());
}

/**
 * Everything wrong with this generation, in plain sentences.
 *
 * An empty array means the output survived every check. A non-empty one is
 * for the log and for the decision about whether to serve the result.
 */
export function findFabrications(
  experience: RawRole[],
  profile: MasterProfile,
): string[] {
  const haystack = JSON.stringify(profile).toLowerCase();
  const problems: string[] = [];

  for (const role of experience ?? []) {
    const where = role.company ?? "unnamed role";
    const drafted = wasDrafted(role, profile);

    for (const [i, bullet] of (role.bullets ?? []).entries()) {
      if (!drafted) {
        const excerpt = (bullet.evidence ?? "").toLowerCase().trim();
        if (
          excerpt.length < MIN_EVIDENCE_CHARS ||
          !haystack.includes(excerpt.slice(0, EVIDENCE_PREFIX))
        ) {
          problems.push(`${where} bullet ${i}: evidence not found in profile`);
        }
      }

      /*
       * Figures. A bare "4" matches almost any profile by accident, so only
       * numbers of two characters or more are checked — which is where the
       * damage lives anyway: "40%", "1.2M", "15 people".
       */
      for (const found of bullet.text?.match(/\d[\d,.]*\s?%?/g) ?? []) {
        const clean = found.trim().replace(/[,.]$/, "");
        if (clean.length > 1 && !haystack.includes(clean.toLowerCase())) {
          problems.push(`${where} bullet ${i}: figure "${clean}" not in profile`);
        }
      }
    }
  }

  return problems;
}

/**
 * Drop the evidence and hand back plain bullets.
 *
 * The excerpts exist to be checked, not to be read. Everything downstream —
 * the preview, the PDF, the DOCX, the cover letter's context — takes a
 * bullet as a string, and keeping the pair alive past this point would mean
 * teaching all of them about a field none of them render.
 */
export function flattenBullets(experience: RawRole[]): {
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date: string;
  bullets: string[];
}[] {
  return (experience ?? []).map((role) => ({
    company: role.company ?? "",
    title: role.title ?? "",
    location: role.location,
    start_date: role.start_date ?? "",
    end_date: role.end_date ?? "",
    bullets: (role.bullets ?? [])
      .map((b) => (typeof b === "string" ? b : (b?.text ?? "")))
      .filter((t) => t.trim()),
  }));
}
