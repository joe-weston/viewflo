# Robin earring correction — 2026-10-08

Coordinator/planner: Joseph authorized pushing the corrected portrait into staging. Isolated branch `codex/ui/robin-earring-correction` starts at staging `741e32f`. Preserve unrelated dirty work in the primary checkout. Production changes are outside scope.

Product acceptance and verdict: ready. Show the corrected portrait without the old dangling earring remnant, with matching gold hoops partially covered by hair, in the existing desktop/mobile owner card. Preserve layout, copy, alternative text and CTA.

Coder handoff: add `public/tenants/pasadena/robin-alvarez-portrait-earrings.webp` (800×1000, 93,408 bytes) and change only the image URL in `src/components/home/OwnerStory.tsx`. New filename avoids stale optimized images. Retain previous asset for rollback. No new permanent tests needed for an image substitution.

Tester results:

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: 73 passed, zero skipped.
- `npm run build`: pass.
- `npm run test:e2e -- tests/e2e/website.spec.ts --grep 'public design'`: desktop/mobile pass, including homepage, responsive navigation and gallery filter.
- Local Playwright portrait check: pass; new optimized image decodes, retains 4:5 ratio, with no browser exceptions or horizontal overflow at 1440×1000 and 390×844.
- `git diff --check`: pass.

UI QA: visually inspected `tmp/ui-verification/robin-earring-correction/desktop-owner-section.png` and `mobile-owner-section.png`. Both show matching clean gold hoops; old ornate remnant is absent. Portrait, shoulders and hair fit the existing card without clipping. Copy and CTA remain legible, with clean mobile stacking, no overlap or new nested scroll containers. Alternative text is unchanged and no interaction changed. Public workflow requires no authentication; administrative flows are unaffected.

Reviewer: no findings in the three-file diff. No global colors, layout, dependencies, routing, data or authentication edits. Existing staging palette is preserved. Residual risk is generated-image fidelity; visual review confirms the requested earring correction and site rendering.

UI QA disposition: pass. Staging readiness: pass. Rollback restores the previous image URL. No migrations or environment updates required. Production release is not part of this staging push.
