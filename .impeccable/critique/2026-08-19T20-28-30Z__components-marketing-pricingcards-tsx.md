---
target: pricing section
total_score: 21
max_score: 36
na_heuristics: 7
p0_count: 3
p1_count: 3
timestamp: 2026-08-19T20-28-30Z
slug: components-marketing-pricingcards-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence), isolated, parallel. B returned before A, so its measurements entered the synthesis context first; A's verdict was formed independently in its own context.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | CTA jumps the viewport with no acknowledgement; landed element renders no focus ring |
| 2 | Match System / Real World | 3 | "Renew every 30 days" describes a calendar reset; the code counts a rolling window |
| 3 | User Control and Freedom | 2 | Two CTAs, one destination; cannot buy or signal Pro from this surface |
| 4 | Consistency and Standards | 2 | Exact at 1280, correct when stacked, 21.13px out between 768 and ~1022px side by side |
| 5 | Error Prevention | 3 | Good pre-emption; nothing says what happens at application #4 |
| 6 | Recognition Rather Than Recall | 2 | At 375 mirrored rows sit 453px apart |
| 7 | Flexibility and Efficiency | n/a | Persuade surface, two static plans, one destination |
| 8 | Aesthetic and Minimalist | 2 | Same payload stated three times inside 1,047px |
| 9 | Error Recovery | 3 | plan.live hedge well handled; nothing covers failure at checkout |
| 10 | Help and Documentation | 2 | FAQ answers the question one section below, unlinked |
| **Total** | | **21/36** | Acceptable — significant work needed |

## Design Specificity Verdict

Cards are category-interchangeable; the section around them is not. ~30% Gatecrash, 70% template, split along the edge of the component the visitor looks at longest. Authored: the definitional heading, "What never counts", "For an active search". Template: two cards, blue-600 accent, badge top-right, 36px price, four check rows, full-width CTA.

Severe miss: the gaps readout — the differentiator PRODUCT.md names twice — renders as 13px muted grey, third of four rows, identical in both cards, same tick as "Tailored resume, as Word or PDF".

Deterministic scan: detect.mjs --json across all three files returned [], exit 0. Genuine clean result; every issue here is computed layout or judgment, invisible from source.

Overlays: none available. Mutable injection worked, live server started, then blocked by the app's own CSP (script-src 'self') for cross-origin localhost:8400. Same-origin workaround via public/ defeated by the middleware matcher (307 to /login). Temp file deleted, server stopped, port free. B substituted an inline measurement library and flagged the substitution.

## What's Working

1. The four-row mirror is exactly as disciplined as it claims — both agents independently measured all deltas at 0 at 1280, including under 200% zoom. Free card marks the missing row with a minus rather than omitting it.
2. "What never counts" — four concrete non-metered actions. Metered pricing makes people ration themselves; almost nobody addresses it.
3. "For an active search" instead of "Most popular" — honest recommendation for a product with no users to count.

## Priority Issues

### [P0] Alignment fix does not hold between 768 and ~1022px
Pro hint intrinsic width 413.2px wraps to two lines until the card is ~471.2px. Card widths: 352@768, 418@900, 468@1000, 472@1024 (fits by 0.8px), 536@1280. Across the band every feature row and both CTAs sit 21.13px apart with cards SIDE BY SIDE. The reserved header only covers rows above the hint.
Fix: reserve two lines in both cards, move hints below the list, or shorten the Pro hint. Command: /impeccable adapt

### [P0] Focus ring removed from the element made focusable, same commit
app/login/page.tsx:174 — #start has tabIndex={-1} and focus:outline-none. Tailwind's .focus\:outline-none:focus (0,2,0) beats globals.css:186 :focus-visible (0,1,0). Measured outline-style: none after the jump.
Fix: drop focus:outline-none. Command: /impeccable polish

### [P0] Cards and free CTA have no measurable boundary
#pricing, .card and the free StartLink are all bg-paper — identical rgb in both themes. Only boundary is a border at 1.28:1 light / 1.33:1 dark. WCAG 1.4.11 asks 3:1 where the boundary identifies the control. Text contrast passed (34 nodes, zero failures); this is non-text contrast.
Fix: #pricing on bg-surface; free button border at --faint strength. Command: /impeccable colorize

### [P1] Both CTAs go to the same place; Pro intent discarded on arrival
Measured click: scrollY 2533 → 113, hash set, focus moved, landing correct. Destination SignInCard is headed "Start free", mentions only the free tier.
Fix: StartLink carries a plan; #start reflects it in one line. Command: /impeccable shape

### [P1] The section says the same thing three times
Lead, card rows, "What one application gives you" — one payload, 1,047px; four counting the FAQ. Pro hint pre-announces rows 1 and 4 of the list 24px below it. 1,880px at 375.
Fix: lead frames the unit; delete "What one application gives you"; keep "What never counts". Command: /impeccable distill

### [P1] "Renew every 30 days" describes a mechanism the code does not implement
lib/usage.ts counts rows since now−30d, a rolling window. Footnote says "renew", which reads as a fixed reset — especially to the second-language readers who are a primary audience.
Fix: "3 applications in any 30 days"; footnote states the mechanism. Command: /impeccable clarify

## Persona Red Flags

Ani (23, early-career, second language, Yerevan→Berlin): cannot tell from three readings whether she gets three more on day 31 or 30 days after each use; no answer to "what happens at #4" on this surface; 3→100 with no middle rung; the cover letter she'd pay for is a 13px grey row.

Marco (comparison shopper, tab 4 of 6): price treatment works, then rows 2 and 3 are identical across plans and identical to competitors. The uncopyable claim appears in both cards, telling him it isn't worth paying for. Clicks, is teleported, lands on a card that doesn't mention his plan.

Sam (first-timer via nav link labelled "Pricing"): lands on a definition, not a number. First $ is 353px below section top at 1280, ~890px at 375.

## Minor Observations

- Orphan comment at globals.css:240 from the eyebrow removal, now reading as if it belongs to .h-section.
- Lower grid 24px off the cards: gap-4 (PricingCards.tsx:78) vs md:gap-16 (page.tsx:317); right column x=672 vs Pro card x=648.
- "A cover letter, on Pro" carries a blue check in APPLICATION_INCLUDES and a minus in the free card 300px above.
- 768px at 200% zoom overflows 71px — the "per month" span, right edge 770.1px. Only overflow found at any width or zoom.
- At the same setting the badge wraps: Pro header 118px vs Free 48px.
- Eight sr-only prefixes per pass for two lists differing by one row.
- plan.live is true here and the live price equals FALLBACK_PLAN_PRICE, so a broken Polar read is detectable only by the hedge line appearing.

Discounted from A: history.replaceState framed as removing the way back. Back still leaves the page and the sticky nav returns to pricing.
Unsettled: window.innerWidth reported 451 at a 375 viewport under raised root font-size. 375-at-200% treated as unverified.

## Questions to Consider

1. If both cards produce the identical next action, why are there two buttons?
2. A Pro application costs ~$0.00035 to serve. The free tier is not protecting margin — what is it protecting, and what does this page look like at ten free applications?
3. Why is the one uncopyable claim the third grey bullet in both cards rather than what the section is about?
4. What if pricing showed the artifact instead of the lists?
