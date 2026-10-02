# Pasadena replacement design and validation review

Date: 2026-09-06. Local preview: http://127.0.0.1:3187. Branch: codex/pasadena-replacement, base 997e5d5. Production unchanged. Review performed as deliberate planner/product/architecture/coder/tester/UI/security/reviewer perspectives in this task; no separate external reviewer is claimed.

## Verdict

Local public UI and tested request behavior pass the reviewed scenarios. Overall release/authenticated-delivery verdict: **BLOCKED**. Supabase/Turnstile configuration, real authenticated receipt/private-policy checks, human intake ownership, consultation handling approval, client content/design approval and fourteen verified measurement days remain outstanding. Receipt screenshots named fixture are simulated API responses, not proof of delivery to Robin.

## Evidence inspected

Screenshots are under tmp/ui-verification/pasadena-replacement. Desktop: 1440×1000. Mobile: 390×844, touch, reduced motion. Full-page images and readable review copies were inspected, including home top, menu, services, project gallery, FAQ, consultation, legacy newsletter and feedback, and photo-form empty/selected/sending/unavailable/receipt states.

| Journey | Evidence files | Observations / disposition |
|---|---|---|
| Home and source design | desktop-home.png, mobile-home.png, desktop-home-top.png, mobile-home-top.png | Source layout, palette, intended fonts and prominent photo CTA retained. Fonts independently confirmed loaded. Compact desktop header labels prevent cramped navigation. No horizontal overflow in checked views. Pass. |
| Mobile menu | mobile-menu.png | Large touch targets, expanded state, close control and section links work; Escape closes menu. Pass. |
| Service pages | desktop-service.png, mobile-service.png | Responsive service details and real quote-request CTA; unverified demo prices/times removed. Pass. |
| Gallery | desktop-gallery.png, mobile-gallery.png | Three actual legacy project photographs load; fictional before/after claims removed. Links preserve project routes. Pass. |
| FAQ | desktop-faq.png, mobile-faq.png | Button expanded state and answer content verified; reduced motion supported. Pass. |
| Photo input | desktop-photo-empty.png, mobile-photo-empty.png, *-photo-selected.png | Real file selection, thumbnail/name, removal, contact/notes, consent and size/type guidance. Inputs labeled; error receives focus. Pass. |
| Photo progress | desktop-photo-sending.png, mobile-photo-sending.png | Disabled submit/fieldset while sending; labeled progress/status. Browser fixture delays response; does not hit live storage. Pass for UI contract. |
| Photo failure | desktop-photo-unavailable.png, mobile-photo-unavailable.png | Actual local endpoint returns unavailable while unconfigured; user sees phone fallback and no false success. Pass. |
| Photo receipt | desktop-photo-receipt-fixture.png, mobile-photo-receipt-fixture.png | Reference and human-review wording; no instant pricing/appointment promise. Fixture only; real staging receipt blocked. |
| Consultation | desktop-consultation.png, mobile-consultation.png | Working phone-link destination and photo route. Broken Wufoo embed removed after provider error was visually confirmed. Phone-first fallback requires launch approval or owned-form replacement. |
| Preserved legacy support pages | desktop-newsletter.php.png, mobile-newsletter.php.png, desktop-feedback.php.png, mobile-feedback.php.png | New shell, old URL/content, contact guidance instead of old Wufoo mounts. References to online form/signup updated to contact guidance. |

## Findings corrected

1. Supplied MVP content.ts was truncated and Tailwind maxWidth contained a misplaced content array. Replaced malformed configuration and source-backed data.
2. Exported Google font imports did not load after migration. Switched to next/font with Fraunces/Inter and verified browser font status; refreshed screenshots.
3. Desktop header's long duplicate CTA labels caused tight wrapping. Shortened the header photo label, retained full prominent hero/photo wording.
4. Local Next request URL normalization rejected legitimate same-origin uploads. Validated against actual Host with protocol matching; unit and browser regression checks pass.
5. Uncertain DB insert failures could delete photos associated with a committed request. Added request identity/fingerprint and reconciliation before deletion; actual remote fault tests remain blocked until staging.
6. Dependency audit identified vulnerable sharp/libvips. Updated sharp; final audit reports zero advisories.
7. Source Wufoo qh61a851fzs4gd resolves to provider error, even with original embed script. Removed broken iframe, replaced inherited mounts with contact guidance. Provider ownership/form restoration remains a release decision.
8. Lazy-image screenshot timing and Next's extra route-announcer alert produced incorrect test failures; checks now wait for images and target the form alert. These were evidence issues, not silently waived UI failures.

