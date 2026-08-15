---
target: landing page
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-15T07-48-57Z
slug: app-login-page-tsx
---
**Method: dual-agent** (A: design review · B: detector + browser evidence, isolated and parallel)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Suspense skeleton 304px vs real card 341/393px — 89px shift on the CTA |
| 2 | Match System / Real World | 3 | "Application pack" first appears as an h2 2,363px in, undefined |
| 3 | User Control and Freedom | 1 | Three CTAs, all backward jumps; no email sign-in, so some users have no path |
| 4 | Consistency and Standards | 2 | FAQ list 160px right of its heading; Free card white-on-white |
| 5 | Error Prevention | 2 | No warning before the click that only Google/GitHub are accepted |
| 6 | Recognition Rather Than Recall | 3 | Good mirroring, undercut by a plan choice the destination discards |
| 7 | Flexibility and Efficiency | 1 | header nav display:none at 375px; sticky CTA window only 137px |
| 8 | Aesthetic and Minimalist Design | 2 | 11 icons above desktop fold; key facts each repeated 4x |
| 9 | Error Recovery | 1 | Raw provider error string; no support contact anywhere on the page |
| 10 | Help and Documentation | 3 | FAQ is the best writing here, and sits below pricing (5,764px mobile) |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

All ten applied; 7 and 10 explicitly NOT n/a (the page has efficiency machinery that fails, and the FAQ is documentation).

## Design Specificity Verdict

Writing is unmistakably this product; the chassis is a stock template. Product-specific: HeroVisual, the --doc-* token family (sheet stays white in dark mode), "Accuracy" as a section name, "Before you hand over your history", "What never counts". Category-default: sticky translucent header, left-copy/right-card hero, eyebrow-h2-lead x5, 01/02/03 steps, two-column pricing with raised right card, accordion FAQ, centred close. Inter + 0%-saturation greys + hsl(221 83% 53%) = Tailwind blue-600 unmodified. tailwind.config.ts defines rise/sweep/flow and .stagger; the landing page uses none of them.

Deterministic scan: detector returned [] exit 0, but that is NOT clean. On .tsx only the regex engine runs (~19 of 59 rules); puppeteer, htmlparser2, css-select, css-tree, domutils all absent; the 6 page-analyzer rules require <!doctype AND a .html/.astro/.vue/.svelte extension. Proven with identical content across extensions: .tsx -> none, .html -> em-dash-overuse + marketing-buzzword, .astro -> same. On .html the tool prints DEGRADED; on .tsx it prints a silent zero.

CORRECTION to the earlier audit: the "102 em dashes" P3 was wrong. Only 8 render; 4 with the FAQ collapsed — below the rule's own floor of 8 and under its density threshold. Withdrawn.

## Priority Issues

[P0] OAuth-only sign-in, no fallback. All three CTAs funnel to Google/GitHub. Hero depicts a Financial Analyst in Berlin, who would not have GitHub. Fix: Supabase magic-link email above the OAuth pair, or at minimum state the requirement before the click. -> /impeccable harden

[P0] Mobile CTA 11px above the fold + 89px layout shift. At 375x812 the Google button top is 801px against an 812px fold; GitHub entirely below. Fallback h-[19rem]=304px vs real 393px. With JS off, #start ships as an aria-hidden pulsing div — no CTA at all. Fix: cut hero bullets to two on mobile, fold the badge row into the card hint, move useSearchParams to the server component. -> /impeccable adapt

[P1] Three CTAs, one destination, all backwards. Measured -2,860px, -2,864px, -4,182px. Both pricing buttons share one ctaHref, so plan selection is decorative. No arrival feedback. Fix: render SignInButtons inline in pricing; minimum #start?plan=pro plus :target ring. -> /impeccable shape

[P1] Reassurance is 1,500-5,700px from the button that needs it. FAQ titled "Before you hand over your history" sits below price; "What happens to my data?" at 5,764px on mobile. SignInCard offers 25 words. The differentiator "It tells you what you are missing" is rendered as a red X on bg-flag-soft — the error palette. Fix: one checkable claim in the card, move #faq above #pricing, recolour to accent-soft. -> /impeccable clarify

[P2] Three measured layout defects. FAQ heading left 96px vs list left 256px (floats free both sides). #pricing bg rgb(255,255,255) and Free card bg rgb(255,255,255), box-shadow none. Line length 156 CPL on the missing-requirements body at 1280px, 116-127 in FAQ answers, 120 on the pricing footnote; mobile fine at 38-58. -> /impeccable layout

## Persona Red Flags

Jordan: card never says what happens after the click; "application pack" undefined at first use; red X reads as error; picks Free and is teleported 2,860px up; raw provider error with no support contact.
Riley: JS off leaves a pulsing rectangle as the only CTA; lg:sticky has 137px of travel on a 4,606px page; both pricing buttons share one href; opening all six details pushes the close CTA further away.
Casey: header nav display:none at 375px — 8% of viewport is logo + theme toggle only; 6,992px document; theme toggle 36x36, footer links 18px tall; HeroVisual is 795px of aria-hidden decoration before the first explanation.

## Minor Observations

Check glyph carries four meanings. Russian/Spanish cover letters — a direct answer to the relocating audience — appear only as pricing row 4. --accent is exactly blue-600. The ol renders 01/02/03 as text inside list items, so screen readers announce both. Footer tagline is better positioning than anything above it, at 12px in the faintest grey. Confirmed clean: zero horizontal overflow both viewports, contrast passes (faint 4.66:1, muted 6.9:1), no nested cards, no gradient/glow/halo/pulsing dots.

## False Positives

Stuck-skeleton observation was a browser-pane artifact (visibilityState hidden throttles React's boundary resume); resolved when fronted. hero-eyebrow-chip does not apply (no chip styling). em-dash-overuse does not fire. nested-cards, flat-type-hierarchy, tight-leading, oversized-h1, extreme-negative-tracking all measured, none fire.

## Questions to Consider

Why does a page whose argument is "we are not like the other AI resume tools" look exactly like them? What if the page had no #start anchors at all and rendered sign-in inline three times? Why is the FAQ below the price? Your hero shows a Financial Analyst in Berlin and your only doors are Google and GitHub — which decision is wrong? The design system defines motion the front door never uses — deliberate stillness, or unfinished? If the honest thing is the valuable thing, why is it in the error palette?
