-- Prepared only. Apply exclusively to an explicitly approved Pasadena environment.
create table if not exists public.pasadena_photo_requests (
 id uuid primary key,
 fingerprint text not null check (char_length(fingerprint) = 64),
 created_at timestamptz not null default now(),
 contact text not null check (char_length(contact) between 5 and 254),
 notes text not null default '' check (char_length(notes) <= 2000),
 photo_paths text[] not null check (cardinality(photo_paths) between 1 and 3),
 consent_at timestamptz not null,
 status text not null default 'new' check(status in ('new','reviewing','contacted','closed'))
);
alter table public.pasadena_photo_requests enable row level security;
revoke all on public.pasadena_photo_requests from anon, authenticated;
grant select, insert, update, delete on public.pasadena_photo_requests to service_role;
-- No public or signed-in policies. Only the server adapter and authorized Supabase project operators can access intake.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pasadena-photo-requests','pasadena-photo-requests',false,3145728,array['image/jpeg'])
on conflict(id) do nothing;
-- Existing bucket configuration must be independently verified: private, no public object policies.
