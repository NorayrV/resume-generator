# Resume Generator

Tailors your resume and cover letter to a single job posting, then hands you a
Word file, a PDF and a letter ready to send.

Multi-user: people sign in with Google or GitHub, each keeps their own private
profile, and the first few generations are free.

---

## How it works

You fill in a profile once — contact details, roles, skills, education. Either
upload an existing resume and have the fields filled in for you, or type them
yourself; see [Auto-fill from a resume](#auto-fill-from-a-resume) below.

For each application you paste the job posting and press Generate. Two AI calls
run:

1. **The resume.** Five sections are rewritten for that posting: headline,
   summary, technical skills, experience bullets, interests. Everything else —
   employers, job titles, dates, education, languages — is copied from your
   stored profile by the server, so the model cannot quietly change a date or
   invent a degree.
2. **The cover letter.** Written against the finished resume, so it quotes the
   same achievements in the same words. Available in English, Russian and
   Spanish; you choose which, because each extra language costs output tokens.

You also get two readouts: which of the posting's keywords made it in, and which
requirements your profile does not evidence.

---

## Running it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
```

Copy the settings template:

```bash
cp .env.local.example .env.local
```

Fill it in — see [SETUP.md](SETUP.md) for where each value comes from. The
minimum to boot is a DeepSeek key plus the three Supabase values.

```bash
npm run dev
```

Open **http://localhost:3000**.

> Do not run `npm run build` while `npm run dev` is running. They share the
> `.next` folder and the build will corrupt the dev server. If that happens:
> `rm -rf .next && npm run dev`

---

## Deploying

Full walkthrough in [SETUP.md](SETUP.md). The short version:

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add every variable from `.env.local.example` under **Settings → Environment
   Variables**.
4. Update Supabase **Site URL** and **Redirect URLs**, and the Google/GitHub
   OAuth redirect URIs, to point at your real domain.

`.env.local` is git-ignored, so no key ever reaches the repository.

---

## Auto-fill from a resume

Typing a whole career into a form is where people give up, so the profile page
leads with an upload instead. Drop in a PDF or a Word `.docx` and the fields
below fill themselves in.

Three steps, and the middle one is the only new idea:

1. `lib/resumeFile.ts` turns the file into plain text — `unpdf` for PDFs,
   `mammoth` for `.docx`.
2. That text goes through `prompts/extractPrompt.ts`, the same parser the paste
   box has always used. An upload and a paste therefore produce identical
   profiles, and there is one prompt to maintain rather than two.
3. `POST /api/profile/import` returns the result **without saving it**. The
   editor shows it for checking and nothing is written until the user presses
   Save.

That last point is deliberate. Extraction is a guess: a two-column PDF can
interleave lines, and dates and job titles are exactly the fields nobody wants
quietly wrong. Anything the parser could not find is reported above the form
rather than treated as a failure — the rest of the resume still gets through.

The file itself is never stored. Only the extracted text is, in `raw_text`,
the same as with a paste.

**Limits**, all enforced server-side in `lib/resumeFile.ts`:

| | |
|---|---|
| File size | 5 MB |
| Text sent to the model | 20,000 characters |
| Accepted | PDF, `.docx` |
| Uploads per user | 10 per rolling 24 hours |

Format is decided by the file's leading bytes, not its name or MIME type —
browsers report `.docx` inconsistently, and a filename is only a suggestion.
Legacy `.doc` and text-free scans are refused with a message saying what to do
instead.

**This call is billed to your DeepSeek key and is not covered by the free-tier
meter**, which counts generations only. `lib/importLimit.ts` caps it instead:
10 uploads per user per rolling 24 hours, counted in `resume_imports` by the
service-role key, so nobody can clear their own limit. Rejected files never
reach the AI call and so never burn an attempt.

If `supabase/003_resume_imports.sql` has not been run, the limiter logs a
warning and lets uploads through rather than blocking them — a missing table
should not take the feature down. Run the migration and the cap starts working
with no redeploy.

---

## The free tier

`lib/plan.ts` holds the limit — 5 generations per rolling 30 days.

Every completed generation writes a row to `generations`. Users have no insert
or delete permission on that table, so nobody can reset their own meter. Paid
access makes it unlimited. The check runs in `app/api/generate/route.ts` before
any AI call, so hiding the button is a courtesy, not the control.

Payments are optional: leave the provider variables blank and the app runs
free-tier only, saying so plainly rather than showing a dead upgrade button.

Payment is by card through **Polar** — a monthly subscription, cancelled from
the customer portal. Polar is the merchant of record, so it handles sales tax
and VAT.

Access itself is stored as a single `access_until` date with no mention of who
took the money, so another provider can be added without touching anything
above `lib/billing.ts`.

**Every generation is billed to your DeepSeek key, including free ones.** Five
per user per month is your exposure per signup.

### Giving someone unlimited access for free

For yourself, friends, or testers. Run
[`supabase/004_comp_access.sql`](supabase/004_comp_access.sql) once, then from
the Supabase SQL editor:

```sql
select admin.grant_unlimited('friend@example.com');
select admin.revoke_unlimited('friend@example.com');
select * from admin.list_unlimited();
```

They must have signed in at least once first, so there is an account to attach
it to — the function says so if not.

This is a third `provider` on the existing entitlement, `comp`, with
`access_until` set to 2099. Nothing above `lib/billing.ts` needs to know: the
paid checks already ask only "is this in date". The account page is the one
exception, since telling someone their free access "renews on 31 December 2099"
would look broken.

Two things the SQL takes care of:

- The functions live in an `admin` schema, **not** `public`. Supabase publishes
  every `public` function as a REST endpoint, so a `grant_unlimited()` there
  could be called by any signed-in user against their own account. `EXECUTE` is
  also revoked from `PUBLIC` — revoking from `anon` and `authenticated` alone
  leaves Postgres's default grant in place, and `create or replace` re-issues it
  on every re-run.
- `revoke_unlimited` only ever deletes a `comp` row, so it cannot cut off
  someone who actually paid. Granting *over* a live Polar subscription is
  allowed but says so in the result, since you would still need to cancel it
  with the provider.

---

## Changing how the AI writes

Two files, both plain English, both server-only:

- `prompts/resumePrompt.ts` — the resume
- `prompts/coverLetterPrompt.ts` — the cover letter

Edit freely. The JSON schema at the bottom of the resume prompt must keep its
shape, because `lib/docxGenerator.ts` and `lib/pdfGenerator.ts` read those key
names. Likewise the `## ... Version` headings in the cover letter prompt are
what `lib/coverLetter.ts` splits on.

---

## Project structure

```
app/
├── page.tsx                     Generate — paste a posting, get documents
├── profile/page.tsx             the profile form
├── account/page.tsx             usage and billing
├── login/page.tsx               Google / GitHub sign-in
├── auth/callback/route.ts       completes the OAuth handshake
└── api/
    ├── profile/route.ts         read and write the signed-in user's profile
    ├── profile/import/route.ts  read an uploaded resume, without saving it
    ├── generate/route.ts        quota check, then the two AI calls
    ├── download/route.ts        builds the Word or PDF file
    ├── account/route.ts         usage readout
    ├── polar/                   card checkout, webhook, portal
    └── crypto/                  crypto invoice and webhook

lib/
├── supabase/                    server, browser and admin clients
├── resumeStore.ts               per-user profile storage
├── resumeFile.ts                uploaded PDF/DOCX to plain text
├── importLimit.ts               caps how often resumes can be uploaded
├── usage.ts                     the free-tier meter
├── plan.ts                      the limits
├── billing.ts                   paid access, provider-agnostic
├── polar.ts                     card payments
├── deepseek.ts                  the AI client
├── coverLetter.ts               language selection and parsing
├── docxGenerator.ts             the Word file
└── pdfGenerator.ts              the PDF

supabase/                        schema and migrations, with RLS
assets/fonts/                    DejaVu Sans, embedded in generated PDFs
```

---

## A few decisions worth knowing about

**The AI never writes your employment history.** It returns bullets; the server
re-anchors every company, title, location and date from your stored profile.
Education and languages are grafted on afterwards and never sent for rewriting.

**Row Level Security, not application checks.** Every table is keyed to
`auth.uid()` with policies enforcing it. A bug in the application code still
cannot leak one user's profile to another.

**PDFs embed DejaVu Sans rather than using a built-in font.** PDF's standard
Helvetica is single-byte: a Cyrillic name renders as mojibake without warning.
The generated PDF is real selectable text, single column, no tables or images —
which is what keeps an ATS able to parse it.

---

## When something breaks

**`Cannot find module './xxx.js'`, or the page loads unstyled** — the build
cache is corrupt, usually from running `build` while `dev` was running.

```bash
rm -rf .next && npm run dev
```

**"No text could be read from that PDF"** — the PDF is a scan: a photo of a
resume with no text layer, so there is nothing to extract. Export a text PDF
from Word or Google Docs, or paste the text instead. There is no OCR.

**`provider is not enabled`** — the Google or GitHub provider is off in
Supabase → Authentication → Providers.

**Redirect error after approving sign-in** — the callback is missing from
Supabase → Authentication → URL Configuration → Redirect URLs.

**`Error 403: access_denied` from Google** — your OAuth consent screen is in
Testing mode and the account is not a listed test user. Add it under
**Audience**, or publish the app.
