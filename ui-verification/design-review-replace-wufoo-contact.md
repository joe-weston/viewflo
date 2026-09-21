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

Screenshots were opened and inspected. The large blank area above the form comes from the preserved map embed on the mirrored page; it predates this form change. No new clipping or nested scroll was observed. Labels and controls remain keyboard accessible with visible focus styles. The Turnstile widget was simulated in the local error-state test because production keys were unavailable.

## Release disposition

Code and local UI checks pass. Production activation remains blocked until the migration is applied to the approved Viewflo Supabase project, the four environment variables in `.env.example` are configured on the existing Vercel project, a real production or staging submission is confirmed in `contact_submissions`, and an owner is assigned to review incoming requests. The existing `npm run lint` script fails because `next lint` is removed in the installed Next.js version; build and TypeScript pass.
