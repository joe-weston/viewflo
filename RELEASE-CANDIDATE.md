# Pasadena release candidate — October 1, 2026

Verdict: **draft candidate; not review_ready, production-ready, or invoice-authorized.** Target review is October 2; requested public-launch deadline is October 2 at 8:50 PM Eastern. Technical implementation is assembled, but the evidence and decisions below block release. Joseph owns final release/commercial approval.

## One integration path

- Candidate `codex/pasadena-release-candidate` starts at PR #2 `e77f7ec`, which already contains billing commits `e2415f6` and `5874ad9`. It preserves the approved Magic Patterns design, five before/after pairs, approved contact content, exact custom-domain allowlist, and all fifty legacy non-home URL redirects.
- The uncommitted `codex/resend-lead-intake` checkout remains untouched. Candidate copies its newer delivery-readiness and form focus/retry fixes. Raw legacy source images were not copied from dirty work or modified.
- `/consultation/` and canonical `/photo-intake/` share `/api/leads/`. `/send-photos/` permanently redirects to `/photo-intake/`; internal calls use the canonical route. `/api/photo-requests/` returns 410.
- PR #1 is a separate repair for the old mirror. Its `/api/contact/`, legacy embed replacement, `contact_submissions` migration and Turnstile lifecycle are superseded in this candidate by `/contact-us.php` → consultation, durable lead/outbox storage and the shared Turnstile lifecycle. Do not merge its old page renderer/CSS over the modern site or apply its unused contact migration as a dependency. PR #1 and its worktree remain recoverable; no existing PR was closed or rewritten. If the old site needs a separate interim repair, review PR #1 independently.
- Owner inbox remains at the tenant admin `/leads` path. Cookie-bound Supabase RLS protects details, status changes and private photo downloads. The inbox complements the approved manager notifications: per-manager visitor summary/reply-to/photo count, no attachments or public links; separate visitor confirmation. Email acceptance is not inbox delivery. Never call fixture receipts delivery evidence.

## Billing architecture

`202610020001_billing_modes.sql` leaves existing mappings in test mode and adds separately approved live rows. Customer/subscription mappings, checkout attempts and webhook receipts are scoped by mode (and account for provider IDs/receipts). The old unscoped webhook writer is removed. RLS and server-only writes remain; legal assent stays tied to user/tenant/document rather than payment mode.

`STRIPE_MODE` defaults to test. Legacy Stripe variable names work only as test fallbacks. Live requires `STRIPE_MODE=live`, separately approved `STRIPE_LIVE_BILLING_ENABLED=true`, and independent `STRIPE_LIVE_SECRET_KEY`, `STRIPE_LIVE_EXPECTED_ACCOUNT_ID`, `STRIPE_LIVE_WEBHOOK_SECRET`, `STRIPE_LIVE_PORTAL_CONFIGURATION_ID`. These are names only; no live configuration was written.

Checkout, portal, webhook and history verify account, tenant/customer ownership and mode; subscription handling validates one configured USD169 monthly hosting price. Live objects cannot enter test history or vice versa. Customer provisioning uses a persisted attempt and stops ambiguous retries after 23 hours; checkout attempts stop before their replay payload can expire. Operators must reconcile ambiguous attempts against provider records instead of rotating keys blindly. A mode change never reuses another mode's customer/session.

`collection_method` has no implicit approval. Checkout is available only for `charge_automatically`; a `send_invoice` decision must use the separately approved operator process below. Invoice subscriptions are readable, with next renewal, invoice due date and payment status kept distinct. Returning from Stripe and subscription status `active` do not prove an invoice was paid. The separate contingent USD4,000 services workflow does not create invoices or charges.

## Validation and role disposition

Final command results and screenshot review are in `ui-verification/design-review-pasadena-release-candidate.md`. Role analysis is in `ui-verification/role-review-pasadena-release-candidate.md`. Those analyses do not substitute for unresolved authenticated/cloud checks or Joseph's review.

| Local command/check                             | Final result                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Clean `npm ci`                                  | pass; Windows Node system CA resolved initial certificate trust failure                           |
| Changed-code Prettier check                     | pass                                                                                              |
| `npm run lint`, `npm run typecheck`             | pass                                                                                              |
| `npm test`                                      | 65 passed, zero skipped                                                                           |
| `npm run build`                                 | pass                                                                                              |
| `npm run test:e2e`                              | 22 passed, 2 skipped; authenticated gate blocked                                                  |
| `npm audit`                                     | zero vulnerabilities                                                                              |
| Git whitespace / source credential-pattern scan | pass, no matching credential patterns; this is not a cloud-secret or automated SAST certification |
| Desktop/mobile screenshot inspection            | inspected local states pass; authenticated states blocked                                         |

