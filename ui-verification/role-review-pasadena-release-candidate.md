# Pasadena candidate role analyses — October 1, 2026

These are explicit role perspectives performed within this bounded integration chat. They are not independent human approval, a conductor action or client acceptance. Joseph's review and every blocked mandatory check remain required. No automated worker/queue was activated.

## Coordinator / planner

Objective: one reviewable candidate from PR #2, PR #1, local lead-intake work and tenant billing. Authorization covers implementation, validation, commits/push and draft PR; excludes merge, production deployment/config/migrations, domain actions, live Stripe objects/charges/emails and spending. Existing checkout `codex/resend-lead-intake` and dirty work remain untouched; candidate is isolated in a Windows-root worktree executed through its canonical WSL mount for GitHub operations.

Scope: public routing/forms, owner inbox/private-photo access, transactional outbox/retry, tenant/legal billing reads/checkout/portal/webhook, mode migration and release brief. Acceptance: exact approved public design/contacts/gallery/legacy routes, durable private intake with recipient retry behavior, Supabase auth/RLS, explicit mode isolation and separated hosting/services; honest gates. Non-goals: broad CMS/CRM/Marketplace/GA4, future growth automation and launch. Regression surfaces: legacy redirect chains, custom-domain tenant boundary, retry identities, mode/customer/account mapping and the old webhook RPC. Required commands: clean install, changed-code formatting, lint, typecheck, tests, build, audit/secret scan, browser scenarios and screenshot inspection. Recovery is documented in RELEASE-CANDIDATE.md; added customer data must be preserved.

## Product manager

Journeys: visitors request a consultation or upload photos with explicit consent and retry-safe receipt; owners review private inquiries and photos; authorized owner/billing members review current documents, isolated provider billing and issued invoices. Confirmation is not an appointment/quote; provider subscription status is not paid-invoice evidence. Canonical photo page and legacy redirect resolve competing flows. Manager summary emails complement the inbox and remain narrowly scoped. Existing USD169 prepaid/cancel-before-invoice direction and contingent USD4000 separation are preserved. Final parties, recipient, start, collection, due date, cancellation semantics, privacy and fourteen-day certification remain decisions/evidence. Verdict: needs clarification for activation; implementation scope is explicit.

## Architect / coder handoff

Existing pattern: Next server components/actions, Supabase SSR user identity and membership/RLS, server-only service-role writes, private normalized photo storage and durable per-recipient outbox, Stripe SDK reads and transactional webhook receipt. Reuse these rather than adding an alternate auth/invoice system.

Changes: canonical `/photo-intake` with retained `/send-photos` redirect and internal link updates; copied lead delivery readiness/focus fixes; `billing-mode.ts` verifies explicit mode/key/account/customer/subscription price boundaries; `billing-webhook.ts` verifies signed mode/account before provider reads; new mode-specific migration plus customer provisioning attempts; checkout rejects unapproved invoice collection and ambiguous sessions, history supports live and invoice renewals, portal verifies configuration mode, UI states actual mode. No actual invoice creator or client send is exposed by the candidate.

Migration: old rows/attempts default to test; live rows require separate approval. Existing test mappings missing tenant customer metadata need reconciliation. Provider event receipts now include account/mode; legacy receipts are retained as `legacy-test`. The old unscoped subscription writer is removed. Rollback to the old mirror preserves new data; older billing code needs a reviewed compatible forward repair or disabled processing. Dependency manifests/lockfile use PR #2 versions without integration upgrades.

## Tester

Final validation is recorded in RELEASE-CANDIDATE.md/PR body. Tests include actual billing/legal and mode migrations in PGlite, RLS owner/foreign/member private lead/photo behavior, persisted customer attempt uniqueness/retry identity, event receipt mode/account isolation/rollback, signed Stripe webhook tamper/stale/foreign-mode/account rejection, live/test history boundaries, contingent eligibility, intake normalization/privacy/outage and per-recipient failure. Provider stubs/local emulation prove code/database behavior only. Canonical credential/link absence blocks real manager journeys; real Supabase target table probes returned 404. Hosted Resend/Turnstile/Stripe and cron tests are blocked. No claim of live integration success.

## Security reviewer

Surfaces: `lib/billing.ts`, mode/data/signature helpers, Stripe webhook, lead store/intake/retry/email, owner inbox/detail/photo/status routes, tenant request/routing/auth/document policies, actual migrations/tests. Controls: authenticated user/membership on each action; mode-specific server-controlled customer/price IDs; expected provider account read before operations; tenant metadata and price/mode checks on subscription records; signed raw-body webhook with foreign account rejection; private cookie/RLS photo reads, no signed/public object links; anonymous denial, owner-only status updates; independently claimed/idempotent recipient email jobs and no raw provider/customer logging.

Corrected review findings: customer creation formerly reused a tenant key indefinitely after an ambiguous mapping save; durable attempts now halt after 23 hours. Open subscription checkout ambiguity now fails for multiple sessions. Invalid/future attempt timestamps fail closed. Provider objects are validated before storing session/customer mappings. Tests exercise signature boundaries and actual mode/RLS transactions. No unresolved high-risk code finding identified in this local review. **Gate blocked** by unverified real identity/permissions, target migration history, provider ownership/configuration and cloud storage/retry behavior; local tests cannot approve those boundaries.

Secret handling: main ignored `.env` referenced directly for read-only probes; no secret was copied to synced files or candidate artifacts. Only variable presence and HTTP status printed. No magic link available or printed. Candidate configuration contains names only. Git/source scanning is recorded in final checks.

## Code quality / React review

Actual candidate diff reviewed against parent PR #2 and owning `main`. No legacy-source rewrite, alternate stack, provider mock route or unrelated redesign was introduced. Mode validation is centralized and reused in all four billing surfaces, reducing contradictory test-only checks. React components retain stable hook order, dependency/cleanup rules for widget/object URLs/XHR, server auth checks and minimal browser props. Focus behavior uses refs/effects on state changes; tests inspect preserved form answers and focus. Specialist testing remains bounded rather than adding broad feature scope.

## UI QA / reviewer / production validator

UI QA: local inspected states pass; full role gate is blocked by absent authenticated screenshots. Evidence/scenarios and exact disposition are in design-review-pasadena-release-candidate.md. Reviewer: no further major local code finding after corrections, but mandatory authentication/cloud/baseline/legal evidence remains unresolved and blocks handoff as review_ready. Independent review/client approval has not been obtained.

Production validator verdict: **blocked**. No merge/deploy/config/migration/domain/Stripe/customer/invoice/send occurred. Before promotion, resolve all exact inputs in RELEASE-CANDIDATE.md, obtain real provider/RLS/auth/e2e/screenshots, certify baseline and approvals, and confirm migration/rollback/monitoring ownership. Draft PR permits inspection without claiming the gate passed.

| Role                  | Disposition                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| Coordinator / planner | pass for bounded scope/authority                                                |
| Product manager       | blocked for activation decisions                                                |
| Architect             | pass for local design; target inventory blocked                                 |
| Coder                 | pass for implemented candidate; cloud configuration not represented as complete |
| Tester                | blocked for mandatory authenticated/cloud checks; local checks pass             |
| Code quality          | pass for local diff                                                             |
| UI QA                 | blocked for authenticated states; inspected local states pass                   |
| Security reviewer     | blocked for actual cloud auth/data/provider verification                        |
| Reviewer              | blocked for missing mandatory specialist evidence                               |
| Production validator  | blocked                                                                         |
