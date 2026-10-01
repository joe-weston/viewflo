-- Prepared only: apply to an explicitly approved environment after the earlier tenant migrations.
create table public.vf_tenant_email_settings (
 tenant_id uuid primary key references public.vf_tenants,
 sender_name text not null check (length(sender_name) between 1 and 100 and sender_name !~ '[\r\n<>]'),
 sender_email text not null check (sender_email ~ '^[^[:space:]<>]+@[^[:space:]<>]+\.[^[:space:]<>]+$'),
 reply_to text not null check (reply_to ~ '^[^[:space:]<>]+@[^[:space:]<>]+\.[^[:space:]<>]+$'),
 manager_recipients text[] not null check (cardinality(manager_recipients) between 1 and 5),
 enabled boolean not null default false
);
create table public.vf_leads (
 id uuid primary key, tenant_id uuid not null references public.vf_tenants,
 kind text not null check (kind in ('consultation','photo_intake')),
 name text not null check(length(name) between 1 and 100),
 email text not null check(length(email) <= 254 and email ~ '^[^[:space:]<>]+@[^[:space:]<>]+\.[^[:space:]<>]+$'),
 phone text not null default '' check(length(phone)<=40),
 notes text not null default '' check(length(notes)<=2000), details jsonb not null check(jsonb_typeof(details)='object'),
 source_path text not null, consent_at timestamptz not null,
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 status text not null default 'new' check(status in ('new','reviewing','contacted','closed')),
 created_at timestamptz not null default now(),
 unique(tenant_id,id)
);
create table public.vf_lead_photos (
 lead_id uuid not null references public.vf_leads on delete cascade,
 tenant_id uuid not null references public.vf_tenants,
 sequence integer not null check(sequence between 1 and 3), storage_path text not null unique,
 mime_type text not null default 'image/jpeg' check(mime_type='image/jpeg'),
 size_bytes integer not null check(size_bytes between 1 and 3145728),
 created_at timestamptz not null default now(), primary key(lead_id,sequence),
 foreign key(tenant_id,lead_id) references public.vf_leads(tenant_id,id)
);
create table public.vf_lead_email_outbox (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.vf_leads,
 tenant_id uuid not null references public.vf_tenants,
 audience text not null check(audience in ('submitter','manager')), recipient text not null,
 -- Snapshot the exact content and addresses: tenant setting edits cannot alter an in-flight message.
 payload jsonb not null, template_version integer not null default 1 check(template_version=1),
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 first_attempt_at timestamptz, claim_token uuid, locked_until timestamptz,
 resend_id text, error_category text, created_at timestamptz not null default now(),
 unique(lead_id,audience,recipient), foreign key(tenant_id,lead_id) references public.vf_leads(tenant_id,id)
);
create index vf_email_due on public.vf_lead_email_outbox(next_attempt_at) where status in ('pending','sending');
create index vf_leads_tenant on public.vf_leads(tenant_id,created_at desc);
alter table public.vf_tenant_email_settings enable row level security;
alter table public.vf_leads enable row level security;
alter table public.vf_lead_photos enable row level security;
alter table public.vf_lead_email_outbox enable row level security;
-- v1 has no manager UI: access is exclusively through the server and authorized DB operators.
revoke all on public.vf_tenant_email_settings,public.vf_leads,public.vf_lead_photos,public.vf_lead_email_outbox from anon,authenticated;
grant all on public.vf_tenant_email_settings,public.vf_leads,public.vf_lead_photos,public.vf_lead_email_outbox to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('vf-lead-photos','vf-lead-photos',false,3145728,array['image/jpeg']) on conflict(id) do nothing;

