import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  LegalPage,
  List,
  Section,
} from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — cvmaxxing",
  description:
    "What cvmaxxing stores, who it is shared with, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="cvmaxxing holds your career history, which is personal and sometimes sensitive. This page says plainly what is stored, where it goes, and how to get rid of it."
    >
      <Section heading="What is stored">
        <p>Three things, and nothing else:</p>
        <List
          items={[
            <>
              <strong className="font-medium text-ink">Your account.</strong>{" "}
              Your email address, name and profile picture, as supplied by
              Google or GitHub when you sign in. No password is ever created or
              held — sign-in is handled entirely by those providers.
            </>,
            <>
              <strong className="font-medium text-ink">Your profile.</strong>{" "}
              Everything you enter or upload: contact details, employers, job
              titles, dates, locations, what you did in each role, skills,
              education, languages, certifications and interests. If you paste
              or upload a resume, the text extracted from it is kept too, so
              the form can be shown to you again.
            </>,
            <>
              <strong className="font-medium text-ink">Usage records.</strong>{" "}
              One row each time you generate, upload or download something,
              holding your account identifier and the time. These exist to
              count your allowance and to stop abuse. They contain none of your
              resume content.
            </>,
          ]}
        />
      </Section>

      <Section heading="Uploaded files are not kept">
        <p>
          When you upload a resume, the file is read in memory, the text is
          pulled out of it, and the file is discarded. It is never written to
          disk or to any storage bucket. Only the extracted text is saved, as
          part of your profile.
        </p>
      </Section>

      <Section heading="Who else sees it">
        <p>
          cvmaxxing is run by a small number of services. Each one sees only
          what it needs to do its job.
        </p>
        <List
          items={[
            <>
              <strong className="font-medium text-ink">Supabase</strong> stores
              the database and runs sign-in. Your profile lives here. Every
              table is protected by row-level security keyed to your account,
              so the database itself refuses to return one person&apos;s data to
              another.
            </>,
            <>
              <strong className="font-medium text-ink">Vercel</strong> hosts the
              site and runs the code.
            </>,
            <>
              <strong className="font-medium text-ink">DeepSeek</strong>{" "}
              receives your profile and the job posting at the moment you press
              Generate, because that is what writes the documents. Nothing is
              sent to it at any other time. What DeepSeek does with data sent to
              its API is governed by its own terms, not by this page — if that
              matters to you, read them before entering anything you would not
              want processed by a third party.
            </>,
            <>
              <strong className="font-medium text-ink">Polar</strong> handles
              payment if you subscribe, as merchant of record. Card details go
              to Polar and never reach cvmaxxing — we store only which plan you
              are on and the date it runs until.
            </>,
          ]}
        />
        <p>
          Your data is not sold, rented, or shared with anyone else. There is no
          advertising on cvmaxxing and no third-party tracking scripts.
        </p>
      </Section>

      <Section heading="Why it is kept at all">
        <p>
          The profile exists so you enter your history once instead of retyping
          it for every application. The usage records exist so the free
          allowance can be counted and so nobody can run up costs at everyone
          else&apos;s expense. That is the whole of it.
        </p>
      </Section>

      <Section heading="Deleting it">
        <p>
          You can clear your profile at any time by emptying the fields on the
          profile page and saving.
        </p>
        <p>
          To delete your account entirely — the profile, the usage records and
          the sign-in itself — email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent-text underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          from the address you signed in with. It will be removed, and this is
          done by hand rather than by a button, so allow a few days. You are
          also welcome to ask for a copy of what is held about you.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Traffic is encrypted in transit. Access to your rows is enforced by
          the database rather than only by application code, so a mistake in the
          application still cannot expose one account&apos;s data to another.
          Sign-in is delegated to Google and GitHub, which means cvmaxxing never
          handles a password.
        </p>
        <p>
          No system is perfect. If you find a problem, please write to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent-text underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          rather than disclosing it publicly, and it will be taken seriously.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this page changes in a way that affects what is collected or who it
          is shared with, the date at the top will change and the change will be
          described here rather than made quietly.
        </p>
      </Section>
    </LegalPage>
  );
}
