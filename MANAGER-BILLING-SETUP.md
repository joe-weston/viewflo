Current candidate addendum (October 1, 2026): RELEASE-CANDIDATE.md supersedes the historical test-only restriction below with explicit, separately gated test/live mappings. No live action or legal activation is authorized. The original configuration and blocked checks below remain historical evidence.

# Tenant manager billing setup

Implementation: manager email magic link, tenant-authorized billing, customer-scoped Stripe reads and hosted payment-method management. Pasadena's public domains use `/admin/billing/`; the configured platform uses `/pasadena-shades-and-shutters/admin/billing/`. No production configuration, customer account provisioning, email send, migration or deployment is performed by this implementation task.

## Approved environment setup

1. Verify the intended nonproduction Supabase target and review/apply the existing migrations through an authorized task. Do not copy credentials from another project. Securely configure the existing Supabase variable names in ignored local configuration.
2. Verify the platform origin and set `VIEWFLOW_APP_URL` to that exact HTTPS origin, with no path. The code recognizes the two approved Pasadena domains and loopback previews; other platform hosts require this configured origin. Hostnames never grant membership.
3. Configure Supabase redirect allow-list entries for the exact callback path `/auth/callback/` on the platform origin, each Pasadena domain and the approved loopback test origin. Callback redirects preserve the request origin and always return to that tenant's Billing page; arbitrary `next` or external destinations are ignored. Cookies are scoped to the originating domain, so switching between the platform, apex and www domains may require signing in again.
4. Update the Supabase **Magic Link** email template to use the application callback instead of the implicit confirmation URL:

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Sign in to your billing workspace</a>
```

The application supplies `.RedirectTo` with its validated origin and `tenant` query parameter. The server verifies the token hash using `type: email`, then checks fresh tenant billing membership. This supports opening the email on another browser/device without a local PKCE verifier. Links are single-use; expired/replayed links prompt a new request. Verify approved SMTP/delivery and provider rate limits. The local resend cooldown is usability protection, not a substitute for provider rate limiting.

5. Through authorized operator provisioning, create or identify the designated manager's Supabase user and assign `vf_memberships` for the intended tenant with `role = billing` (or an existing authorized owner). Do not hardcode the email, grant membership from a URL or create accounts through the sign-in form. The application uses `shouldCreateUser: false`. Removing membership revokes portal authorization even if an authentication session remains.
6. Configure the approved Stripe TEST account, provider identity, customer mapping, reviewed plan/start/cancellation policies, webhook and Customer Portal configuration using existing readiness instructions. Enable portal payment-method management and reviewed invoice/subscription capabilities. No new Stripe account or customer charge is created during setup documentation. Checkout remains separately gated by current approved agreement acceptance.

## Verification

Securely load canonical `PLAYWRIGHT_TEST_USER` / `PLAYWRIGHT_TEST_PASS` for an approved synthetic account. For the passwordless browser journey also supply a fresh `PLAYWRIGHT_MAGIC_LINK_URL` from the approved test mailbox, returning to the loopback `/auth/callback/` with tenant and token-hash parameters. Treat the entire URL as a credential: do not print it, commit it, paste it into documentation, or include it in traces.

The authenticated Playwright test consumes the link once on desktop, then captures mobile in the same session. It does not send email or provision accounts. Browser traces are disabled for portal tests. Password authentication alone cannot verify the magic-link journey. Additional real tests must cover request/delivery, revoked and second-tenant users, document acceptance, actual RLS and Stripe portal return/payment outcomes; isolated unit/component fixtures cannot establish these integrations.

Run npm scripts lint, typecheck, test, build and test:e2e against the built preview on 3188. `tests/e2e/billing-components.spec.ts` renders the actual Billing component with synthetic data directly in a browser document; it creates no public fixture route and bypasses no application authentication. Fixture screenshots are visibly labeled and provide design evidence only.

## Payment and release boundaries

Hosting remains USD169 monthly prepaid; cancellation is before the next invoice, with no 30-day notice. The precise cancellation cutoff is not inferred from Stripe period end or payment retry. Subscription renewal/end dates and invoice payment status are provider reads. Missing or ambiguous data displays unavailable states, never simulated payment success.

No card data is stored or rendered in Viewflo. Invoice history shows only issued invoices for the tenant's verified customer; drafts are excluded, foreign pagination cursors are rejected, and invoice links accept HTTPS Stripe hosts only. Manage payment method creates a server-side Customer Portal session for that customer and returns to the same site.

The separate USD4000 contingent services fee and eligibility safeguards remain. Signature, hosting activation, launch, baseline and elapsed time do not earn it; this flow does not create a services invoice. Effective legal/provider/commercial facts, actual services conditions, public replacement measurement/client acceptance and explicit release authority remain separately required. Existing test-only code rejects live keys/data.