create function public.vf_create_lead(p_slug text,p_lead jsonb,p_photos jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare t uuid; s public.vf_tenant_email_settings; previous public.vf_leads; lead_uuid uuid := (p_lead->>'id')::uuid; recipient text; snapshot jsonb;
begin
 select id into t from vf_tenants where slug=p_slug;
 if t is null then raise exception 'Unknown tenant'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lead_uuid::text,0));
 select * into previous from vf_leads where id=lead_uuid;
 if found then
  if previous.tenant_id=t and previous.fingerprint=p_lead->>'fingerprint' then return lead_uuid; end if;
  raise exception 'Request identity conflict';
 end if;
 -- Limit repeated confirmations to the same destination across request identities.
 perform pg_advisory_xact_lock(hashtextextended(t::text||lower(p_lead->>'email'),1));
 if (select count(*) from vf_leads where tenant_id=t and email=lower(p_lead->>'email') and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many requests'; end if;
 select * into s from vf_tenant_email_settings where tenant_id=t and enabled;
 if not found then raise exception 'Email settings unavailable'; end if;
 if exists(select 1 from unnest(s.manager_recipients) r where r !~ '^[^[:space:]<>]+@[^[:space:]<>]+\.[^[:space:]<>]+$') then raise exception 'Invalid recipients'; end if;
 if jsonb_array_length(p_photos)>3 or (p_lead->>'kind'='photo_intake' and jsonb_array_length(p_photos)=0) then raise exception 'Invalid photos'; end if;
 if exists(select 1 from jsonb_array_elements(p_photos) p where p->>'storage_path' not like t::text||'/'||lead_uuid::text||'/'||(p_lead->>'fingerprint')||'/%') then raise exception 'Invalid photo path'; end if;
 insert into vf_leads(id,tenant_id,kind,name,email,phone,notes,details,source_path,consent_at,fingerprint)
 values(lead_uuid,t,p_lead->>'kind',p_lead->>'name',p_lead->>'email',p_lead->>'phone',p_lead->>'notes',p_lead->'details',p_lead->>'sourcePath',(p_lead->>'consentAt')::timestamptz,p_lead->>'fingerprint');
 insert into vf_lead_photos(lead_id,tenant_id,sequence,storage_path,size_bytes)
 select lead_uuid,t,(p->>'sequence')::integer,p->>'storage_path',(p->>'size_bytes')::integer from jsonb_array_elements(p_photos) p;
 snapshot := jsonb_build_object('reference',lead_uuid,'kind',p_lead->>'kind','name',p_lead->>'name','email',p_lead->>'email','phone',p_lead->>'phone','notes',p_lead->>'notes','details',p_lead->'details','sourcePath',p_lead->>'sourcePath','receivedAt',now(),'photoCount',jsonb_array_length(p_photos),'senderName',s.sender_name,'senderEmail',s.sender_email,'replyTo',s.reply_to);
 insert into vf_lead_email_outbox(lead_id,tenant_id,audience,recipient,payload) values(lead_uuid,t,'submitter',p_lead->>'email',snapshot);
 for recipient in select distinct lower(trim(r)) from unnest(s.manager_recipients) r loop
  insert into vf_lead_email_outbox(lead_id,tenant_id,audience,recipient,payload) values(lead_uuid,t,'manager',recipient,snapshot);
 end loop;
 return lead_uuid;
end $$;

create function public.vf_claim_lead_email(p_lead uuid default null,p_limit integer default 5) returns setof public.vf_lead_email_outbox
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Resend deduplicates for 24h only. Stop ambiguous sends conservatively before expiry.
 update vf_lead_email_outbox set status='failed',error_category='reconciliation_required',claim_token=null,locked_until=null
 where status in ('pending','sending') and first_attempt_at < now()-interval '23 hours' and (locked_until is null or locked_until<now()) and (p_lead is null or lead_id=p_lead);
 return query with due as (
  select id from vf_lead_email_outbox where
   (p_lead is null or lead_id=p_lead) and next_attempt_at<=now() and attempts<6 and
   (status='pending' or (status='sending' and locked_until<now()))
   order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,1),6)
 ) update vf_lead_email_outbox o set status='sending',attempts=o.attempts+1,
  first_attempt_at=coalesce(o.first_attempt_at,now()),claim_token=gen_random_uuid(),locked_until=now()+interval '5 minutes'
 from due where o.id=due.id returning o.*;
 -- Recover a crash on the last attempt without leaving the row permanently leased.
 update vf_lead_email_outbox set status='failed',error_category='reconciliation_required',claim_token=null,locked_until=null
 where status='sending' and locked_until<now() and attempts>=6 and (p_lead is null or lead_id=p_lead);
end $$;

create function public.vf_finish_lead_email(p_id uuid,p_claim uuid,p_resend_id text,p_error text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update vf_lead_email_outbox set
  status=case when p_resend_id is not null then 'sent' when attempts>=6 then 'failed' else 'pending' end,
  resend_id=p_resend_id,error_category=case when p_resend_id is not null then null else p_error end,
  next_attempt_at=coalesce(first_attempt_at,now()) + case attempts when 1 then interval '5 minutes' when 2 then interval '30 minutes' when 3 then interval '2 hours' when 4 then interval '12 hours' else interval '24 hours' end,
  claim_token=null,locked_until=null
 where id=p_id and claim_token=p_claim and status='sending';
 if not found then raise exception 'Claim expired'; end if;
end $$;
revoke all on function public.vf_create_lead(text,jsonb,jsonb),public.vf_claim_lead_email(uuid,integer),public.vf_finish_lead_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.vf_create_lead(text,jsonb,jsonb),public.vf_claim_lead_email(uuid,integer),public.vf_finish_lead_email(uuid,uuid,text,text) to service_role;
-- Existing pasadena_photo_requests are intentionally retained. Inventory and reconcile before launch;
-- no confirmations are generated for historical rows without a verified email and consent.