Existing Vercel project was confirmed through the connected app: `prj_u0ZRjzgfWqhyFCiALcZCz8xRvRtI`, team `team_PANy4pL1BSugnDeJchsVISio`. Before candidate push, PR #2 preview was READY at `viewflo-1e6avmgw0-joe-westons-projects.vercel.app`; billing preview was READY at `viewflo-9tl1php9e-joe-westons-projects.vercel.app`. Production remains `997e5d5`, deployment `dpl_EDSkptr9griW7XLY7grtpd3vF3gs`. READY proves build status, not live workflow readiness.

## Exact blocking inputs and evidence

| Gate                        | Required input/evidence                                                                                                                                                                          | Current result                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real manager authentication | Canonical test credentials, fresh approved test-mailbox magic link, provisioned owner/billing and second-tenant/member users, approved redirects/templates                                       | Credentials/link absent; authenticated browser journey skipped                                                                                         |
| Supabase target             | Confirm intended staging and production project references and migration inventories; approve staging writes                                                                                     | Existing ignored config can reach REST but tenant/billing/leads/outbox/email-settings table probes return 404; no hosted persistence/RLS/storage proof |
| Notification activation     | Approved Resend account/domain, sender, business reply-to, manager recipients, synthetic recipient allowance, Turnstile hostname/key, server secrets                                             | Resend and Turnstile secret absent locally; no email or DNS action                                                                                     |
| Retry execution             | Confirm current Vercel plan supports `*/5 * * * *`, production cron secret and backlog monitoring owner                                                                                          | Plan/frequency and real cron execution unverified; no purchase/upgrade authorized                                                                      |
| Billing provider            | Actual legal provider and Stripe account; correct live account/price/customer/portal/webhook configuration, mode metadata and authorized recipient                                               | Stripe credentials absent; legal identity and account not verified                                                                                     |
| Hosting order               | Robin invoice/admin recipient; October 2 start and exact time/timezone; send invoice vs automatic charge; due days, taxes, cutoff/channel, service-end/refund/proration/failed-payment treatment | USD169 monthly advance hosting and cancel before next invoice recorded; remaining details not confirmed                                                |
| Legal                       | Final provider/customer identities and contacts; approved Terms and Privacy, correct published digests and real acceptance; retention/deletion and suppliers                                     | September 6 company drafts remain drafts, not effective legal versions                                                                                 |
| Public replacement          | Fourteen full VERIFIED Vercel baseline days with exact windows/timezone/visitor semantics and client acceptance                                                                                  | Local records retain partial/old snapshots and unresolved certification; elapsed time and READY deployments do not satisfy gate                        |
| Production approval         | Resolve every mandatory gate, approve identified commit/config/migrations/domain handling/launch and named rollback owner                                                                        | No merge, production deployment/config write/migration/domain change authorized                                                                        |

GA4 is deferred/nonblocking. No future CMS/CRM, Marketplace, growth automation or worker schedule is introduced. Contingent services never become billable at signature, launch, baseline completion or elapsed time.

## Activation runbook — prepared, not executed

1. Joseph reviews the candidate diff, role/design reviews, source reconciliation, and blockers. Keep the PR draft until mandatory evidence passes. Review PR #2 as the included design; do not merge both modern and mirror repair implementations independently.
2. Identify the approved Supabase target and existing migration history. Use the approved Supabase CLI from this canonical mounted repository, with the target connection supplied privately. Preview pending schema with `supabase db push --db-url "$APPROVED_DB_URL" --dry-run`. After explicit target/schema approval, apply with `supabase db push --db-url "$APPROVED_DB_URL"`. Do not print the connection string, run against an unconfirmed project, or rerun existing migrations. The applicable files are the current billing/legal migrations, lead migration, inbox migration, and new billing-mode migration. The legacy photo migration remains historical schema; PR #1's contact migration is not a candidate dependency.
3. Provision approved tenant membership and legal publication/acceptance, verify private `vf-lead-photos` bucket, apply owner policies, and configure approved email settings using the real tenant UUID. Confirm test/live rows and customer metadata independently. Existing test customer records missing `metadata.tenant_id` require explicit reconciliation rather than silent adoption.
4. Stage with `LEAD_INTAKE_ENABLED=false`, test Stripe mode, exact approved hostnames and synthetic recipients. Complete real visitor consultation/photo save, private photo access, same-content duplicate/concurrent retry, database outage, Resend partial failure and cron recovery. Inspect database, Storage and recipient/provider evidence; no mock can pass this gate. Complete authenticated owner/billing/member/foreign-tenant/expired-session journeys and screenshot review.
5. In Stripe test mode, exercise checkout, invoice collection if selected, portal return, signed webhook duplicate/reorder, foreign customer/cursor and test/live mismatch. Use independent credentials/account IDs/price/customer mappings for live read-only confirmation after authority exists. No live customer, subscription, invoice or charge has been created by this task.
6. Reconcile fourteen verified full baseline days and final client acceptance. Confirm Vercel plan/frequency and legal/commercial facts. Joseph separately approves the exact merge, deployment, migrations and activation settings. Commands for the approved PR are `gh pr checks <candidate-number>` and, only after merge approval, `gh pr merge <candidate-number> --merge` from WSL. A branch merge that triggers hosting is itself a release action. No custom staging hostname was invented.
7. After the approved deployment, verify both Pasadena domains, canonical redirects/static assets, public request persistence, private owner access, isolated billing, outbox retries and issued-invoice history. Enable new intake only after this checklist passes. Record production commit/deployment/schema inventory and the exact activation time.

