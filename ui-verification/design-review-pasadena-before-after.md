# Pasadena approved before/after gallery restoration

Date: 2026-09-30. Worktree: repos/.worktrees/pasadena-magic-replacement. Branch: codex/ui/pasadena-magic-replacement.

## Scope and acceptance

Joseph explicitly verified the five before/after pairs and requested the exact exported photographs with the slider. Restore the consumer homepage preview and full gallery only; do not alter growth, intake, auth, domains or deployment. This supersedes the earlier static-photo substitution and its provenance objection in design-review-pasadena-magic-replacement.md.

Acceptance: all five supplied pairs, original order/project selection, original split-image framing and labels, pointer/touch/keyboard reveal, city filtering, stable independent slider state, desktop/mobile usability, unchanged legacy redirects.

## Implementation

- Ten PNGs copied unchanged from files/exports/pasadena-updated/public to public/tenants/pasadena/gallery. All ten source/destination SHA-256 comparisons match. Source export remains unchanged; original archived project photos remain retained.
- Original project identities/cities/treatment descriptions restored in src/data/content.ts; numerical window-count badges remain omitted pending their separate verification.
- BeforeAfterSlider ported from the export to a Next.js client component with optimized next/image layers, responsive sizes and the same clip-path, 50% initial reveal, labels, handle, dimensions, colors and border radius.
- Pointer capture handles dragging outside the frame. Horizontal touch dragging works while vertical page scrolling remains enabled. Arrow keys move by four percentage points; Home/End reveal the entire after/before image. Focus ring and slider ARIA values are present. Each project has independent state; homepage project changes reset to 50% as in the export.
- Original full-gallery title, homepage eyebrow/instructions and split-image layout restored. No unverified installer-crew claims reintroduced.

## Test and screenshot evidence

Evidence: tmp/ui-verification/pasadena-before-after, desktop 1440x1000 and mobile 390x844. before.png, after.png, dragged.png, filtered.png and home-project-switch.png for both viewports. Standard gallery/home evidence refreshed in tmp/ui-verification/pasadena-magic-replacement. The homepage element-only capture hides the sticky header during capture to avoid an overlay artifact; runtime behavior is unchanged.

- npm run lint, npm run typecheck, npm test (59 passed), npm run build: pass.
- Playwright gallery-slider.spec.ts and website.spec.ts: 8 passed. All ten images load. Every slider's Arrow/Home/End behavior passes. Real mouse drag and Chrome DevTools touch gesture reach approximately 75%; moving one slider leaves the others unchanged. City filtering and homepage project-switch reset pass. No page errors or horizontal overflow observed.
- Reviewed screenshots show aligned before/after framing, readable labels and handle, proper clipping and responsive layout. React review: event-local updates, transient drag ref, no global listeners, semantic accessible slider, stable project keys and no server-only imports.
- git diff --check: pass.

## Disposition

Gallery restoration: local pass. No outstanding gallery-specific findings after screenshot inspection. No commit, push, deployment, external domain change or live customer interaction. Previous release blockers (reviews, intake privacy contract, authenticated inbox verification and staging activation) are unchanged; they do not block this public gallery interaction test.
