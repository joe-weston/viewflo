# Pasadena staging corrections — October 2, 2026

Verdict: **local implementation verified; hosted release blocked**. This is not a completed photo-delivery release. The operator authorized committing and pushing this candidate to staging. Hosted migrations, account invitations, DNS changes, production activation and real emails remain unperformed. Staging publication does not satisfy the hosted intake gates below.

## Checkout and scope

- Branch: `codex/fix/pasadena-staging-corrections`, based on staging `49f86a88e22b8679999b54cde9338fc7b02767cf`.
- Worktree: `repos/.worktrees/viewflo/pasadena-staging-corrections` under the canonical Windows Viewflo project. The dirty primary checkout was preserved.
- Approved scope: neutral copy, budget removal, genuine static reviews, old GA4 ID, meaningful redirects/aliases, private photo intake and independent environment-scoped email delivery.
- Excluded: marketplace, live review integration, production release, DNS and paid upgrades.

## Implemented

Public pricing explanations and the service quote block are removed. Forms no longer request, validate as required, summarize, store new answers to, or email budget information. Legacy payloads can still contain budget; the handler and new SQL strip it. Historical stored answers remain unchanged and are hidden in admin presentation.

The review snapshot is dated October 2, 2026: Google 5.0/27 and Yelp 5.0/11 recommended reviews, kept separate. The six requested authors have brief verbatim excerpts, ratings, source date labels and profile links. Google relative dates are preserved. The direct Google write-review URL from the mirror appears beside the snapshot and in the footer. Source profiles were inspected sorted newest first; no owner-authored or placeholder reviews are included.

GA4 `G-XHKPP6CVFR` mounts only in the public Pasadena renderer, only with both `VERCEL_ENV=production` and `PASADENA_ANALYTICS_ENABLED=true`. Staging defaults to no script or collection. Navigation and telephone clicks, and successful consultation/photo receipts emit individual events. Application events contain no customer fields, query strings, fragments or private URLs. The production configuration was exercised locally with the Google script intercepted; this proves application event wiring, not the remote GA property settings. Before production activation, verify the actual library under collection interception and disable enhanced automatic page/history/form measurement at the GA property so it cannot add events outside the application’s explicit scope.

All 50 non-home redirects remain permanent and preserve marketing query parameters. Targets now include specific city/product/project content, canonical section anchors and a choosing-treatments FAQ that opens when addressed. Old fragment aliases wrap their corresponding sections and retain descendant content. The preview sitemap redirect reaches root `/sitemap.xml`. Unknown routes remain 404. All five approved before/after pairs remain; eager loading fixes a blank fourth desktop comparison observed during screenshot inspection.

Lead code uses explicit staging/production identity, fails closed without schema readiness, resolves confirmed tenant owner emails through membership plus Supabase Auth, uses an approved absolute admin origin, and calls scoped create/claim/finish RPCs. Admin list/detail/status/photo routes filter the current environment. Current schema roles are owner/billing/member: notices go only to owners who can access the inbox, not ordinary or billing members.

Visitor confirmations include submitted contact/project fields, notes, photo count, time and reference. Manager notices include contact/project summary and the private authenticated detail URL. No attachments or public download links are produced. Staging routing is enforced in both the prepared database RPC and the email renderer to `jocduplbot@gmail.com`; subject identifies audience and request/test identity. Production recipients are tested locally without sending. Sender defaults to Pasadena Shades & Shutters `<notifications@pasadenashadesandshutters.com>`; owner reply-to and submitter reply-to remain audience-specific. Delivery jobs keep stable outbox IDs and independent failure/retry state.

## Actual database inventory

Configured project: `bobftquegngpzhpkfral`. Initial PowerShell checks used an insufficient environment parser; native Node parsing plus the Windows system CA store authenticated successfully. REST reported the expected tables absent. Existing WSL management authentication then provided authoritative read-only inventory:

| Inventory | Result |
| --- | --- |
| Recorded migrations | 0 |
| Public tables | 0 |
| Supabase Auth users | 0 |
| Storage buckets | 0 |

No hosted writes followed this inspection. The new additive `202610020002_lead_environment.sql` is prepared and tested, **not applied**. The configured project needs the existing tenant/intake/inbox foundations installed first. The new migration adds environment columns and constraints, creates scoped RPCs, excludes unassigned historical jobs from claims, preserves historical records and revokes the old service-role unscoped RPC execution.

Existing records in a previously populated environment retain null environment rather than being guessed as production or staging; classify them from evidence before making them visible or eligible for any delivery. Do not replay historical emails automatically.

