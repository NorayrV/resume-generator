"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { countWords, type Lang } from "@/lib/coverLetter";
import { cn } from "@/lib/utils";
import type { CoverLetterVersions } from "@/lib/types";

interface Props {
  letters: CoverLetterVersions;
  /**
   * Languages in the order the model wrote them — the posting's own language
   * first. Drives both the tab order and which tab opens.
   */
  order?: Lang[];
}

/** Word targets from the prompt, shown so you can spot a short generation. */
const TARGETS: Record<Lang, { min: number; max: number; label: string }> = {
  english: { min: 150, max: 220, label: "English" },
  russian: { min: 120, max: 180, label: "Русский" },
  spanish: { min: 150, max: 220, label: "Español" },
};

/**
 * The letter is never written to a file — it is meant to be pasted into an
 * application form or an email, so the useful action is Copy.
 */
export function CoverLetter({ letters, order }: Props) {
  // Follow the model's order where we have it, then anything it left out.
  const ranked = [
    ...(order ?? []),
    ...(Object.keys(TARGETS) as Lang[]).filter((l) => !order?.includes(l)),
  ];
  const available = ranked.filter((l) => letters[l]?.trim());

  const [active, setActive] = useState<Lang>(available[0] ?? "english");
  const [copied, setCopied] = useState(false);

  if (available.length === 0) {
    return (
      <Alert tone="error">
        The cover letter came back empty. Try generating again.
      </Alert>
    );
  }

  const text = letters[active];
  const target = TARGETS[active];
  const words = countWords(text);
  const offTarget = words < target.min || words > target.max;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some browsers over http — selecting still works.
    }
  }

  return (
    <section className="card flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-small font-semibold">Cover letter</h2>

        <div className="flex items-center gap-3">
          {/* Language switch as a segmented control — both options visible. */}
          {available.length > 1 && (
            <div
              role="tablist"
              aria-label="Cover letter language"
              className="flex rounded-md border border-line p-0.5"
            >
              {available.map((lang) => (
                <button
                  key={lang}
                  role="tab"
                  aria-selected={active === lang}
                  onClick={() => {
                    setActive(lang);
                    setCopied(false);
                  }}
                  className={cn(
                    "rounded px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                    active === lang
                      ? "bg-accent text-on-accent"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {TARGETS[lang].label}
                </button>
              ))}
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-5">
        <LetterBody text={text} />

        <p
          className={cn(
            "mt-4 border-t border-line pt-3 text-small tnum",
            offTarget ? "text-flag" : "text-faint",
          )}
        >
          {words} words
          {offTarget && ` · target ${target.min}\u2013${target.max}`}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Both versions carry a three-bullet block in the middle, so splitting on
 * blank lines alone would flatten those into one run-on paragraph.
 */
function LetterBody({ text }: { text: string }) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isBulletLine = (l: string) => /^[-•*\u2022]\s+/.test(l);

      // "Relevant experience:" sits on the line above its bullets, so a block
      // can be a lead-in line followed by a list.
      const firstBullet = lines.findIndex(isBulletLine);
      if (firstBullet !== -1 && lines.slice(firstBullet).every(isBulletLine)) {
        return {
          type: "list" as const,
          lead: lines.slice(0, firstBullet).join(" "),
          items: lines
            .slice(firstBullet)
            .map((l) => l.replace(/^[-•*\u2022]\s+/, "")),
        };
      }

      // A short stack of short lines is a sign-off, not a wrapped paragraph,
      // so its line breaks are kept.
      const isSignOff = lines.length <= 3 && lines.every((l) => l.length < 40);

      return isSignOff
        ? { type: "lines" as const, lines }
        : { type: "text" as const, value: lines.join(" ") };
    });

  return (
    /* Same reasoning as ResumePreview: a scroll container outside the tab
       order is unreachable by keyboard. 124px is hidden here at 375px. */
    <div
      tabIndex={0}
      role="region"
      aria-label="Cover letter. Scrollable."
      className="max-h-[26rem] overflow-y-auto rounded-md bg-surface p-4"
    >
      <div className="space-y-3.5 text-body leading-[1.7]">
        {blocks.map((block, i) =>
          block.type === "list" ? (
            <div key={i} className="space-y-1.5">
              {block.lead && <p>{block.lead}</p>}
              <ul className="space-y-1.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="text-faint" aria-hidden>
                      &bull;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : block.type === "lines" ? (
            <p key={i}>
              {block.lines.map((line, j) => (
                <span key={j}>
                  {line}
                  {j < block.lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          ) : (
            <p key={i}>{block.value}</p>
          ),
        )}
      </div>
    </div>
  );
}
