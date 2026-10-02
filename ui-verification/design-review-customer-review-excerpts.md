# Customer review excerpts — October 2, 2026

## Coordinator, planner, product review

Joseph requested actual customer review excerpts and direct source links, using the updated Magic Patterns layout. Work uses the existing clean Magic Patterns replacement checkout, branch `codex/ui/customer-review-excerpts`; the canonical checkout contains unrelated unfinished work and was left untouched.

Acceptance: the three Google reviews Joseph supplied, accurate attribution and verified five-star ratings; each opens its full review; one featured serif quote with two smaller sand cards, existing cream section, brass stars, rounded borders, and responsive stacking. Preserve `#reviews`. No invented city, project, aggregate count, rating, or date. No API integration, global styles, source export edits, commit, publication, or deployment. Product verdict: ready.

Changed files: `src/components/home/Testimonials.tsx`, new `src/data/customer-reviews.ts`. Risks: attribution, link targets, source freshness, mobile overflow, keyboard/touch usability. Required checks: lint, typecheck, unit tests, build, public Playwright verification with desktop/mobile screenshots. Rollback: revert only these task files.

## Review provenance

Verified the business website and telephone on Google Maps; sorted reviews by Newest, then opened each supplied review URL directly on October 2, 2026. Eileen Christensen: five months ago; Michael Argumaniz Hardin: three years ago; Stephanie Darling: two years ago. All individually rated five stars. The section does not call them all recent or claim a live feed. Short excerpts preserve original words and mark omissions.

- Eileen: https://maps.app.goo.gl/a1VfrtoLy5zmHgQ28
- Michael: https://maps.app.goo.gl/nzn81KT2Z1XHNZmE9
- Stephanie: https://maps.app.goo.gl/R959oPJscXtsY4ud6

Yelp was also inspected and matched the supplied screenshot. Google alone meets the Google and/or Yelp scope. Magic Patterns sample reviewers and the 212-review claim were not reused.

## Validation and disposition

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: 59 tests passed.
- `npm run build`: pass, Next.js 16.3.8 / Node 24.19.0.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3194 npm run test:e2e -- tests/e2e/website.spec.ts`: six desktop/mobile scenarios passed, covering the public home, navigation, gallery filter, service/legal routes, unknown URLs, and all 50 preserved URL redirects.
- `node tmp/ui-verification/customer-review-excerpts/verify.cjs`: pass at 1440, 768, 390, and 320 pixels. Three attributed review figures, three five-star labels, exact source hrefs, new-tab protections, keyboard focus, minimum 44-pixel link height, no page errors or horizontal overflow.
- `git diff --check`: pass. Only the review component, review data, and this evidence file changed.

Initial WSL tests were blocked by the existing Windows esbuild binary in node_modules. Retried tests and build using the native Windows Node 24 installation; all passed without reinstalling dependencies or changing the lockfile. Lint and typecheck passed under WSL.

## UI QA and reviewer disposition

Inspected `tmp/ui-verification/customer-review-excerpts/desktop-reviews.png`, `tablet-reviews.png`, `mobile-reviews.png`, and `narrow-reviews.png`. Desktop retains the asymmetric featured quote and two stacked sand cards. Tablet uses a featured card above two smaller cards; mobile stacks all three. Existing fonts, cream/sand/brass colors, rounded borders, and spacing are preserved. No clipped text, nested scrolling, overlap, truncation, or mobile scrunching. Focus outlines are visible and touch targets are at least 44 pixels high. Original review targets were opened in Google Maps and matched the credited names and text.

Reviewer: no findings. Coder handoff: one component replaced with the supplied review content and one dedicated static data file; no API, auth, route, dependency, or global style changes. No permanent tests added for this bounded content/layout correction; the repeatable verification script and screenshots remain under ignored tmp. Authentication is not part of this public read-only journey.

Final disposition: local implementation and UI verification pass. Residual risk: this is a curated snapshot, so review content and external links may change; it does not refresh automatically. Eileen's review is the latest observed (about five months old); the other supplied Google reviews are older. Production validator: release/deployment not applicable to this local task; no production-ready or publication claim. No commit, push, PR, or deployment performed.

## Authorized staging release

Joseph subsequently requested “please push to staging.” Applied only this task's three files to current `origin/staging` (`8bc7ec1`) on the task branch, preserving the existing portrait, consultation-phone, and release fixes. Re-ran lint, typecheck, unit tests (65 passed), and build against this integrated staging candidate; all passed. Reviewer: the staging delta contains only the reviewed component, static excerpts, and evidence document. Staging validator: pass for this bounded public UI update; no database, auth, billing, environment, or production change required. Push target: `origin/staging`, which triggers the existing Viewflo Vercel preview deployment and `staging.viewflo.app` alias. Production launch remains outside this authorization.
