# Pasadena contact form release

1. Apply `supabase/migrations/202609210001_contact_submissions.sql` to the approved Viewflo Supabase project. Confirm RLS is enabled and that `anon` and `authenticated` cannot read or insert into `public.contact_submissions`.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY` in the existing Vercel Viewflo project. The Turnstile widget must allow the actual contact-page hostname. Keep the service role and Turnstile secret server-side.
3. Build/deploy after configuration; the public site key is embedded at build time. Submit one real test request through the deployed form. Confirm its row has `tenant_slug = 'pasadena-shades-and-shutters'`, then remove the test row using approved database procedures.
4. Assign a person to review new rows and contact customers. The form stores requests; it does not send email notifications or book appointments.

Until configuration is complete, the endpoint returns 503 and the page directs visitors to call 818-618-5288. No customer data is sent to analytics by this form.
