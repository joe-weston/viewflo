# Pasadena Magic Patterns replacement — implementation and design review

Date: 2026-09-30. Branch: codex/ui/pasadena-magic-replacement.
Worktree: C:/Users/josep/projects/Viewflo/repos/.worktrees/pasadena-magic-replacement.
Base: 5874ad9. Local preview: http://127.0.0.1:3196/pasadena-shades-and-shutters/.
This is a local, uncommitted implementation. No push, PR, merge, production deployment, domain change, email, or live database migration was performed. The primary checkout and concurrent Resend implementation were not edited.

## Disposition

Public routes and reviewed desktop/mobile workflows pass local verification. Release verdict: BLOCKED, not production-ready. Verified review snapshots, final design/content acceptance, email-plan reconciliation, authenticated inbox screenshots, and authorized staging delivery checks remain outstanding. This review is performed in this task; it does not claim independent reviewer approval.

## Scope and architecture

- App Router replacement of the public legacy renderer; growth/internal routes remain 404.
- Five service pages, gallery, consultation, send-photos, home, privacy and terms: 11 indexable paths including the two legal pages.
- Explicit manifest of 50 old non-home routes plus home, maintained in lib/pasadena-site.ts and tested against the preserved snapshot inventory.
- Canonical origin currently implemented: https://www.pasadenashadesandshutters.com. Verified custom hosts rewrite internally to the shared tenant path. Apex and production viewflo.app public tenant paths permanently redirect to that canonical origin. Localhost/preview paths retain the tenant prefix and are noindex.
- This follows the custom-domain-canonical decision in the reviewed plan; it does NOT implement the original platform-path-canonical proposal. Reconfirm before cutover if that decision has changed.
- HTTP 308 is server-side routing, not registrar/DNS URL forwarding. Domain attachment and TLS still require the host's normal domain configuration. A redirect does not guarantee unchanged search rankings.
- Admin, API and auth paths are excluded from public canonicalization, preserving Supabase login origins. Unapproved hosts and unknown public pages do not receive wildcard homepage redirects.
- Proxy removes client-provided tenant headers/query markers, sets trusted routing context only for allowlisted hosts, and preserves marketing query parameters across old-route redirects.
- Canonical metadata, truthful LocalBusiness JSON-LD, modern sitemap, protected robots exclusions, and real 404s replace legacy HTML rendering.
- Shared tenant-scoped intake supports durable Supabase lead/photo/outbox records, immutable private normalized photos, Turnstile, consent, request identity, independent idempotent Resend deliveries and protected retry scheduling.
- Owner inbox uses existing Supabase authentication and tenant ownership, not another auth mechanism. RLS permits owner-scoped reads and status-only updates; private photo responses are no-store.
- Old /api/photo-requests returns 410 so cached forms cannot bypass the shared notification pipeline.
- Prepared migrations 202609300001_lead_intake.sql and 202609300002_lead_inbox.sql were tested locally with PGlite, never applied remotely.

## Content provenance

Read-only export: files/exports/pasadena-updated.
Read-only owner transcript: files/source/meetings/pasadena/09252026-Joe-Robin-phonecall.txt.
Legacy snapshot: tenant-sites/pasadena/content/mirror.
Actual gallery photographs: public/tenants/pasadena/shutter-projects/images.

Phone: 818-618-5288, carried from the existing business site.
Robin's design background and 25 years of design experience are transcript-backed. No free-consultation promise: copy requests details because the transcript describes a consultation fee credited toward a purchase.
Demo ratings, review counts, quotes, guarantees, installer licensing, sample quantities, project counts, lead-time and savings promises were removed from rendered public content.
All five archived projects are shown; completed photographs are not labeled fabricated before/after pairs.

Reviews currently show honest Google/Yelp profile links, not review quotes or star aggregates. Yelp/browser access did not yield verifiable review bodies. A newest-three qualifying Google/Yelp snapshot is NOT implemented or fabricated.
Google: https://www.google.com/maps?cid=10720248438238584178
Yelp: https://www.yelp.com/biz/pasadena-shades-and-shutters-montrose

## Visual review and evidence

Evidence: tmp/ui-verification/pasadena-magic-replacement and tmp/ui-verification/resend-lead-intake.
Desktop 1440 × 1000; mobile 390 × 844 with reduced motion and touch.
Screenshots were captured and inspected, including home/hero, gallery/filter, consultation contact/receipt, photo selection/error, service and legal flows, and mobile navigation. Full-page captures of scrolled forms include the sticky header at the scroll position; this is a capture artifact, not an extra header in the document.

The Magic Patterns reference was run from an ignored temporary copy, never edited in its source folder. Its malformed Tailwind configuration had the content file list nested in maxWidth; only the temporary comparison copy was repaired to show the intended styling. Public-only entry routes were used for comparison.

