# Business review profile links — October 2, 2026

## Scope and acceptance

Coordinator/planner: follow-up to the authorized staging review change, on `codex/ui/customer-review-excerpts`. Add Google and Yelp profile links immediately above the quote cards, below the section heading. Preserve the existing review content and Magic Patterns typography, colors and card layout. No API, dependency, authentication, environment, database or production changes.

Product: visitors can see `Google Reviews 5.0 (27)` and `Yelp Reviews 5.0 (11)` and open the corresponding business profiles. Ratings/counts were verified directly on both business profiles in this session on October 2, 2026; they are a curated snapshot, not a live feed. Acceptance includes mobile wrapping without overflow, visible keyboard focus, accessible rating/count labels, and at least 44-pixel touch targets. Verdict: ready.

Implementation: `src/data/customer-reviews.ts` holds both business profile summaries; `src/components/home/Testimonials.tsx` renders two cream/brass-compatible pill links above the quote grid. Static checks, tests, build, Playwright desktop/mobile screenshots, visual inspection and final diff review required before staging.

## Verification

- Lint, typecheck, unit tests (65), and production build: pass on Node 24.19.0 / Next.js 16.3.8.
- `node tmp/ui-verification/review-profile-links/verify.cjs`: pass at 1440, 768, 390 and 320 pixels. Verified the two exact business profile URLs, accessible platform/rating/count labels, new-tab protections, keyboard focus, 44-pixel minimum targets, placement above the quote grid, existing three quotes and individual links, no page errors and no horizontal overflow.
- Screenshots captured under `tmp/ui-verification/review-profile-links/`: `desktop-reviews.png`, `tablet-reviews.png`, `mobile-reviews.png`, `narrow-reviews.png`. Inspected all four. Desktop/tablet badges sit side by side; mobile badges wrap. Typography, palette, cards and quote content remain consistent; no overlap, clipping or nested scrolling. Screenshot-only smooth scrolling was disabled to avoid capturing the page while it moved; product scroll behavior was not changed.
- `git diff --check`: pass. Reviewer: no findings; only the two intended source files and this review document changed. Coder handoff: profile summary data and two links added, quote content preserved. No permanent tests added for this low-impact content/layout correction; verification script is retained in ignored tmp.

UI QA disposition: pass. Staging validator: pass for this bounded public display change under the existing staging authorization. Production unchanged. Residual risk: ratings/counts are static values verified October 2, 2026 and will need refreshing when the business profiles change.
