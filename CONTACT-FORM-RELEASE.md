# Pasadena contact form release

1. Apply `supabase/migrations/202609210001_contact_submissions.sql` to the approved Viewflo Supabase project. Confirm RLS is enabled and that `anon` and `authenticated` cannot read or insert into `public.contact_submissions`.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY` in the existing Vercel Viewflo project. The Turnstile widget must allow the actual contact-page hostname. Keep the service role and Turnstile secret server-side.
3. Build/deploy after configuration; the public site key is embedded at build time. Submit one real test request through the deployed form. Confirm its row has `tenant_slug = 'pasadena-shades-and-shutters'`, then remove the test row using approved database procedures.
4. Assign a person to review new rows and contact customers. The form stores requests; it does not send email notifications or book appointments.

Until configuration is complete, the endpoint returns 503 and the page directs visitors to call 818-618-5288. No customer data is sent to analytics by this form.

## Local verification

The repository includes a local Supabase configuration with project ID `viewflo-contact-e2e-20260922` and dedicated `565xx` ports. A gitignored `.env.local` can point to that stack and use Cloudflare's official test keys. The API accepts local HTTP Supabase only for `localhost` or `127.0.0.1`, and accepts Cloudflare's dummy token only in non-production mode on a local hostname with the exact official test key pair.
