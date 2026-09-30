-- Review and apply only to an approved non-production project first.
create table public.vf_tenants (
 id uuid primary key default gen_random_uuid(), slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), name text not null
);
create table public.vf_memberships (
 tenant_id uuid references public.vf_tenants on delete cascade, user_id uuid references auth.users on delete cascade,
 role text not null check (role in ('owner','billing','member')), primary key(tenant_id,user_id)
);
create table public.vf_documents (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('terms','privacy')), version text not null,
 title text not null, body text not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 published_at timestamptz, retired_at timestamptz, unique(kind,version)
);
create unique index vf_one_current_document on public.vf_documents(kind) where published_at is not null and retired_at is null;
create table public.vf_acceptances (
 tenant_id uuid references public.vf_tenants, user_id uuid references auth.users,
 document_id uuid references public.vf_documents, action text not null check(action in ('accept','acknowledge')),
 accepted_at timestamptz not null default now(), primary key(tenant_id,user_id,document_id)
);
create table public.vf_billing (
 tenant_id uuid primary key references public.vf_tenants,
 stripe_customer_id text unique, stripe_subscription_id text unique, subscription_status text,
 stripe_account_id text not null, stripe_price_id text not null,
 currency text not null, unit_amount bigint not null check(unit_amount>=0), interval text not null check(interval in ('day','week','month','year')),
 interval_count integer not null check(interval_count>0), commercial_summary text not null,
 approved_at timestamptz, updated_at timestamptz not null default now()
);
create table public.vf_webhook_events (
 event_id text primary key, processed_at timestamptz not null default now()
);
create table public.vf_checkout_attempts (
 tenant_id uuid primary key references public.vf_tenants, attempt_id uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(), session_id text unique
);
alter table public.vf_checkout_attempts enable row level security;
revoke all on public.vf_checkout_attempts from anon,authenticated;
grant all on public.vf_checkout_attempts to service_role;
alter table public.vf_tenants enable row level security;
alter table public.vf_memberships enable row level security;
alter table public.vf_documents enable row level security;
alter table public.vf_acceptances enable row level security;
alter table public.vf_billing enable row level security;
alter table public.vf_webhook_events enable row level security;
create policy memberships_self on public.vf_memberships for select to authenticated using(user_id=auth.uid());
create policy tenants_member on public.vf_tenants for select to authenticated using(exists(select 1 from public.vf_memberships m where m.tenant_id=id and m.user_id=auth.uid()));
create policy documents_published on public.vf_documents for select to authenticated using(published_at is not null and published_at<=now());
create policy acceptances_self on public.vf_acceptances for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.vf_memberships m where m.tenant_id=vf_acceptances.tenant_id and m.user_id=auth.uid()));
create policy billing_authorized on public.vf_billing for select to authenticated using(exists(select 1 from public.vf_memberships m where m.tenant_id=vf_billing.tenant_id and m.user_id=auth.uid() and m.role in ('owner','billing')));
-- No client writes to membership, document publication, customer mappings, or webhook receipts.
revoke all on public.vf_tenants,public.vf_memberships,public.vf_documents,public.vf_acceptances,public.vf_billing,public.vf_webhook_events from anon,authenticated;
grant select on public.vf_tenants,public.vf_memberships,public.vf_documents,public.vf_acceptances,public.vf_billing to authenticated;
grant all on public.vf_tenants,public.vf_memberships,public.vf_documents,public.vf_acceptances,public.vf_billing,public.vf_webhook_events to service_role;

create function public.vf_accept_document(p_tenant uuid,p_document uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.vf_documents;
begin
 if auth.uid() is null or not exists(select 1 from vf_memberships where tenant_id=p_tenant and user_id=auth.uid() and role in ('owner','billing')) then raise exception 'Access denied'; end if;
 select * into d from vf_documents where id=p_document and published_at<=now() and retired_at is null;
 if not found then raise exception 'Document unavailable'; end if;
 if encode(sha256(convert_to(d.body,'UTF8')),'hex')<>d.sha256 then raise exception 'Document integrity failure'; end if;
 if d.kind='privacy' and not exists(select 1 from vf_acceptances a join vf_documents t on t.id=a.document_id where a.tenant_id=p_tenant and a.user_id=auth.uid() and t.kind='terms' and t.published_at<=now() and t.retired_at is null) then raise exception 'Terms required first'; end if;
 insert into vf_acceptances(tenant_id,user_id,document_id,action) values(p_tenant,auth.uid(),d.id,case when d.kind='terms' then 'accept' else 'acknowledge' end) on conflict do nothing;
end $$;
revoke all on function public.vf_accept_document(uuid,uuid) from public;
grant execute on function public.vf_accept_document(uuid,uuid) to authenticated;

create function public.vf_protect_document() returns trigger language plpgsql as $$
begin
 if old.published_at is not null and (new.kind,new.version,new.title,new.body,new.sha256,new.published_at) is distinct from (old.kind,old.version,old.title,old.body,old.sha256,old.published_at) then raise exception 'Published documents are immutable'; end if;
 return new;
end $$;
create trigger vf_document_immutable before update on public.vf_documents for each row execute function public.vf_protect_document();

-- Transactional webhook receipt + update. Status is refreshed from Stripe by billing reads;
-- event payload order can never independently authorize service or declare payment success.
create function public.vf_record_subscription(p_event text,p_customer text,p_subscription text,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into vf_webhook_events(event_id) values(p_event) on conflict do nothing;
 if not found then return; end if;
 update vf_billing set stripe_subscription_id=p_subscription,subscription_status=p_status,updated_at=now() where stripe_customer_id=p_customer;
 if not found then raise exception 'Unknown billing customer'; end if;
end $$;
revoke all on function public.vf_record_subscription(text,text,text,text) from public,anon,authenticated;
grant execute on function public.vf_record_subscription(text,text,text,text) to service_role;