## October 2 hosting invoice procedure — requires commercial and send approval

Confirm the contracting provider/account, Robin's approved billing email, actual tenant/customer mapping, accepted current terms/privacy, approved start instant, tax handling, `collection_method` and due days. Reuse a verified customer; creating a customer is a separate authorized live action. Use a single live USD169/month licensed recurring price; never append the USD4,000 fee.

If **send invoice** is approved, Checkout stays disabled for this row. At the confirmed start instant, the approved operator uses the Stripe SDK/account with this explicit request (template only):

```ts
await stripe.subscriptions.create(
  {
    customer: APPROVED_LIVE_CUSTOMER_ID,
    items: [{ price: APPROVED_LIVE_HOSTING_PRICE_ID, quantity: 1 }],
    collection_method: "send_invoice",
    days_until_due: APPROVED_DUE_DAYS,
    metadata: { tenant_id: APPROVED_TENANT_UUID },
  },
  { idempotencyKey: APPROVED_PERSISTED_ATTEMPT_KEY },
);
```

Before that mutating request, retrieve the account/customer/price and verify live mode, tenant metadata, amount/currency/month/quantity, existing subscriptions, schedules and open invoices. Persist the approved request identity and unchanged payload; reconcile on uncertainty or after provider idempotency expiry. Do not blindly create a replacement subscription. The creation/send authorization must include Stripe's automatic initial and recurring invoice emails. `send_invoice` can set subscription status active before payment. Review the exact issued invoice and recipient in Stripe, and use `stripe.invoices.sendInvoice(APPROVED_INVOICE_ID)` only if a manual send is needed and separately authorized; avoid a duplicate email after automatic delivery. Finalization is also a live action requiring approval. If a future start is needed, review a subscription schedule rather than guessing a trial/backdate or creating today's invoice. [Stripe subscription API](https://docs.stripe.com/api/subscriptions/create).

If **automatic charge** is approved instead, set that collection method on the separately approved live row and verify customer payment authorization through the real gated Checkout journey. Do not treat a request for an invoice as consent to automatic charging. Portal cancellation options must match the confirmed before-next-invoice cutoff and service-end policy; no cancellation configuration was changed.

## Rollback and monitoring

Before launch, record production deployment `dpl_EDSkptr9griW7XLY7grtpd3vF3gs` / `997e5d5` as the verified current rollback candidate and confirm its continued availability. After approval, a release rollback uses `vercel rollback <verified-deployment-url> --scope joe-westons-projects` or the Vercel dashboard against the confirmed project; verify both public domains afterward. Do not relink or change domains.

Disable `LEAD_INTAKE_ENABLED` to stop new intake while preserving saved requests. Existing outbox retries intentionally continue; pausing all email delivery is a separate explicit operational decision. Set `STRIPE_LIVE_BILLING_ENABLED=false` to deny new application billing calls; this does **not** cancel Stripe subscriptions or prevent provider renewals. Handle any live financial correction through separately approved provider actions.

Retain lead/photo/outbox, legal assent and mode mappings. Never roll back by dropping tables with customer data. Rolling the application to the old mirror preserves the added schema. Rolling to older billing code would be incompatible with mode-specific primary keys and the changed webhook RPC: stop billing/webhook processing and use a reviewed forward repair instead of running an old writer. Joseph owns release/rollback decisions; a technical operator must reconcile pending email and Stripe attempts and monitor provider failures, oldest outbox age, private access, HTTP errors and invoice status.
