# Pasadena staging corrections — design review

October 2, 2026. Local built preview, desktop 1440×1000 and mobile 390×844. **Public UI pass; authenticated/hosted delivery workflow blocked.**

## Evidence and scenarios

Evidence root: `tmp/ui-verification/pasadena-staging-corrections/`. Reviewed desktop/mobile review snapshots, archived project summaries with loaded photos, service product subsections, consultation city/details/contact summaries, photo selection/error/contact controls, and receipt states. The website suite also captures full home/gallery/service/legal screens under `tmp/ui-verification/pasadena-magic-replacement/`. Gallery keyboard/drag/touch screenshots are under `tmp/ui-verification/pasadena-before-after/`.

Representative inspected files:

- `desktop-reviews.png`, `mobile-reviews.png`: separately labelled platform ratings/totals, source authors/dates/excerpts and write-review action.
- `mobile-legacy-projects.png`: original project photograph, specific street/city/treatment summary and clear wrapping.
- `desktop-servicesblinds.png`, `mobile-servicesblinds.png`: quote block removed, separate wood/faux wood destinations and neutral action copy.
- `desktop-consultation-contact-viewport.png`, `mobile-consultation-details.png`: no budget control or summary; city and optional photo/notes remain clear.
- `mobile-photo-contact-viewport.png`, `mobile-photo-error-viewport.png`: readable labels, consent, send control and retry message.
- `desktop-photo-sent.png`, `mobile-consultation-queued.png`: distinct saved/queued receipt states. Synthetic API fixtures verify presentation only.

## Findings and disposition

1. Desktop fourth before/after comparison initially displayed a blank image region while the source and optimized endpoint were available. Fixed by initial eager loading of the comparison images. Rebuilt and reran the gallery and website scenarios; all five pairs load and their keyboard/drag/touch behavior passes.
2. Existing `#gallery` descendant behavior was initially lost when adding the canonical alias. Fixed by wrapping the complete section with its historical alias. Existing section aliases retain descendant content and the old gallery test passes without changing its selector.
3. Initial archived-project screenshot captured lazy photos before they loaded. Evidence now waits for image readiness and shows the preserved source photos.
4. Prior gallery article-count expectations included the five new summaries. The test now counts articles containing comparison sliders; filtered comparisons still remain independent of the source archive.

No remaining observed clipping, overlap, horizontal page scroll, nested scrollbars or changes to the global type/color system. Mobile cards and controls wrap naturally. Form keyboard focus remains visible, errors receive focus, and inputs retain accessible labels. Links use underlines and accessible platform/action names. Sticky destinations provide at least 112px scroll clearance; the choosing-treatments FAQ opens on direct hash navigation.

## Limits

Twenty affected public Playwright checks and two intercepted analytics checks pass. Canonical authentication credentials are absent, so real Supabase owner inbox/photo viewing and sign-in return navigation are blocked. Hosted Turnstile and real Resend delivery/mailbox receipt are also blocked. No fixture screenshot is treated as proof of persistence or email arrival. The configured Supabase project has no tables, users, buckets or recorded migrations at inspection; a prepared migration does not make its hosted workflow ready.

## Current staging integration

Merged staging through 2254f80: Robin's optimized portrait and distinct phone-field guidance are preserved. The newer Google-only excerpts are superseded by the explicitly requested six-review snapshot. The inherited phone test was updated to omit the removed budget question. Reran lint, typecheck, 72 unit/API/database tests and build successfully. The combined browser suite includes the phone validation regression; inspected its desktop error screenshot. Hosted gates above remain open.

Combined staging integration: all 22 public browser checks passed on desktop/mobile, including the inherited phone regression. Inspected both phone error screenshots: clear field identification, readable correction guidance and no clipping. Two intercepted analytics checks passed before integration; analytics implementation was unaffected by the staging merge.