## Configuration and rollout gates

1. Review and install the repository's existing foundation migrations and the new additive migration on the explicitly targeted environment. Preserve current records/storage if inventory changes before installation. Reinspect immediately before writes.
2. Provision `robinaalvarez@gmail.com` as the Pasadena owner through Supabase Auth and `vf_memberships`, with normal verification/sign-in. No invitation, confirmation bypass or membership write has been performed. Configure the tenant sender/reply settings; the old manager-recipient setting is not used as authorization by the scoped pipeline.
3. Supply Turnstile site/secret keys, Resend API key, sending-domain verification and canonical `PLAYWRIGHT_TEST_USER/PASS`. These are absent from the local project configuration. Hosted environment access was not available to recover them. Store secrets only in ignored/private configuration, never this document.
4. Configure `LEAD_ENVIRONMENT=staging`, the approved staging `LEAD_PUBLIC_ORIGIN` and host allow-list. Keep `LEAD_SCOPED_SCHEMA_READY=false` and intake disabled until schema/settings and recipient checks succeed. Production requires matching `VERCEL_ENV=production` and `LEAD_ENVIRONMENT=production`; a preview cannot select production delivery.
5. Verify the sending domain before any real mail. Run hosted Turnstile uploads, inspect saved rows/normalized private photos, sign in through canonical Supabase Auth, verify both messages in the isolated shared test mailbox, and follow the manager URL to the same submission.
6. Run hosted duplicate/interruption/database-outage/partial-email/retry scenarios and anonymous/member/foreign-tenant access checks. Local fixtures and PGlite results do not satisfy these hosted gates.
7. Vercel team plan inspection using existing CLI authentication returned HTTP 403; the connector project inspection also failed argument validation. The five-minute cron was removed from this prepared release pending verified plan support. Retry API/outbox remain, but no scheduled retry is configured. Do not launch intake without an approved, verified retry mechanism and do not purchase an upgrade.
8. Staging deployment/release configuration remains pending. Production deployment, DNS and production activation need their separate explicit release actions.

## Validation and role evidence

These role perspectives were performed in this task, not represented as independent agents: coordinator/planner/product/architect/coder/tester/UI QA/security/code quality/reviewer/production validator.

- Planner/product: the supplied plan is the acceptance contract. Public and intake success/error/retry journeys are in scope; integration and production activation are non-goals. Product outcome is ready for local implementation; hosted readiness remains blocked.
- Architect: retain the shared endpoint, consent/Turnstile, normalization, private bucket and transactional outbox. Environment-specific RPCs and cross-table constraints prevent mixed delivery. Tenant owners are resolved from authoritative membership/Auth rather than visitor input or a global address. Historical rows are preserved. Rollback disables intake/analytics first; retain data/outbox instead of dropping tables or replaying notices.
- Coder: changed public components/data, redirect map, lead validation/renderer/store/admin routes, `.env.example`, prepared migration and focused tests. No dependency changes or source-mirror modifications.
- Tester: `npm run lint`, `npm run typecheck`, `npm test` (**72 passed**) and `npm run build` passed. Existing local database/RLS tests cover owner/member/foreign/anonymous boundaries. The new actual migration test covers preserved budget/history, mismatched environment identity, stale/unauthorized recipients, separate audiences, staging rerouting, independent failure/recovery and legacy claim denial.
- Public Playwright: **20 passed**, desktop 1440×1000/mobile 390×844; all 50 redirect destinations checked for actual visible content, scroll clearance and query preservation; aliases, unknown 404, form validation, photo limits/remove/retry, receipt states, navigation and keyboard/drag/touch gallery comparisons.
- Analytics Playwright: **2 passed**, production-configured local preview with Google requests intercepted; one page/phone/consultation/photo event, sanitized URL and no auth-page tag. Staging checks prove no analytics script requests by default.
- UI QA: screenshots inspected; see `ui-verification/design-review-pasadena-staging-corrections.md`.
- Security/reviewer: no unresolved findings in the verified public changes. Hosted schema installation, provisioning, credentials, actual photo authorization, domain delivery, mailbox receipts and retry support remain major release blockers. No completion or production-ready verdict is issued.
- Production validator: **blocked/partial**. The branch is a reviewable implementation, not an activated staging release. Keep all intake and collection gates disabled until the above evidence exists.

The [Supabase management API](https://supabase.com/docs/reference/api/introduction) was used for read-only inventory. Authentication material was referenced privately and never copied into repository or synced files.

