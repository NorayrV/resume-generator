---
name: Gatecrash
description: A serious career product with a small amount of personality.
colors:
  paper: "hsl(0 0% 100%)"
  surface: "hsl(0 0% 98%)"
  ink: "hsl(0 0% 9%)"
  muted: "hsl(0 0% 35%)"
  faint: "hsl(0 0% 45%)"
  placeholder: "hsl(0 0% 46%)"
  line: "hsl(0 0% 89%)"
  line-soft: "hsl(0 0% 94%)"
  accent: "hsl(221 83% 53%)"
  accent-text: "hsl(221 83% 45%)"
  accent-soft: "hsl(221 83% 97%)"
  accent-line: "hsl(221 83% 88%)"
  on-accent: "hsl(0 0% 100%)"
  flag: "hsl(0 70% 42%)"
  flag-soft: "hsl(0 86% 97%)"
  good: "hsl(152 62% 26%)"
  good-soft: "hsl(152 55% 96%)"
  doc-paper: "hsl(0 0% 100%)"
  doc-ink: "hsl(0 0% 9%)"
  doc-muted: "hsl(0 0% 35%)"
  doc-line: "hsl(0 0% 80%)"
  doc-accent: "hsl(221 83% 45%)"
  dark-paper: "hsl(220 13% 11%)"
  dark-surface: "hsl(220 16% 7%)"
  dark-ink: "hsl(220 20% 96%)"
  dark-muted: "hsl(220 10% 71%)"
  dark-faint: "hsl(220 9% 60%)"
  dark-placeholder: "hsl(220 8% 46%)"
  dark-line: "hsl(220 10% 20%)"
  dark-line-soft: "hsl(220 10% 16%)"
  dark-accent: "hsl(221 83% 56%)"
  dark-accent-text: "hsl(217 92% 72%)"
  dark-accent-soft: "hsl(221 55% 16%)"
  dark-accent-line: "hsl(221 45% 32%)"
  dark-flag: "hsl(0 84% 71%)"
  dark-flag-soft: "hsl(0 40% 15%)"
  dark-good: "hsl(152 52% 58%)"
  dark-good-soft: "hsl(152 35% 13%)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.35rem + 3.1vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  figure:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "-0.03em"
  subhead:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.96rem + 0.2vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  DEFAULT: "6px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "hsl(221 83% 53% / 0.9)"
    textColor: "{colors.on-accent}"
  button-primary-disabled:
    backgroundColor: "{colors.line-soft}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  badge:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
---

## Overview

Gatecrash turns a stored career history plus one job posting into an
application ready to send. The interface exists to make a repetitive,
slightly anxious task feel quick and honest.

**Creative North Star: The Plain Statement.** Every surface is built to be
checkable. The product's whole claim is that it copies facts and only writes
wording, so the design's job is to let a reader verify things rather than
admire them: a number sits next to the counts that produce it, a warning links
to the thing it warns about, a limit is printed before it is hit.

Mood: professional, modern, simple, trustworthy, and slightly playful.
Internet-native, never childish. The personality budget for the entire product
is small and deliberately spent in one or two places — see Do's and Don'ts.

**Anti-reference — the generic AI SaaS look, specifically:** purple-to-blue
gradient backgrounds, glassmorphism as decoration, cards nested inside cards,
oversized rounded containers everywhere, AI buzzwords ("unlock", "supercharge",
"revolutionize"), decorated dashboards, stock illustrations, and floating
shapes. None of these appear in this product and none should be added.

## Colors

One neutral ramp and one blue. That is the whole palette, plus two semantic
colors that are never used decoratively.

The neutrals are pure grey in the light theme and take a slight blue cast in
the dark theme (`hue 220`), which keeps dark surfaces from looking like
switched-off light ones.

**The blue does two jobs and needs two values.** `accent` fills — a button, a
selected chip — and white sits on it. `accent-text` writes — a link, an icon,
a small label — and it sits on the page. One value cannot do both once the
page goes dark: a fill dark enough for white text is too dark to read against
a dark background. Never substitute one for the other.

`flag` (red) means out of range or not covered. `good` (green) means covered
or confirmed. Both appear as a small mark or a short label, never as a filled
button or a section background. There is no third brand color, and none should
be introduced.

**`doc-*` is a separate palette that does not follow the theme.** The resume
preview is a picture of the file the user is about to send, so it stays black
on white in both themes. Never map `doc-*` onto the theme tokens.

Contrast is measured, not eyeballed. Every text node on the surfaces that have
been measured clears WCAG 2.1 AA in both themes, and a border that is the only
thing identifying a control clears 1.4.11's 3:1.

## Typography

Inter throughout, at eight sizes and three weights. There is no second family
and no need for one.

The ramp: `display` and `section` for page and section headlines, `figure` for
a single large number, `subhead` for a card or panel heading, then `lead`,
`body`, `small`, `micro`. `figure` and `subhead` were written as arbitrary
values in eight places before this file existed; they are tokens now, and any
size added to `tailwind.config.ts` must also be added to the `font-size` group
in `lib/utils.ts` or tailwind-merge files it as a text colour and silently
drops it.

The two headline sizes are fluid (`clamp`) rather than stepped, so they never
land at an awkward size between breakpoints. Everything below them is fixed:
`body` 15px, `small` 13px, `micro` 12px. Hierarchy comes from size and weight
before it comes from color.

