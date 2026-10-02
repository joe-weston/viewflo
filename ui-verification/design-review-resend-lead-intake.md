# Resend lead intake — design and verification review

Date: September 30, 2026. Branch: `codex/resend-lead-intake`.

## Scope and review disposition

Local implementation and public UI verification: PASS. Production activation: NOT VERIFIED / NOT AUTHORIZED.

Implemented the approved consultation and photo-request scope using the supplied Magic Patterns export as a read-only reference. The richer photo form is canonical at `/photo-intake`; existing photo links and redirect follow it. Estimate capture and a manager lead inbox are excluded. The email skill informed server-only Resend access, React Email HTML/plaintext templates, domain verification gates and stable idempotency keys. React/browser review guidance informed controlled fields, native accessible choices and real browser evidence.

Architecture/security/reviewer roles were performed in this bounded task: save-before-send with a transactional outbox; explicit tenant identity; RLS/direct-access denial; private, normalized photos; safe logs; leased claims; recipient-isolated delivery; conservative retry reconciliation. The actual SQL migration was executed in isolated PGlite, not a cloud database. Tenant/fingerprint conflict, atomic rollback, snapshots, privilege denial, distinct claims, stale tokens, retry delays and aged-claim reconciliation were exercised. Independent multi-connection concurrency and real Storage policy checks remain staging gates.

## Automated results

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 54 tests, none skipped.
- `npm run build`: PASS, Next.js 16.3.8.
- `git -c core.longpaths=true diff --check`: PASS; only Windows line-ending notices.
- `npm run test:e2e` with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3191`: 20 PASS, 2 SKIPPED. Desktop 1440×1000; mobile 390×844; installed Chrome through repository Playwright.
- Dependency audit repair completed with zero reported vulnerabilities; updated Next and the vulnerable transitive dependency without a major-version migration.

The two skips are the existing configured-manager magic-link journey, one per viewport. Required authenticated credentials/link are unavailable; no alternative login or authorization bypass was introduced. Anonymous portal access and callback/domain rejection still passed. The optional agent-browser CLI was unavailable, so the repository-required Playwright workflow provided browser automation and screenshots. The task-owned preview was stopped after verification; an existing preview on port 3188 was preserved.

Public form success/error states use isolated API fixtures and synthetic addresses; they do not establish actual provider delivery. Backend unit tests separately exercise validation, actual image normalization, save/delivery ordering and email failure. Resend SDK calls are intercepted in tests; no real email was sent.

## Browser scenarios and evidence inspected

Evidence directory: `tmp/ui-verification/resend-lead-intake/` (ignored generated artifacts).

- Consultation: initial project choices, validation focus, step transitions, city/budget details, optional photos, required contact/consent, retained values on Back, sending state, queued receipt and reference. Evidence: desktop/mobile `consultation-project`, `consultation-details`, `consultation-contact`, `consultation-contact-viewport`, `consultation-sending`, `consultation-queued` PNGs.
- Photo intake: legacy redirect, required photo/email, optional phone, file preview/removal/reselection, corrected validation, failed save retaining data, same request identity on retry, sent-confirmation receipt. Evidence: desktop/mobile `photo-empty`, `photo-selected`, `photo-contact-viewport`, `photo-error`, `photo-error-viewport`, `photo-sent` PNGs.
- Endpoint checks: foreign origin denied, retry endpoint denies missing/wrong bearer, retired API returns 410. Existing sitemap, tenant/custom-domain links, legacy pages, honest unconfigured errors and public portal safety also passed.

Visual inspection covered desktop consultation project/details/sending/queued, mobile consultation project/details/contact/queued, photo empty/selected layouts, desktop photo error/sent, and final mobile photo contact/error/sent. Full-page captures show complete document layout; focused viewport captures verify contact/error legibility and sticky-header clearance. Some scrolled full-page intermediate captures place the sticky header inside the document image; this is a capture artifact, not an overlapping receipt. Final receipt captures reset document scroll, and receipt focus is asserted independently.

## Responsive/accessibility observations

Pasadena's warm palette, typography, rounded cards and phone fallback remain consistent. Desktop splits context and form; mobile stacks these without horizontal overflow. Long mobile option lists are deliberate and match the richer reference flow. Choice labels provide large click targets, native radio/checkbox semantics and fieldset legends. Inputs have explicit labels/autocomplete, visible focus and optional/required distinctions. Sending disables duplicate submission; errors use a focused alert; success uses a status region and focused heading. Receipts distinguish saved data from queued confirmation and do not imply a booked appointment or final price.

## Findings, corrections and final disposition

1. Removing and reselecting the same photo did not trigger the native file change event. Reset the picker value while retaining selected files in state. Regression scenario now passes on both viewports.
2. Receipt transitions needed explicit focus/scroll after the long form collapsed. Added focused receipt heading and scroll positioning; both receipt paths pass focus assertions and visual review.
3. Stale email validation remained after correction. The first capture-phase cleanup caused controlled-value loss; replaced it with bubbling change cleanup that excludes file validation. Added assertions for the corrected email value and cleared alert. Full browser rerun passes.
4. Existing portal test assumed Supabase was unconfigured. Updated expectations to accept either honest unavailability or the configured login redirect while still denying anonymous billing access. Both configurations remain safety checks, not a login bypass.

No unresolved local UI finding remains. Real Supabase migration/Storage, sender-domain DNS, actual manager recipients, approved test inbox delivery, cron execution/support, privacy/retention approval and authenticated manager verification remain BLOCKED pending configuration and separately authorized staging/cloud work. Follow `LEAD-INTAKE-READINESS.md`; do not interpret this review as launch approval.
