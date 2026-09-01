# FAQ Accordion Design Review

Date: 2026-09-01

## Scenario

Reviewed `/faqs.php` after the user reported that the FAQ area should mirror the live expandable accordion rather than displaying all answers as plain stacked text.

## Change

The captured FAQ page includes jQuery UI accordion setup, but the Next.js mirror strips legacy scripts from injected HTML. Added a CSS-only FAQ accordion fallback that mirrors the live default state: first FAQ open, remaining FAQ rows collapsed.

## Evidence

- Desktop screenshot: `tmp/ui-verification/faq-accordion/desktop.png`
- Mobile screenshot: `tmp/ui-verification/faq-accordion/mobile.png`
- Automated state check: first panel display is `block`; second and third panel display is `none`.

## Findings

- Pass: FAQ page now visually matches the live accordion pattern.
- Pass: desktop and mobile states are readable and not overlapping.
- Residual: this is a static CSS recreation of the initial jQuery UI state, not a clickable JavaScript accordion.
