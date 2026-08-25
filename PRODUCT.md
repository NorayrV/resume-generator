# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Job seekers doing the repetitive part of applying: reshaping one real career
history for one specific posting, over and over.

Three confirmed groups, overlapping more than they differ:

- **People applying abroad or relocating.** Often writing in a second
  language, applying across borders, and dealing with names and documents that
  Latin-only tooling handles badly.
- **Tech and digital job seekers.** Developers, analysts, designers, product
  people applying to IT and digital roles.
- **Early-career candidates and students.** First or second job, a thin
  history, where the difficulty is making limited real experience read well
  rather than choosing between many things to cut.

What unites them: they have one true history, they are applying to many
postings, and rewriting by hand for each is the tedious part they want gone.

## Product Purpose

Turn a stored career history plus one job posting into an application ready to
send: a tailored resume as Word or PDF, optionally a cover letter, the
keywords from the posting that made it in, and the requirements the profile
does not cover.

The profile is entered once and reused for every application. Success is a
candidate who applies to a specific posting in about a minute, with a document
they could defend in an interview.

## Positioning

**It does not invent experience, and this is enforced in code rather than
asked of the model.**

Employers, job titles, start and end dates, education and certifications are
copied from the stored profile and never passed to the model as something to
write, so they cannot drift. The model rewrites only five things: the
headline, the summary, how skills are grouped, how each role is described, and
which interests to show. `lib/anchorExperience.ts` re-anchors returned roles
against stored ones so a returned document cannot silently change a fact.

The second half of the position is the readout most tools omit: every
application also returns the requirements the profile does **not** evidence.
Those are left off the resume rather than papered over, so the candidate knows
where the interview questions are coming from.

A neighbouring product cannot truthfully copy either claim without rebuilding
the same separation between copied facts and generated wording.

## Operating Context

- The candidate keeps one master profile: contact details, roles with dates,
  skills, education, languages, certifications, interests.
- Profiles are usually created by uploading an existing resume (PDF or DOCX,
  read in memory and discarded) rather than typed by hand.
- Each application starts by pasting a full job posting — responsibilities and
  requirements included — and everything is tailored against that text alone.
- Output is downloaded as Word or PDF and sent through whatever application
  form or email the employer uses. cvmaxxing does not submit anything.
- Cover letters are pasted into forms or email, so the useful action on them
  is copy rather than download.
- Roles left blank are drafted from the job title and skills, and are labelled
  on screen as written-for-you so they get corrected before sending.

## Capabilities and Constraints

- Sign-in is Google, GitHub, or an emailed link. No passwords are ever
  created or held. The email door exists because the audience is not the
  audience that owns a GitHub account: the worked example on our own
  landing page is a financial analyst in Berlin.
- Free: 3 applications per rolling 30 days, no card. Pro: 100 over the same
  rolling window — not a monthly reset, and the UI says so in those words.
- One **application** is one generation for one posting. Editing,
  re-downloading and re-reading earlier output are free and never metered.
  The word is load-bearing: "pack" was the earlier name and is gone from
  every surface, because the pricing section used it in three headings
  while the cards beside them counted "applications".
- Cover letters require an active paid or comped plan, enforced server-side
  before the meter and before any AI call.
- One cover letter language per generation: English, Russian or Spanish.
- Job postings are capped at 20,000 characters; uploads at 5 MB.
- Generation takes roughly 20–60 seconds and depends on an external AI
  provider, which can be slow or unavailable.
- Paid access is time-bounded by `entitlements.access_until`, the single
  source of truth. A cancelled subscription keeps access to the end of the
  paid period.
- **Undecided:** no application history — results live in session storage and
  are lost when the tab closes. No self-serve account deletion; deletion is by
  email request, handled by hand.

## Brand Commitments

- The product is **cvmaxxing**. It is still served from gatecrash.app, which
  is the domain that is registered and paid for; a matching domain has not
  been bought, so every legal page and contact address still names the old one
  and that is accurate rather than an oversight.
