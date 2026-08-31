"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ALL_LANGS, LANGUAGES, type Lang } from "@/lib/coverLetter";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/lib/plan";
import {
  ALL_OUTPUTS,
  OUTPUT_LABELS,
  type OutputKind,
} from "@/lib/outputs";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  busy: boolean;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  outputs: OutputKind[];
  onOutputsChange: (outputs: OutputKind[]) => void;
  /**
   * Whether this account may generate a cover letter.
   *
   * Presentation only. The server checks the same entitlement before it
   * touches the meter or the model — see lib/access.ts — so nothing here is
   * load-bearing for access, and editing it in devtools buys nothing. Its job
   * is to stop a free user pressing a button that was only ever going to
   * refuse them.
   *
   * Null while the account is still loading, so the control can hold its
   * shape instead of flickering between locked and unlocked.
   */
  canUseCoverLetter: boolean | null;
  /** Live price, for the upgrade line. Absent until the account loads. */
  planPrice?: string;
  /**
   * What is left of the allowance, shown beside the button that spends it.
   *
   * Null while the account loads, and for an uncapped account, where a
   * counter would be noise. The figure comes from the server on every
   * generation, so it cannot drift from what was actually charged.
   */
  allowance?: {
    limit: number;
    remaining: number | null;
    unlimited: boolean;
  } | null;
}

const MIN_CHARS = 120;

/**
 * The option pills.
 *
 * 44px tall, which is both the platform touch-target guideline and the exact
 * height of the submit button they share a form with — measured at 34px
 * before, which cleared WCAG 2.5.8's 24px floor but not the size a thumb
 * actually wants on the phone this product is mostly used from.
 *
 * The dimming lives here rather than on the surrounding fieldset. Dimming the
 * fieldset also dimmed its legend and its explanatory sentence to 2.77:1 for
 * the twenty to sixty seconds a generation runs — prose nobody can read is
 * worse than prose that stays put while the controls beside it grey out.
 */
const CHIP =
  "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors disabled:opacity-60";

const CHIP_ON = "border-accent bg-accent text-on-accent";
const CHIP_OFF = "border-line bg-paper text-muted";
const CHIP_OFF_HOVER = "hover:border-faint hover:text-ink";

