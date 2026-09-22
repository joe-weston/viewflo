# Contact form design review — 2026-09-21

## Scope and user outcome

Replace the broken Wufoo contact mount on `/contact-us.php/` with a first-party consultation form. A valid request is verified with Turnstile and saved to Viewflo Supabase for the Pasadena tenant. The legacy mirror source and unrelated newsletter/feedback forms remain outside this change.

## Evidence

| Scenario | Evidence | Result |
| --- | --- | --- |
| Desktop, 1365 × 900 | `tmp/ui-verification/replace-wufoo-contact/desktop-contact.png` | Pass: heading, labels, fields, consent, and button are legible and aligned. |
| Mobile, 390 × 844 | `tmp/ui-verification/replace-wufoo-contact/mobile-contact.png` | Pass: single-column fields and usable tap targets; no horizontal overflow. |
| Submission while intake is unconfigured | `tmp/ui-verification/replace-wufoo-contact/error-state.png` | Pass: no false success; visitor sees the telephone fallback. |
| API validation | `node --test tests/contact.test.mjs` | Pass: verifies tenant-scoped write, origin rejection, honeypot rejection, and challenge hostname rejection. |
| Local browser → API → Supabase | `tmp/ui-verification/replace-wufoo-contact/local-success.png` | Pass: two browser submissions returned 201, displayed confirmation, and produced two tenant-scoped receipts without console errors. |

Screenshots were opened and inspected. The large blank area above the form comes from the preserved map embed on the mirrored page; it predates this form change. No new clipping or nested scroll was observed. Labels and controls remain keyboard accessible with visible focus styles. The Turnstile widget was simulated in the local error-state test because production keys were unavailable.

Local full-flow verification used the uniquely named `viewflo-contact-e2e-20260922` Supabase stack on dedicated `565xx` ports and Cloudflare's documented test key pair. Seven local receipts were inspected across direct probes and browser submissions; all seven had the Pasadena tenant slug, consent timestamp, and `new` status. The final two-submission browser run returned 201 twice with no console errors or warnings. Database checks confirmed RLS enabled and anonymous reads/inserts denied. Wrong-origin and honeypot requests returned 403 and 400 without adding rows.

## Release disposition

Code and local UI checks pass. Production activation remains blocked until the migration is applied to the approved Viewflo Supabase project, the four environment variables in `.env.example` are configured on the existing Vercel project, a real production or staging submission is confirmed in `contact_submissions`, and an owner is assigned to review incoming requests. The existing `npm run lint` script fails because `next lint` is removed in the installed Next.js version; build and TypeScript pass.
