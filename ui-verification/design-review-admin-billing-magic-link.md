# Pasadena manager billing — September 30, 2026

## Planning, product and architecture

Authorized scope: implement the approved plan and commit the existing work plus the new tenant billing/authentication experience in the single Viewflo checkout. User outcome: the designated manager visits Pasadena's `/admin/billing/`, signs in by email magic link, and sees subscription amount/date/status, invoice/payment history, policy links and Stripe payment-method management. The platform-prefixed route is equivalent. Manager assignment is operator-provisioned; public signup and password controls are removed from this portal.

Implementation groups: host-aware URL policy/request helper; Supabase email request/confirmation and tenant billing authorization; shared admin navigation and agreements/Stripe return paths; server-side customer-scoped Stripe snapshot; responsive Billing component/loading state; unit/browser tests and setup documentation. Existing schema, legal-document acceptance, contingent-services safeguards and test-only payment boundaries are retained. No cloud migration, account provisioning, provider configuration, email send, charge, push or deployment occurred.

Role evidence is recorded in this local review by the implementing agent, not an independent reviewer or external coordinator. Product acceptance: requested local functionality implemented; activation and authenticated workflow acceptance remain blocked by configuration/evidence below.

## Tester evidence

- `npm run lint`: PASS. Additional proxy ESLint check: PASS.
- `npm run typecheck`: PASS.
- `npm test`: 43 PASS. Covers tenant origin/path guards, invoice pagination ownership, live/foreign provider data rejection, renewal versus service-end/retry dates, ambiguous subscriptions, draft exclusion, magic-link expiry and fresh authorization, plus existing photo/commercial policy regressions.
- `npm run build`: PASS, 68 static pages. Preview build ID `nkoh2IYfd7Zh4KqJ4yU_5`.
- `npm run test:e2e` equivalent direct Playwright runner: 14 PASS, 2 SKIPPED. Existing public tenant/legacy/photo UI regressions pass. Actual hosted storage/receipt is not established by receipt fixtures.
- `git diff --check`: PASS with line-ending warnings only. Source secret-pattern scan: zero potential matches; `.env` remains ignored. Git commands use `-c core.longpaths=true` for preserved long snapshot paths.

Successful npm scripts were invoked through the installed npm CLI with bundled Node 24.19.0, its bin directory prepended to PATH, and system CA enabled for builds. The preview runs at http://127.0.0.1:3188. Supabase public/service configuration was explicitly disabled in the preview process so public checks contact no configured remote database; actual local secret files were not edited. Existing Supabase variable presence is not proof of an approved target or usable schema. Stripe configuration, canonical Playwright credentials and a test-mailbox magic link are absent.

Initial test-harness issues (Windows esbuild filesystem restrictions, trailing-slash expectations, fixture font inheritance and generated TypeScript being included in app typecheck) were corrected. The final fixture renderer uses the existing tsx runtime and ignored JSX output, copies application font classes/styles, and creates no fixture application route. The CLI agent-browser was unavailable; Playwright plus local image inspection provided browser evidence.

## UI evidence and inspection

Evidence root: `tmp/ui-verification/admin-billing-magic-link/`.

Inspected at desktop 1440×1000 and mobile 390×844:

- `desktop-signin.png`, `mobile-signin.png`: manager email, disabled unconfigured send action, readable setup state and labeled input. Keyboard focus and no pageerror verified.
- `{desktop,mobile}-email-sent.png`, `{desktop,mobile}-expired.png`: generic confirmation and expired/reused recovery messages. These query-driven states are display evidence, not proof of email delivery or token verification.
- `{desktop,mobile}-denied.png`: no tenant billing data exposed in the unconfigured workspace; recovery link retains tenant context. Not an RLS authorization test.
- `{desktop,mobile}-billing-{history,empty,unavailable,loading}-fixture.png`: actual Billing/Loading components rendered in an isolated document with explicitly synthetic data. Subscription cards, active tab, paid/open/void history, pagination, payment-method action, policy acceptance summaries, errors and skeletons inspected. Fixture headings visibly identify their limited evidence.

Final observations: Fraunces display typography and Inter body text match the application; generous readable cards; three summary columns on desktop, stacked cards and two-column invoice rows on mobile; no observed horizontal overflow, clipping, overlap or nested scrolling. Buttons retain minimum 44px height, mobile invoice links have 44px targets and tabs have 48px height. Policy links have distinct underlining and well-spaced rows; active navigation uses `aria-current`. Status is text as well as color. Loading exposes `aria-busy` and a status message with decorative skeletons hidden from assistive technology. Full screen-reader/contrast audit was not performed.

Findings: fixture-only font mismatch found and corrected before final capture. No remaining visual non-pass finding in the inspected states. **Full authenticated UI verification remains BLOCKED**, including production-host navigation/session behavior, actual document acceptance, manager sign-out/revocation, real invoice retrieval and Stripe portal/payment return.

## Security/code review and release disposition

Surfaces reviewed: server actions, callback/session establishment, tenant-context reads, URL policy, agreement links/actions, Stripe customer mapping/invoice reads and pagination, server-rendered data, client components, secret handling.

- Magic-link sign-in disables account creation; operator grants existing `billing`/`owner` membership. Callback verifies the token and fresh membership before returning to Billing; failed membership lookup signs out the new session. Every protected page/action rechecks authorization through Supabase/RLS.
- Origin policy uses exact approved custom hosts or configured platform origin; rejects hostile/mismatched hosts and traversing paths. Callback ignores arbitrary external return destinations. Same-site navigation and Stripe return paths preserve custom-domain routing. Cookies remain host-scoped.
- Billing never accepts a browser-supplied customer or price. Cursor ownership is checked before pagination; every subscription/invoice response is checked for expected customer and test mode. Multiple/overflow subscriptions and unsupported prices fail closed. HTTPS invoice links are restricted to Stripe domains. No card data is collected or stored here.
- Client components contain navigation and form pending/cooldown state only. Provider reads and credentials remain server-side. Public email confirmation is generic; Supabase supplies authoritative rate limits. Token-bearing portal traces are disabled and the entire test magic-link URL is treated as a credential.
- No new database grants/migrations or production capabilities were added. No new high-risk code finding identified in local review; real authorization/data-policy validation remains unverified and therefore cannot pass the release security gate.

Required remaining evidence: approved Supabase target/schema/memberships and callback/email template; designated manager email; canonical synthetic test credentials and fresh mailbox link; delivered/replayed/expired/revoked/cross-tenant browser tests; reviewed Stripe TEST account/customer/price/Portal configuration and actual hosted return flow; finalized legal/commercial decisions and separate release authority. See MANAGER-BILLING-SETUP.md for setup. Local implementation commits are review checkpoints, not a production-readiness verdict.
