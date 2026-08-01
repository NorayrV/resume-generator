# Resume Generator

Tailors your resume and cover letter to a single job posting, then hands you a
Word file, a PDF and a letter ready to send.

Multi-user: people sign in with Google or GitHub, each keeps their own private
profile, and the first few generations are free.

---

## How it works

You fill in a profile once — contact details, roles, skills, education. For each
application you paste the job posting and press Generate. Two AI calls run:

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

## The free tier

`lib/plan.ts` holds the limit — 5 generations per rolling 30 days.

Every completed generation writes a row to `generations`. Users have no insert
or delete permission on that table, so nobody can reset their own meter. Paid
access makes it unlimited. The check runs in `app/api/generate/route.ts` before
any AI call, so hiding the button is a courtesy, not the control.

Payments are optional: leave the provider variables blank and the app runs
free-tier only, saying so plainly rather than showing a dead upgrade button.

Two ways to pay, both writing the same `access_until` date:

- **Polar** — card subscription, renews monthly, cancel from the customer
  portal. Polar is the merchant of record, so it handles sales tax and VAT.
- **Cryptomus** — one crypto payment buys 30 days. Crypto cannot auto-renew,
  so paying again simply extends the time remaining.

**Every generation is billed to your DeepSeek key, including free ones.** Five
per user per month is your exposure per signup.

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
    ├── generate/route.ts        quota check, then the two AI calls
    ├── download/route.ts        builds the Word or PDF file
    ├── account/route.ts         usage readout
    ├── polar/                   card checkout, webhook, portal
    └── crypto/                  crypto invoice and webhook

lib/
├── supabase/                    server, browser and admin clients
├── resumeStore.ts               per-user profile storage
├── usage.ts                     the free-tier meter
├── plan.ts                      the limits
├── billing.ts                   paid access, provider-agnostic
├── polar.ts                     card payments
├── cryptomus.ts                 crypto payments
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

**`provider is not enabled`** — the Google or GitHub provider is off in
Supabase → Authentication → Providers.

**Redirect error after approving sign-in** — the callback is missing from
Supabase → Authentication → URL Configuration → Redirect URLs.

**`Error 403: access_denied` from Google** — your OAuth consent screen is in
Testing mode and the account is not a listed test user. Add it under
**Audience**, or publish the app.
