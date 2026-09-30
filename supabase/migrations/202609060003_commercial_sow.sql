-- Unapplied. Operator commercial decisions are not customer consent.
alter table public.vf_billing add column hosting_start_approved_at timestamptz;
alter table public.vf_billing add column invoice_cutoff_policy text;
alter table public.vf_billing add column cancellation_policy_approved_at timestamptz;
-- Do not silently rewrite any existing price mapping; review mismatches before applying.
alter table public.vf_billing add constraint vf_standard_hosting check(currency='usd' and unit_amount=16900 and interval='month' and interval_count=1);
alter table public.vf_documents add column tenant_id uuid references public.vf_tenants;
alter table public.vf_documents drop constraint vf_documents_kind_check;
alter table public.vf_documents add constraint vf_document_scope check((kind in ('terms','privacy') and tenant_id is null) or (kind='sow' and tenant_id is not null));
alter table public.vf_documents drop constraint vf_documents_kind_version_key;
drop index public.vf_one_current_document;
create unique index vf_global_document_version on public.vf_documents(kind,version) where tenant_id is null;
create unique index vf_tenant_document_version on public.vf_documents(tenant_id,kind,version) where tenant_id is not null;
create unique index vf_current_global_document on public.vf_documents(kind) where tenant_id is null and published_at is not null and retired_at is null;
create unique index vf_current_tenant_sow on public.vf_documents(tenant_id,kind) where tenant_id is not null and published_at is not null and retired_at is null;
drop policy documents_published on public.vf_documents;
create policy documents_published on public.vf_documents for select to authenticated using(published_at<=now() and (tenant_id is null or exists(select 1 from public.vf_memberships m where m.tenant_id=vf_documents.tenant_id and m.user_id=auth.uid())));
create or replace function public.vf_protect_document() returns trigger language plpgsql as $$
begin
 if old.published_at is not null and (new.tenant_id,new.kind,new.version,new.title,new.body,new.sha256,new.published_at) is distinct from (old.tenant_id,old.kind,old.version,old.title,old.body,old.sha256,old.published_at) then raise exception 'Published documents are immutable'; end if;
 return new;
end $$;
create or replace function public.vf_accept_document(p_tenant uuid,p_document uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.vf_documents;
begin
 if auth.uid() is null or not exists(select 1 from vf_memberships where tenant_id=p_tenant and user_id=auth.uid() and role in ('owner','billing')) then raise exception 'Access denied'; end if;
 select * into d from vf_documents where id=p_document and published_at<=now() and retired_at is null and (tenant_id is null or tenant_id=p_tenant);
 if not found then raise exception 'Document unavailable'; end if;
 if encode(sha256(convert_to(d.body,'UTF8')),'hex')<>d.sha256 then raise exception 'Document integrity failure'; end if;
 if d.kind='privacy' and not exists(select 1 from vf_acceptances a join vf_documents t on t.id=a.document_id where a.tenant_id=p_tenant and a.user_id=auth.uid() and t.kind='terms' and t.published_at<=now() and t.retired_at is null) then raise exception 'Terms required first'; end if;
 insert into vf_acceptances(tenant_id,user_id,document_id,action) values(p_tenant,auth.uid(),d.id,case when d.kind='privacy' then 'acknowledge' else 'accept' end) on conflict do nothing;
end $$;
create table public.vf_service_orders (
 tenant_id uuid primary key references public.vf_tenants, total_amount integer not null default 400000 check(total_amount=400000), currency text not null default 'usd' check(currency='usd'),
 payment_option text check(payment_option in ('lump_sum','four_monthly')), first_due_at timestamptz,
 -- No default option/start. No automatic Stripe subscription or invoice is created.
 updated_at timestamptz not null default now()
);
alter table public.vf_service_orders enable row level security;
revoke all on public.vf_service_orders from anon,authenticated;
grant select on public.vf_service_orders to authenticated;
grant all on public.vf_service_orders to service_role;
create policy service_orders_billing on public.vf_service_orders for select to authenticated using(exists(select 1 from public.vf_memberships m where m.tenant_id=vf_service_orders.tenant_id and m.user_id=auth.uid() and m.role in ('owner','billing')));
