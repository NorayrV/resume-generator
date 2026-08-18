---
target: resume results
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-18T20-42-27Z
slug: components-resumeresult-tsx
---
Method: dual-agent (A design review, B detector+browser evidence; isolated and parallel). Mode: Operate.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Panes never disclose that most of the document is off-screen |
| 2 | Match System / Real World | 3 | Document rendered at 301px nobody will read at 301px |
| 3 | User Control and Freedom | 2 | "Generate again" is the only remedy and costs an allowance |
| 4 | Consistency and Standards | 3 | Heading levels skip h2 to h4; resume pane bordered, letter pane not |
| 5 | Error Prevention | 1 | Export above the document, enabled from first paint |
| 6 | Recognition Rather Than Recall | 1 | 13 assertions at top, zero markers in the document |
| 7 | Flexibility and Efficiency | 1 | No expand or full-screen read; 26rem pane identical at 375 and 2560 |
| 8 | Aesthetic and Minimalist | 3 | Clean, but analysis outranks the artifact |
| 9 | Error Recovery | 2 | Download errors read well; Copy fails silently |
| 10 | Help and Documentation | 2 | Nothing says the panes scroll |
| Total | | 20/40 | Acceptable |

## Design Specificity Verdict

Split: specific thinking, interchangeable composition. The honesty lives in the copy and almost nowhere in the layout. Authored: refusing "match score", raw counts beside the percentage, gaps at equal weight, drafted-bullet disclosure, white sheet in dark mode, RFC 5987 filenames. Interchangeable: stat card on top, 2-up grid, 32px icon buttons, fixed-height inner scroller, chips for good news and bullets for bad.

Detector: [] exit 0 across four files — a false clean, not a pass. On .tsx only the regex engine runs; both DOM engines dependency-dead. Real issues were found on this surface that the detector reported nothing about.

## Measurement correction

Two probes with different fixtures produced different hidden-content figures. Resume pane hid 68-71% at 375px; cover letter 17-26%. Content-dependent — never quote as fixed. The source comments in ResumePreview.tsx:66 (361px/472px) and CoverLetter.tsx:172 (124px) are stale against real content (measured 585px/894px and 149px).

## Priority Issues

[P0] Reading surface shows a minority of the document and never admits it. 59% hidden at 1280, 68% at 375. box-shadow none, mask-image none, no page count, overlay scrollbars invisible at rest. Letter pane has zero border and a ~1.04:1 background step. Fix: render at natural height, or add fade + page count + full-screen mode.

[P1] Claims separated from evidence. 9 chips + 3 gaps + 1 drafted role asserted at top; preview marks none. draftedRoles never passed to ResumePreview. Fix: tag the drafted role inline, link the banner to it, highlight chip occurrences.

[P1] Remedy is all-or-nothing. "Generate again" is the only response; on Free that is a third of the month's allowance to fix one bullet. Fix: edit before download, at minimum for drafted bullets.

[P2] Export easier than reading, spatially and in tab order. Tab order is Word, PDF, resume region, Copy, letter region — export precedes the content it acts on. Buttons 32px at y=645, 189px above the document on mobile. Fix: repeat export below the preview, raise to 40px.

[P2] Download refusals all get the same inert red box. Five server refusals, one code path, no status inspection. 401 has no sign-in link; 429 leaves buttons enabled with no countdown. Unrecognised format silently substituted with docx returning 200; JSON.parse failure falls through to 400.

## Persona Red Flags

Alex: screen identical every run, remembers nothing, no diff, no keyboard path. By run three he downloads on the percentage alone.
Sam: live region, focusable named panes and role=status alert all correct — then heading nav jumps h2 to h4, coverage has no heading or landmark, pane label never says how long the document is. Can reach everything, verify almost nothing.
Riley: two roles at one employer read as job-hopping; a bullet-less role contradicts the banner above it; the denominator is whatever the model returned, so "50% of 1 of 2" carries the same authority as "9 of 12".

## Minor Observations

Nothing names the posting. Word primary over PDF, never explained. Copy has no failure state. Empty state pre-frames the honesty well. Contact line joins with two-space pipes matching the generator. The total===0 guard also removes the line stating what was produced.

## False Positives

Decorative bullet glyphs are aria-hidden and pass anyway. Scroll regions are keyboard stops, not touch targets. role=img progress bar is labelled and intentional. 102 text nodes checked, zero contrast failures in both themes and viewports. Zero horizontal overflow, zero console errors.

Coverage gap: the cover-letter language tablist was never measured because the probe supplied only English, suppressing the control. Its role=tab semantics and target sizes are unmeasured and are the most likely remaining target-size failure.

## Questions

If the coverage percentage were deleted, would users check more carefully or less — is the number doing the reading for them? What would this layout look like designed to make someone finish reading? Why is the artifact smaller on screen than the analysis of it? If a bullet is wrong, is "spend an allowance and re-roll everything, or send it anyway" the answer the product wants to give? Would all nine chips survive having to show the sentence that earned them?