## Checks and limits

- Production build passes: 65 generated pages/system routes; real Node API endpoint.
- TypeScript and ESLint pass; git diff --check passes.
- 13 unit/API tests pass: contact/consent, format/count/size, actual stream bound, metadata stripping from a fixture with EXIF, malformed image bytes, origin, security failure, persistence failure, request identity/fingerprint.
- 8 Playwright desktop/mobile workflow tests pass; no page errors in homepage/gallery flow. Tests never submit to clients or production.
- Additional read-only local crawl: all 59 sitemap URLs return 200; unknown paths and services return 404.
- npm audit: zero vulnerabilities in full dependency tree.
- Agent-browser CLI was attempted but returned CDP response channel closed. Direct Playwright with installed Chrome provided the actual browser verification and screenshots.
- The canonical checkout has no .env files. Worktree has only .env.example. Relevant process credentials are absent. Authentication was not bypassed. Server tests inject fake persistence/security dependencies; browser receipt tests intercept only local requests.

## Security / production review

No live schema or storage mutation, notification, payment, push, merge or deployment. No customer input enters analytics. Private storage, RLS/revoked anonymous/authenticated table access, server-only keys, image normalization, consent, origin validation, Turnstile and idempotent request identities are implemented. Database/storage policies, actual reviewer access, challenge verification and receipt must be tested on the authorized staging project before the security and production gates can pass. No production-ready verdict is issued.

Source originals remain unchanged; SHA-256 provenance is recorded in SOURCE-PROVENANCE.md. Existing main is clean at 997e5d5. The replacement worktree remains local and uncommitted. See LAUNCH-READINESS.md for the concrete remaining decisions and measurement owner.

## 2026-09-20 consolidation verification

The exact Pasadena legacy snapshot now renders as Viewflo tenant `pasadena-shades-and-shutters`, both at the Viewflo tenant path and when a request carries an allow-listed Pasadena hostname. The legacy route layout is isolated from the Viewflo platform shell so the preserved site remains visually unchanged; root-relative page links stay on the custom domain and assets are tenant-scoped under `/tenants/pasadena`.

Fresh Playwright evidence is in `tmp/ui-verification/pasadena-replacement`, including `desktop-legacy-home.png` (1440 px viewport) and `mobile-legacy-home.png` (390 px viewport), plus retained gallery, service, consultation, privacy, and photo-intake states. The suite verified the legacy heading, image completion, custom-host root routing, internal-link behavior, no horizontal overflow, and desktop/mobile workflows. Result: 10 passed, 2 skipped. The two skips are authenticated portal agreement/billing scenarios because approved test credentials and canonical account configuration were unavailable.

Automated and static disposition: lint passed, typecheck passed, 28 unit/API tests passed, production build passed, and the runnable browser suite passed. Source and public-asset trees were byte-for-byte compared with the retiring Pasadena checkout before deletion.

Visual-review tooling disposition: screenshot capture succeeded, but three independent image-view paths (workspace image viewer, computer-use browser kernel, and Node image emitter) failed at the host Windows sandbox initialization layer with `helper_unknown_error: setup refresh had errors`. Therefore the new screenshots could not receive the required human-like visual inspection in this task. Layout assertions and image-load checks passed, but the screenshot-inspection gate remains **BLOCKED** until the host viewer is repaired and the captured desktop/mobile files are opened. This limitation does not invalidate source equivalence or automated routing behavior, but it prevents a production-ready UI verdict.

Security/reviewer disposition: hostname routing is allow-listed; client-provided internal-routing markers are cleared and only set by verified host mapping; path traversal is rejected; public tenant routing does not weaken authenticated admin or RLS boundaries; raw HTML is trusted local snapshot content, not user input; no secret was copied into the repository or archive. No deployment, domain change, database migration, payment activation, or client notification occurred.