- The name is the "-maxxing" internet suffix applied to a CV. That is a
  deliberate change of register from the previous name, whose gatekeeper
  metaphor was explicitly kept subtle. This one cannot be subtle: it is the
  first word on every page. See the note under ATSMAXXING below, which the
  rename puts in tension.
- The mark ships in two tones (`public/logo-mark.png` and
  `-dark.png`), derived from `public/logo.png` by
  `scripts/build-logo-assets.py`.
- Personality: professional, modern, simple, trustworthy, and slightly
  playful. Internet-native, never childish. The governing principle is that
  cvmaxxing should feel like a **serious career product with a small amount of
  personality** — the seriousness is the default and the personality is the
  exception, not a tone applied evenly across the product.
- Voice: plain, concrete, and willing to say what the product will not do. No
  AI buzzwords, no "unlock your potential", no guaranteed-interview claims.
  Where a competitor would make a promise, cvmaxxing states a limit — the ATS
  answer names what no tool can honestly promise.
- **ATSMAXXING** appears in exactly two places: the heading over a running
  generation, and the FAQ answer about ATS. Both were chosen because
  comprehension does not rest on the word there — four plain stage labels sit
  under the first, and the next sentence punctures the claim in the second.
  Second-language applicants are a primary audience, so invented English never
  carries meaning on its own.

  **Unresolved:** these were sized as the exception when the product was named
  something plain. With the product itself now called cvmaxxing, the suffix is
  the default rather than the spice, and "ATSMAXXING your application" inside a
  product called cvmaxxing repeats a joke rather than landing one. Either the
  name carries the register and these two revert to plain language, or they
  stay and the "seriousness is the default" principle above needs rewriting.
  It should not be left as it is.
- Visual anti-reference and the design system live in `DESIGN.md`.
- The resume preview is a picture of the file being sent, so it stays black on
  white in both light and dark themes.

## Evidence on Hand

**Pre-launch. There is no third-party evidence of any kind** — no users to
count, no testimonials, no case studies, no press, no measured outcomes. The
owner and a few comped friends are the only accounts with paid-level access.

Future work must sell on the mechanism, as the current site does, and must not
invent user counts, logos, ratings, review counts, or quotes. The concrete
claims available are checkable facts about the product itself: what is free,
what is copied rather than generated, what is never sold.

## Product Principles

1. **Facts are copied; only wording is written.** Any feature that lets the
   model author an employer, title, date or qualification breaks the product.
2. **Say what is missing.** The honest gaps list is a feature, not a
   shortcoming to soften. The same applies to drafted bullets, which are
   labelled rather than blended in.
3. **Claim only what is checkable.** No invented proof, no interview
   promises, no ATS score guarantees.
4. **One job at a time.** cvmaxxing turns real experience into an application
   for a specific posting. It is not a job board, a tracker, a coach, or a
   network.
5. **The free tier is real.** Three applications every 30 days, no card, no
   countdown — the paid boundary sits at cover letters and volume, never at
   making the free path deliberately unpleasant.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast is met, in both themes, by every text node on the
  surfaces that have actually been measured: the landing page and its
  pricing section, the job-posting form, and the result components. Measured,
  not inspected — and the scope is named because stating it as "every
  rendered text node" was how a placeholder sat at 3.03:1 for weeks. The
  measurement read `element.color` and never touched the `::placeholder`
  pseudo-element.
- Non-text contrast is held to 1.4.11's 3:1 where a border is what identifies
  a control, which is a separate pass from the text one and was added after a
  free-plan button shipped with a 1.28:1 outline as its only affordance.
- Names and documents in non-Latin scripts are first-class: downloads carry
  the real name via RFC 5987 rather than being stripped to ASCII.
- Second-language applicants are a primary audience; copy stays plain and
  avoids idiom.
- Reduced-motion preferences are honoured; theme follows the system until the
  user chooses otherwise.