export function JobDescriptionInput({
  value,
  onChange,
  onGenerate,
  busy,
  lang,
  onLangChange,
  outputs,
  onOutputsChange,
  canUseCoverLetter,
  planPrice,
  allowance,
}: Props) {
  const wantsCoverLetter = outputs.includes("cover_letter");
  /* Treat "still loading" as unlocked, so the badge does not flash on for a
     subscriber every time the page opens. */
  const locked = canUseCoverLetter === false;

  /*
   * Unique per instance, so the textarea can point at its own counter rather
   * than at whichever one happened to render first.
   */
  const uid = useId();
  const countId = `${uid}-count`;
  const langLegendId = `${uid}-lang`;

  /** Focus targets for the language group's arrow keys. */
  const langRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Toggle a document, but never let the last one be turned off. */
  function toggleOutput(kind: OutputKind) {
    const next = outputs.includes(kind)
      ? outputs.filter((o) => o !== kind)
      : [...outputs, kind];

    if (next.length === 0) return;
    onOutputsChange(ALL_OUTPUTS.filter((o) => next.includes(o)));
  }

  /*
   * Arrow keys move through a radio group; Tab moves past it. Without this the
   * three languages were three separate tab stops that announced themselves as
   * radios and then ignored every arrow key, which is the one interaction a
   * screen reader user is told to expect from that role.
   */
  function onLangKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const at = ALL_LANGS.indexOf(lang);
    const last = ALL_LANGS.length - 1;

    let to: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        to = at === last ? 0 : at + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        to = at === 0 ? last : at - 1;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    onLangChange(ALL_LANGS[to]);
    langRefs.current[to]?.focus();
  }

  const count = value.trim().length;
  const tooLong = count > MAX_JOB_DESCRIPTION_CHARS;
  // The server enforces both bounds; this only saves the round trip.
  const ready = count >= MIN_CHARS && !tooLong;

  const counter =
    count === 0
      ? "Paste a posting to get started"
      : tooLong
        ? `${count.toLocaleString()} characters — ${(count - MAX_JOB_DESCRIPTION_CHARS).toLocaleString()} over the limit`
        : ready
          ? `${count.toLocaleString()} characters`
          : `${MIN_CHARS - count} more characters needed`;

  /*
   * The same information, coarsened for announcement.
   *
   * The visible counter changes on every keystroke, and a live region tied to
   * it would read a new number each time. This has four possible values, so it
   * speaks when the state actually changes and stays quiet otherwise — which
   * matters because the submit button is disabled until `ready`, and nothing
   * else on the surface says why.
   */
  const spoken = tooLong
    ? `Too long. The limit is ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()} characters.`
    : ready
      ? "Long enough to tailor."
      : count === 0
        ? ""
        : `Not enough of the posting yet. At least ${MIN_CHARS} characters.`;

  /** The locked chip's insides, shared by its live and its inert form. */
  const lockedChip = (
    <>
      <Lock className="h-3.5 w-3.5 text-faint" aria-hidden />
      {OUTPUT_LABELS.cover_letter}
      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.04em] text-accent-text">
        Pro
      </span>
    </>
  );

  return (
    <div className="space-y-4">
      <Textarea
        rows={11}
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Paste the job posting here.\n\nThe more of it you include — responsibilities, requirements, the company — the closer the tailoring gets."}
        aria-label="Job posting"
        aria-describedby={countId}
        aria-invalid={tooLong || undefined}
        className="min-h-[13rem] leading-[1.7]"
      />

      {/* Producing a document nobody asked for is the bulk of a wasted
          generation, so this is an explicit choice. */}
      <fieldset disabled={busy}>
        <legend className="label">What to generate</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_OUTPUTS.map((kind) => {
            const on = outputs.includes(kind);
            const only = on && outputs.length === 1;

            /*
             * The locked chip is a link to the upgrade page rather than a
             * dead control. Pressing it does something useful — it goes where
             * the feature is unlocked — instead of refusing silently, and it
             * carries the badge that says why.
             *
             * While a generation is running it becomes inert, because a
             * fieldset only disables form controls and a link is not one. It
             * sat there dimmed to 60% and fully clickable, and the click was
             * expensive: the server takes the application off the allowance
             * before the model is called and nothing keeps a history, so
             * leaving mid-run spent one of three free applications and
             * delivered nothing.
             */
            if (kind === "cover_letter" && locked) {
              return busy ? (
                <span
                  key={kind}
                  aria-disabled
                  className={`${CHIP} ${CHIP_OFF} pr-2.5 opacity-60`}
                >
                  {lockedChip}
                </span>
              ) : (
                <Link
                  key={kind}
                  href="/account"
                  className={`${CHIP} ${CHIP_OFF} pr-2.5 hover:border-accent-line hover:text-ink`}
                >
                  {lockedChip}
                </Link>
              );
            }

            return (
              <button
                key={kind}
                type="button"
                role="checkbox"
                aria-checked={on}
                /* Checked and alone: still announced, no longer silently
                   ignoring the press that a title tooltip alone never
                   explained on a touch screen. */
                aria-disabled={only || undefined}
                onClick={() => toggleOutput(kind)}
                title={only ? "Keep at least one" : undefined}
                className={`${CHIP} ${
                  on ? CHIP_ON : `${CHIP_OFF} ${CHIP_OFF_HOVER}`
                } ${only ? "cursor-default" : ""}`}
              >
                {OUTPUT_LABELS[kind]}
              </button>
            );
          })}
        </div>

        {locked ? (
          /*
           * Unreachable while PAID_ONLY_OUTPUTS is empty — cover letters are
           * on every plan, so nothing locks. Kept working rather than
           * deleted: it is the other half of that switch, and putting an
           * output back behind the plan should not also mean rebuilding the
           * screen that explains it.
           *
           * Says what the feature is and what unlocks it, in that order.
           * Someone reading this has not been refused anything yet — they are
           * being told the shape of the product before they press anything.
           *
           * The upgrade link drops out while a generation runs, for the same
           * reason the chip above does: following it costs the application
           * that is already being paid for.
           */
          <p className="hint mt-2">
            Tailored cover letters are included with Pro
            {planPrice ? ` (${planPrice} a month)` : ""}. Your resume is free,
            with no limit on how you edit or download it.
            {!busy && (
              <>
                {" "}
                <Link
                  href="/account"
                  className="font-medium text-accent-text underline-offset-2 hover:underline"
                >
                  Upgrade to Pro
                </Link>
              </>
            )}
          </p>
        ) : (
          <p className="hint mt-2">
            {outputs.length === 2
              ? "The letter is written against the finished resume, so the two agree."
              : wantsCoverLetter
                ? "Written from your full profile, since no resume is being tailored alongside it."
                : "Resume only. Add the cover letter if this application asks for one."}
          </p>
        )}
      </fieldset>

      {/* Hidden rather than disabled when no letter is being written: a
          greyed-out control still asks to be read and reasoned about, and
          this one has nothing to say when there is no letter. */}
      {wantsCoverLetter && (
        <fieldset disabled={busy}>
          <legend className="label" id={langLegendId}>
            Cover letter language
          </legend>
          <div
            role="radiogroup"
            aria-labelledby={langLegendId}
            onKeyDown={onLangKeys}
            className="flex flex-wrap gap-2"
          >
            {ALL_LANGS.map((option, i) => {
              const on = lang === option;
              return (
                <button
                  key={option}
                  ref={(el) => {
                    langRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  /* One tab stop for the group, as a radio group should be. */
                  tabIndex={on ? 0 : -1}
                  onClick={() => onLangChange(option)}
                  className={`${CHIP} ${
                    on ? CHIP_ON : `${CHIP_OFF} ${CHIP_OFF_HOVER}`
                  }`}
                >
                  {LANGUAGES[option].label}
                </button>
              );
            })}
          </div>
          <p className="hint mt-2">Written in {LANGUAGES[lang].label}.</p>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Always says why the button is disabled, rather than leaving you guessing. */}
        <div>
          <p
            id={countId}
            className={`text-small tnum ${tooLong ? "text-flag" : "text-muted"}`}
          >
            {counter}
          </p>

          {/*
            The unit being spent, at the moment of spending. Previously this
            number existed only on the billing page, so the limit was
            discoverable only by hitting it.
          */}
          {allowance && !allowance.unlimited && allowance.remaining !== null && (
            <p
              className={`mt-0.5 text-micro tnum ${
                allowance.remaining === 0 ? "text-flag" : "text-faint"
              }`}
            >
              {allowance.remaining === 0
                ? "No applications left"
                : `${allowance.remaining} of ${allowance.limit} applications left`}
            </p>
          )}

          <p role="status" aria-live="polite" className="sr-only">
            {spoken}
          </p>
        </div>

        <Button size="lg" onClick={onGenerate} disabled={busy || !ready}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Tailoring…
            </>
          ) : (
            <>
              Tailor my application
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