Headings set at `line-height: 1.2` with `text-wrap: balance`; body text at
1.6. Tracking tightens as size grows (`-0.022em` at section, `-0.03em` at
display) and never goes below `-0.04em`.

**The resume facsimile is exempt.** `ResumePreview` and `HeroVisual` render a
picture of a printed document at reduced scale, so they use their own small
sizes (9–12px) alongside the `doc-*` palette. Those are not UI text and the
ramp does not apply to them — the same exception the colors section makes.

**Measure is capped at 65ch** (`max-w-prose`) on any block of running prose.
Wide containers are for layout, not for text.

No uppercase in UI chrome. The one kicker-style class this project had —
small uppercase labels above section headings — was removed; a heading that
needs a label above it needs a better heading. Two deliberate exceptions
remain, and both are the kind that earn it: the résumé facsimile sets a name
and section headings in caps because a printed résumé does, and the `PRO`
badge is a short status label where caps read as an abbreviation rather than
as shouting.

## Layout

A single container class (`.section`, `max-w-6xl` with responsive gutters)
sets the marketing rhythm so every section breathes identically. App pages use
narrower maxima: `max-w-5xl` for the generator, `max-w-3xl` for profile and
account.

Sections alternate `paper` and `surface` backgrounds, separated by a 1px
`line` border. Vertical rhythm is `py-16 sm:py-20` per section.

Breakpoints are Tailwind defaults. Two-column content splits at `md`, the
hero at `lg`. **Grids that compare things use `grid-rows-subgrid`** so
corresponding rows align by structure rather than by the strings happening to
be the same length — see the pricing cards.

Touch targets are 44px on anything a thumb uses. Nothing overflows
horizontally at 320px, and nothing overflows at 200% text zoom — bars wrap
rather than holding a fixed height.

## Elevation & Depth

Two levels, used sparingly. `.card` is a flat panel: 1px border, no shadow.
`.card-raised` adds `shadow-card` and is reserved for the one element on a
screen that should be found without looking — the sign-in card, the active
step, the paid plan.

If everything is raised, nothing is.

In the dark theme, elevation comes mostly from `paper` sitting above
`surface`; the shadow only grounds the edge, because a soft wide shadow is
invisible against a dark page. A section that sets itself to `paper` defeats
this for any card inside it.

## Shapes

Rounded, not soft. 6px is the default radius and covers buttons, inputs and
small controls; 8px for cards; 12–16px only for large panels. Pills
(`rounded-full`) are reserved for chips and badges — things that are toggled
or that label a state.

Icons are lucide, drawn at 3.5 (14px) beside `small` text and 4 (16px) beside
`body`, always `aria-hidden` when a text label sits next to them. One library,
one stroke weight. No emoji standing in for icons.

## Components

- **Button** — four variants (primary, secondary, ghost, danger) and four
  sizes (32/36/44/48px). Primary carries `shadow-sm`; disabled primary drops
  to a grey fill rather than fading, because it is the one button that ships
  disabled by default and its label has to stay readable.
- **Card** — the main building block. Never nest one inside another.
- **Chip** — a 44px pill used for multi-select (`role="checkbox"`) and for
  single choice (`role="radio"`, with roving tabindex and arrow keys).
- **Badge** — four tones, none of them clickable. If it can be clicked it is a
  Button.
- **Input / Textarea** — 44px tall, 1px `line` border, `accent` on focus with
  a 2px ring. Placeholders clear 4.5:1 in both themes and no more: 46% on
  white, 54% on the dark paper. Light enough to read as a prompt, dark enough
  to read at all — and measured on a page loaded dark, never one toggled into
  it.
- **Alert** — four tones, used for a state the user must act on, never for
  decoration.

Focus is a 2px `accent-text` outline at 2px offset, applied through
`:focus-visible` globally. Never remove it; if focus is moved programmatically
across a long distance, show the ring on `:focus` so the landing point is
visible whichever way the control was activated.

## Do's and Don'ts

**Do**

- State the limit before the user hits it. The allowance sits next to the
  button that spends it.
- Say what is missing. The gaps list is a feature, not a shortcoming.
- Let one honest sentence do the work of three reassuring ones.
- Spend the personality budget where comprehension is not load-bearing. The
  product's one piece of internet-native voice is **ATSMAXXING**, used in the
  generation heading (where four plain stage labels below it carry the
  meaning) and in the FAQ answer about ATS (where the next sentence punctures
  it). Two places. Adding a third dilutes both.

**Don't**

- Don't nest cards, add gradients, or reach for glass.
- Don't invent proof. There are no users to count, no logos, no ratings, and
  no testimonials — sell the mechanism.
- Don't write "unlock", "supercharge", "revolutionize", or "AI-powered".
  Name the outcome instead: *tailor your resume to the job*.
- Don't add an animation to show that something was polished. Motion is
  `rise` on arriving content, `sweep` on an indeterminate bar, and button
  feedback. Reduced-motion is honoured, with one documented exception: a
  spinner slows rather than stopping, because it is the only thing on screen
  saying a minute-long job is still running.
- Don't dim explanatory prose to signal a disabled state. Dim the controls;
  the words still have to be readable.
