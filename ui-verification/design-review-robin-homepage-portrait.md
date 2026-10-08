# Robin homepage portrait review — 2026-10-07

## Scope and acceptance

Coordinator/planner: update the Pasadena homepage owner portrait with Joseph's generated ivory-blouse portrait. Work is isolated from the dirty implementation checkout on `codex/ui/robin-homepage-portrait`, based on `origin/staging`. Commit, push and staging PR are authorized; merge and production release are outside this request.

Product-manager verdict: ready. Acceptance is the new portrait loading in the existing 4:5 owner card on desktop and mobile, with the existing caption, alternative text, copy, CTA, layout and tenant routing preserved. No new workflows, authentication changes, or database changes are needed.

Coder handoff: added `public/tenants/pasadena/robin-alvarez-portrait-ivory.webp` (800×1000, 97,520 bytes) and updated only the image URL in `src/components/home/OwnerStory.tsx`. The new filename avoids reuse of the previous optimized-image cache. The original asset is retained for rollback. No permanent tests were added for this asset replacement; existing public-site regression tests and a local Playwright verification exercise the rendering.

## Tester evidence

Windows Node 24, clean npm lockfile installation, isolated staging-based worktree:

- `npm ci --no-audit --no-fund`: pass; dependency deprecation/install-script notices only.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: pass, 72 tests, zero skipped.
- `npm run build`: pass.
- `npm run test:e2e -- tests/e2e/website.spec.ts --grep 'public design'`: pass for desktop and mobile; includes public homepage, responsive navigation and gallery filtering.
- Local Playwright portrait check: pass at 1440×1000 and 390×844; decoded optimized image uses the new URL, rendered ratio is 4:5, no horizontal overflow or browser exceptions.
- `git diff --check`: pass.

The affected homepage is public and requires no credentials. Authenticated administrative workflows are unaffected and were not exercised.

## UI QA evidence and disposition

Screenshots captured and visually inspected:

- `tmp/ui-verification/robin-homepage-portrait/desktop-owner-section.png`
- `tmp/ui-verification/robin-homepage-portrait/mobile-owner-section.png`
- Viewport captures also saved in the same directory.

Desktop: new portrait fills the existing rounded card, with hair breathing room and visible shoulders. Warm background fits the page palette. Adjacent copy and consultation CTA remain readable and aligned.

Mobile: portrait, caption, heading, credentials and CTA stack cleanly. No clipping, overlap, cramped controls, horizontal scroll or new nested scroll containers observed. Image alternative text and layout classes are unchanged; no keyboard or touch interaction was introduced.

UI QA verdict: pass. No non-pass findings.

## Reviewer and target readiness

Reviewer: no findings in the asset and one-line image-reference diff. No unrelated source, configuration, dependencies, preserved legacy material or secret files are included. Residual risk: visual identity fidelity is that of the generated portrait selected in this conversation; this review verifies site rendering, not identity equivalence.

Production-validator disposition: staging PR ready. No migration or environment changes. Rollback is restoring the previous image URL. Production release validation is not applicable to this request; no production-ready release verdict or merge authorization is implied.