| Scenario | Evidence / observation | Disposition |
| --- | --- | --- |
| Reference typography | Fraunces optical axis was initially missing. Self-hosted variable opsz font now matches reference h1 width 577.75 px, size/line-height 57.6 px, height 287.96875 px at 1440 px. | Corrected and verified |
| Public home | Cream/brown/brass palette, reference grid, image framing, rounded cards and display typography retained. Phone and truthful claims substituted. | Local pass |
| Header / mobile menu | Growth/estimate links removed; shorter CTAs prevent desktop wrapping. Mobile links and gallery navigation work; no horizontal overflow. | Intentional scope delta; local pass |
| Gallery | Five real photographs load; city filter narrows Glendale to one project; alternating desktop columns stack on mobile. | Local pass |
| Services / legal | All five service routes and both legal pages render with loaded images; obsolete testimonials and guarantees removed. | Local pass |
| Consultation | Three steps retain answers on Back; labels, focusable validation, disabled sending, saved/queued receipt reviewed. Free consultation claim caught by screenshot inspection and removed; regression added. | Local pass with synthetic receipts |
| Photos | Real file selection/removal/reselection, validation, retry identity and sent/error states reviewed. Same-file reselection bug fixed by clearing the file input. | Local pass with synthetic receipts |
| Private inbox | Anonymous UI fails closed; actual local Postgres policies deny foreign/member/anonymous reads and non-status changes. | Automated pass; authenticated visual gate BLOCKED |
| SEO routing | All 50 non-home old URLs return 308 to explicit targets, preserve utm query and avoid chains; apex public canonicalization tested. Spoofed tenant markers remain preview/noindex. | Local HTTP pass |

Exact pixel equality of the entire original export is not claimed: corrected facts, removed growth/estimate navigation, honest reviews, real gallery images and integrated intake forms are deliberate content/functional differences. Final client acceptance of those changes remains required.

## Verification

- npm run lint — pass.
- npm run typecheck — pass.
- npm test — 59 passed, including real isolated PGlite RLS and outbox tests.
- npm run build — pass on Next.js 16.3.8.
- npm run test:e2e with PLAYWRIGHT_BASE_URL=http://127.0.0.1:3196 — 18 passed, two authenticated checks skipped.
- npm audit with NODE_OPTIONS=--use-system-ca — zero vulnerabilities. TLS verification was not disabled.
- Direct Playwright Chrome used because agent-browser was unavailable. Receipt/error fixture interception never sends customer email or uploads to live storage.
- No PLAYWRIGHT_TEST_USER / PLAYWRIGHT_TEST_PASS or approved synthetic mailbox magic link was available. No auth bypass was invented.
- Routing fixes: NextURL's loopback-origin normalization caused a local external rewrite and lost tenant context; raw transport URL plus skipProxyUrlNormalize corrects that. Public redirects no longer canonicalize private admin paths.
- Legal screenshot inspection caught paragraph-only extraction omitting legacy policy list clauses. List clauses are now preserved as escaped React text; privacy-retention and terms-license assertions were added and screenshots refreshed.

## Unresolved integration decisions

Gallery update later on 2026-09-30: Joseph verified the Magic Patterns before/after pairs and authorized their exact photographs. The static gallery substitution described above is superseded by the restored sliders; see design-review-pasadena-before-after.md for current implementation and verification.

The concurrent chat named “Plan lead submissions and emails” implements a different accepted intake contract. A local snapshot of its shared modules was integrated here. It was not messaged, and its primary checkout was not modified.

1. This worktree uses /send-photos with /photo-intake as 308 alias. The other plan makes the richer /photo-intake canonical.
2. Imported manager emails currently contain customer contact/project details and use submitter Reply-To. This differs from the website plan's private-inbox/reference-only notification. Intake remains disabled by default; do not enable or send until Joseph resolves the privacy contract.
3. Imported consultation validation requires phone; photo intake phone is optional. The website plan described optional phone in both flows.
4. Provider delivery-event webhooks remain unimplemented; retry/outbox status is provider acceptance, not proof of final inbox delivery.
5. Owner inbox is implemented here; the concurrent email release excluded it. Confirm release scope and merge ownership before integrating the two branches.

## Staging and launch checklist — separate authorization required

PR preparation, 2026-10-01: Joseph authorized creation of staging and a PR into that branch. Staging is based on origin/main at 997e5d5; the PR intentionally carries the prerequisite tenant-platform and manager-auth/billing checkpoint commits as well as this replacement. This authorization covers commit/push/PR only, not merge, production deployment, intake activation or remote migration. Existing launch gates above remain open; use a draft review PR. Local role review found no additional gallery or routing defect; unverified authenticated/private delivery behavior and the unresolved intake contracts remain release blockers rather than silently accepted risks.

Fresh PR validation: lint, typecheck, 59 tests and build pass. Full browser suite after preview startup: 20 passed, 2 authenticated checks skipped. An earlier run raced preview startup and failed with connection-refused errors; the complete repeat passed without a code change. Existing screenshot inspection and gallery approval remain applicable to this unchanged UI.

- Resolve the above contract differences and reconcile the concurrent branch without overwriting its work.
- Approve verified review snapshots, gallery rights, public copy, design deltas, legal privacy suppliers and retention/deletion rules.
- Apply reviewed migrations to an authorized staging project; provision owner membership and tenant sender/reply-to/manager recipients.
- Verify Supabase Storage is private, JWT/owner access uses normal Supabase auth, foreign tenant requests are denied, and authenticated desktop/mobile inbox screenshots are inspected.
- Verify the sending subdomain and SPF/DKIM in Resend, approved sender/recipients, Turnstile production hosts/action, actual durable saves, confirmation/manager notifications, retry behavior and safe failure reporting.
- Vercel cron every five minutes is prepared in vercel.json; confirm a hosting plan that supports that schedule and configure CRON_SECRET before deployment. No automation was activated in this task.
- Authorize custom-domain attachment/TLS and deployment separately. Test real apex/www/platform host routing, canonical metadata, robots, sitemap and every legacy URL after deployment.
- Submit the modern sitemap through the authorized search-console workflow and monitor redirect/404/indexing behavior; preserve the legacy manifest and rollback deployment.
