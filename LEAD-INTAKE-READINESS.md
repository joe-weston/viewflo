# Lead intake and transactional email readiness

Implemented locally on September 30, 2026. This is not deployment or production activation approval.

## Scope and behavior

Pasadena's three-step consultation and richer `/photo-intake` forms share `/api/leads/`. `/send-photos` redirects to the canonical photo form; the retired photo API returns 410 rather than silently bypassing notifications. Estimates are outside this release. Public visitors need no login.

Validated submissions are saved to Supabase with tenant identity and consent. Photo submissions require email and 1–3 JPG/PNG files, each at most 1 MB; phone is optional. Consultation requires phone. Images are decoded, resized and normalized to JPEG with metadata removed, then stored in a private bucket. The database transaction saves the lead, photo references and one email job per recipient. A stable request identity prevents repeated saves and duplicate jobs.

The submitter receives a receipt, not an appointment or final quote. Each configured manager receives a separate actionable summary with visitor reply-to, reference, submitted details and photo count. Photos are not attached or publicly linked. The integrated candidate also retains the owner-only tenant inbox from PR #2, including cookie-bound private-photo review; notification emails complement the inbox. HTML and plaintext templates are generated with React Email.

Database-save failures retain the form and offer a retry. Email failure after persistence still shows a saved receipt with confirmation queued. An authenticated cron endpoint retries the durable outbox independently of the new-intake enable switch. No emails are sent for historical submissions automatically.

## Architecture and security review

Tenant identity comes from approved custom-domain routing or the same-origin platform tenant path, never a visitor-supplied tenant ID. Origin, referer, configured hostnames and Turnstile action/hostname are checked server-side. Multipart size, field lengths, enum values and actual image bytes are validated. A honeypot and per-tenant/email hourly cap supplement Turnstile.

All new tables enable RLS. The intake migration denies anonymous/authenticated direct access; the later inbox migration grants only tenant owners scoped lead/photo reads, status updates and private object reads. Outbox/settings and intake RPCs remain server-only. Server service-role credentials and Resend keys never reach browser code. Photo foreign keys and immutable storage paths include tenant and lead identity. Secrets belong in ignored local configuration and deployment settings, not this document or synced files. Logs expose only references and categorized failures, not visitor content or provider response bodies.

Email jobs snapshot sender, recipients and content. Preserve template version 1 when later changing templates: Resend requires identical content for retries using the same key. Claims use row locking, expiring leases and fresh claim tokens; stale workers cannot finalize newer claims. Each job uses its own stable Resend idempotency key, so manager failures do not resend successful confirmations.

Retries are scheduled relative to the first attempt: 5 minutes, 30 minutes, 2 hours, 12 hours, then 24 hours. Resend retains idempotency keys for 24 hours; the worker conservatively stops ambiguous jobs after 23 hours and marks them `reconciliation_required`. The nominal 24-hour retry therefore requires manual reconciliation instead of risking duplicate mail. Expired final-attempt leases also require reconciliation. Delivery is provider acceptance, not an inbox-delivery guarantee; bounce webhooks and a manager UI are future work.

## Activation checklist — requires separately authorized staging/cloud work

1. Verify the intended Supabase project and existing tenant schema. Review and apply `supabase/migrations/202609300001_lead_intake.sql` through the approved migration workflow, first in staging. Do not rerun it against an already migrated database.
2. Confirm the `vf-lead-photos` bucket is private and has no anonymous object policies. Inventory existing `pasadena_photo_requests` and objects; retain/reconcile legacy records without retroactive confirmations. Review uncertain/orphan uploads against committed photo references before any approved cleanup.
3. Approve Pasadena's dedicated sending subdomain, sender display name/address, business reply-to and actual manager recipients. Verify the domain and required DNS in Resend; stage with approved test inboxes only. Do not use example addresses for production.
4. Provision the Pasadena row in `vf_tenant_email_settings` with its real tenant UUID, approved addresses and `enabled=true`. Settings are per tenant; up to five distinct manager recipients are supported. Future tenants need their own approved routing and content before activation.
5. Configure server-only `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (or existing public URL fallback), `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY` and `CRON_SECRET`; configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Set comma-separated `LEAD_INTAKE_HOSTNAMES` to the exact intended staging/production hostnames. Keep `LEAD_INTAKE_ENABLED=false` until staging passes.
6. Verify the hosting plan supports the five-minute schedule in `vercel.json`. Vercel Hobby does not support this frequency. Do not purchase/upgrade implicitly; obtain an approved supported schedule/plan before release. Ensure cron requests carry Vercel's bearer secret and retry routes are never cached.
7. Run real staging submissions for both forms. Verify one lead, private normalized photos, one confirmation, all intended manager messages, correct reply-to and receipt reference. Verify actual Supabase Storage/RPC permissions and independently concurrent duplicate submissions; local database emulation does not replace these checks.
8. Exercise email outage, database outage, partial manager failure, cron recovery and retry idempotency in staging with approved recipients. Confirm a saved lead survives a delivery failure. Review Resend logs before handling aged ambiguous jobs; never reset failed jobs blindly beyond the idempotency window.
9. Approve privacy copy, consent and retention/deletion policy for contact information and photos, including Supabase and Resend as suppliers. Confirm staff handling of private photos and response expectations.
10. Complete launch review, then separately authorize deployment and intake activation. Disabling new intake does not stop retries for already saved jobs; revoke delivery configuration only when intentionally pausing email processing.

## Operational checks

Authorized database operators should inspect pending/sending/failed outbox counts and oldest creation/first-attempt times, failed error categories, expiring leases, and lead-to-photo references. Worker batches are bounded to six jobs per invocation; assess backlog and provider rate limits before scaling traffic. A failed confirmation never deletes the lead. Changes to manager settings affect new leads, not saved jobs.

## Local verification

See `ui-verification/design-review-resend-lead-intake.md` for final automated and visual results. Unit tests use synthetic recipients and stubbed provider calls; database tests execute the actual migration in isolated PGlite. Public browser tests stub the success/error API and Turnstile while exercising the real forms. No live Supabase migration, Resend send, domain change or deployment was performed. Real cloud delivery/storage, cron execution and authenticated manager verification remain staging gates.
