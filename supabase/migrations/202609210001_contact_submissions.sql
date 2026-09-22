-- Apply to the approved Viewflo Supabase project before enabling the public form.
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null check (tenant_slug = 'pasadena-shades-and-shutters'),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  message text not null check (char_length(message) between 5 and 2000),
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'closed'))
);

alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from anon, authenticated;
grant insert, select, update, delete on public.contact_submissions to service_role;
-- No anon/authenticated policies: intake is server-only and review is via authorized project operators.
