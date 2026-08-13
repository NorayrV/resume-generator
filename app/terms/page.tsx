import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  LegalPage,
  List,
  Section,
} from "@/components/LegalPage";
import {
  FREE_GENERATIONS_PER_MONTH,
  PRO_GENERATIONS_PER_MONTH,
} from "@/lib/plan";

export const metadata: Metadata = {
  title: "Terms — Gatecrash",
  description:
    "What Gatecrash does, what it does not promise, and the rules for using it.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="The rules for using Gatecrash, and — more usefully — what it does not promise."
    >
      <Section heading="What Gatecrash does">
        <p>
          You keep one profile of your real career history. You paste a job
          posting. Gatecrash rewrites your experience for that posting and gives
          you a resume, optionally a cover letter, the keywords it matched, and
          an honest list of requirements your profile does not cover.
        </p>
      </Section>

      <Section heading="Check everything before you send it">
        <p>
          This is the most important thing on this page. The documents are
          written by an AI model and{" "}
          <strong className="font-medium text-ink">
            you are responsible for what you send to an employer
          </strong>
          .
        </p>
        <p>
          Employers, job titles, dates and education are copied from your
          profile rather than written by the model, precisely so they cannot
          drift. But the wording around them is generated, and generated text
          can be wrong, awkward, or subtly overstated.
        </p>
        <p>
          One case deserves naming. If you leave a role&apos;s description blank,
          the bullets for it are written for you from the job title, your listed
          skills and the posting. They describe what someone in that role
          usually does — not what you actually did. They are marked as written
          for you when the resume appears. Read them, correct them, and do not
          send anything you could not defend in an interview.
        </p>
      </Section>

      <Section heading="What is not promised">
        <List
          items={[
            "No interview, job offer, or response of any kind.",
            "No guarantee that any applicant tracking system will parse, score, or rank the documents in a particular way. Those systems are numerous, private, and change without notice.",
            "No guarantee that generation always succeeds. It depends on an external AI provider, which can be slow or unavailable.",
          ]}
        />
      </Section>

      <Section heading="Plans and payment">
        <p>
          The free plan includes {FREE_GENERATIONS_PER_MONTH} application packs
          every 30 days. Pro includes {PRO_GENERATIONS_PER_MONTH} a month. One
          pack is one generation for one posting; editing, re-downloading and
          re-reading anything you already generated is free and never counts.
        </p>
        <p>
          Payment is handled by Polar, which acts as merchant of record and
          deals with tax. A subscription renews until you cancel, and you can
          cancel at any time from the account page. Cancelling stops the next
          renewal and leaves your access running until the period you have
          already paid for ends.
        </p>
        <p>
          If something goes genuinely wrong — you were charged twice, or the
          service did not work — write to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          and it will be sorted out.
        </p>
      </Section>

      <Section heading="Fair use">
        <p>
          The allowances are generous so that a real job search never hits them.
          They are not an invitation to resell or automate. Please do not:
        </p>
        <List
          items={[
            "share one account between several people, or resell access to it",
            "script or automate generation, or run it in bulk",
            "use another person's employment history as though it were your own",
            "attempt to work around the allowance, the rate limits, or the sign-in",
          ]}
        />
        <p>
          An account doing any of these may be limited or closed. If that
          happens to a paid account and the cause was not deliberate, the unused
          part of what you paid will be refunded.
        </p>
      </Section>

      <Section heading="Your content stays yours">
        <p>
          Your profile and the documents generated from it belong to you. No
          claim is made over them, and they are not used to promote Gatecrash or
          shown to anyone else. What happens to your data is described on the{" "}
          <a
            href="/privacy"
            className="text-accent underline-offset-2 hover:underline"
          >
            privacy page
          </a>
          .
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          You can stop using Gatecrash whenever you like, cancel a subscription
          from the account page, and ask for your account to be deleted by
          email. Gatecrash may close an account that breaks the fair use rules
          above, or withdraw the service entirely — in which case anyone with
          time left on a paid plan will be told in advance and refunded for the
          remainder.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Gatecrash is provided as it is. It is a writing tool, not a career
          advisor, an employment agency, or a legal service. To the extent the
          law allows, it is not liable for a job you did not get, an application
          that went badly, or anything else that follows from using documents it
          produced. If liability is nonetheless found, it is limited to what you
          paid in the twelve months before the claim.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          These terms may change as the product does. The date at the top will
          change with them, and anything that materially affects what you are
          paying for will be said plainly rather than slipped in.
        </p>
      </Section>
    </LegalPage>
  );
}
