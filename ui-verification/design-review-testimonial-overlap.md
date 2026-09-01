# Testimonial Overlap Design Review

Date: 2026-09-01

## Scenario

Reviewed the homepage testimonial panel near the footer after the user reported overlapping testimonial copy.

## Change

The legacy stylesheet expected JavaScript to rotate absolutely positioned testimonial paragraphs. The mirrored Next.js pages strip legacy scripts, so all review paragraphs occupied the same position. Added a CSS-only testimonial cycle fallback so only one testimonial is visible at a time.

## Evidence

- Desktop screenshot: `tmp/ui-verification/testimonial-overlap/desktop.png`
- Mobile screenshot: `tmp/ui-verification/testimonial-overlap/mobile.png`
- Automated visible-review count: 1 on desktop, 1 on mobile.

## Findings

- Pass: testimonial copy no longer overlaps in the footer panel.
- Pass: desktop and mobile screenshots show a single readable testimonial.
- Residual: other legacy homepage visual quirks remain from the source mirror, including text overlays in product image cards. Those were not part of this selected issue.
