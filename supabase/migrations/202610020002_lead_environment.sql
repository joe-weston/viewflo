-- Prepared after 2026-10-02 management inventory: 0 public tables, migrations, users and buckets.
-- Install the existing tenant/intake/inbox foundations first. No hosted writes performed.
-- Null environment preserves historical rows without guessing where they originated.
alter table public.vf_leads add column environment text check(environment in ('staging','production'));
alter table public.vf_lead_email_outbox add column environment text check(environment in ('staging','production'));
alter table public.vf_leads add constraint vf_lead_environment_identity unique(id,environment);
alter table public.vf_lead_email_outbox add constraint vf_outbox_environment_identity foreign key(lead_id,environment) references public.vf_leads(id,environment);
alter table public.vf_lead_email_outbox add constraint vf_outbox_payload_environment check(environment is null or (payload ? 'environment' and payload->>'environment'=environment));
create index vf_email_environment_due on public.vf_lead_email_outbox(environment,next_attempt_at) where status in ('pending','sending');
create function public.vf_create_lead_scoped(p_environment text,p_manager_recipients text[],p_reply_to text,p_admin_url text,p_slug text,p_lead jsonb,p_photos jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare t uuid; s public.vf_tenant_email_settings; previous public.vf_leads; lead_uuid uuid := (p_lead->>'id')::uuid; manager_email text; snapshot jsonb; owners text[];
begin
 if p_environment not in ('staging','production') or p_environment is null then raise exception 'Invalid environment'; end if;
 select id into t from vf_tenants where slug=p_slug;
 if t is null then raise exception 'Unknown tenant'; end if;
 perform pg_advisory_xact_lock(hashtextextended(lead_uuid::text,0));
 select * into previous from vf_leads where id=lead_uuid;
 if found then
  if previous.tenant_id=t and previous.environment=p_environment and previous.fingerprint=p_lead->>'fingerprint' then return lead_uuid; end if;
  raise exception 'Request identity conflict';
 end if;
 -- Limit repeated confirmations to the same destination across request identities.
 perform pg_advisory_xact_lock(hashtextextended(t::text||lower(p_lead->>'email'),1));
 if (select count(*) from vf_leads where tenant_id=t and environment=p_environment and email=lower(p_lead->>'email') and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many requests'; end if;
 select * into s from vf_tenant_email_settings where tenant_id=t and enabled;
 if not found then raise exception 'Email settings unavailable'; end if;
 select array_agg(distinct lower(u.email) order by lower(u.email)) into owners from vf_memberships m join auth.users u on u.id=m.user_id where m.tenant_id=t and m.role='owner' and u.email_confirmed_at is not null;
 if p_manager_recipients is null or p_reply_to is null or coalesce(cardinality(owners),0) not between 1 and 5 or not (p_manager_recipients @> owners and owners @> p_manager_recipients) or not (lower(p_reply_to)=any(owners)) then raise exception 'Authorized recipients unavailable'; end if;
 if p_admin_url is null or p_admin_url !~ ('^https://[^/?#]+/pasadena-shades-and-shutters/admin/leads/'||lead_uuid::text||'/$') then raise exception 'Invalid admin URL'; end if;
 if exists(select 1 from unnest(owners) r where r !~ '^[^[:space:]<>]+@[^[:space:]<>]+\.[^[:space:]<>]+$') then raise exception 'Invalid recipients'; end if;
 if jsonb_array_length(p_photos)>3 or (p_lead->>'kind'='photo_intake' and jsonb_array_length(p_photos)=0) then raise exception 'Invalid photos'; end if;
 if exists(select 1 from jsonb_array_elements(p_photos) p where p->>'storage_path' not like t::text||'/'||lead_uuid::text||'/'||(p_lead->>'fingerprint')||'/%') then raise exception 'Invalid photo path'; end if;
 insert into vf_leads(environment,id,tenant_id,kind,name,email,phone,notes,details,source_path,consent_at,fingerprint)
 values(p_environment,lead_uuid,t,p_lead->>'kind',p_lead->>'name',p_lead->>'email',p_lead->>'phone',p_lead->>'notes',(p_lead->'details')-'budget',p_lead->>'sourcePath',(p_lead->>'consentAt')::timestamptz,p_lead->>'fingerprint');
 insert into vf_lead_photos(lead_id,tenant_id,sequence,storage_path,size_bytes)
 select lead_uuid,t,(p->>'sequence')::integer,p->>'storage_path',(p->>'size_bytes')::integer from jsonb_array_elements(p_photos) p;
 snapshot := jsonb_build_object('environment',p_environment,'adminUrl',p_admin_url,'reference',lead_uuid,'kind',p_lead->>'kind','name',p_lead->>'name','email',p_lead->>'email','phone',p_lead->>'phone','notes',p_lead->>'notes','details',(p_lead->'details')-'budget','sourcePath',p_lead->>'sourcePath','receivedAt',now(),'photoCount',jsonb_array_length(p_photos),'senderName',s.sender_name,'senderEmail',s.sender_email,'replyTo',p_reply_to);
 insert into vf_lead_email_outbox(environment,lead_id,tenant_id,audience,recipient,payload) values(p_environment,lead_uuid,t,'submitter',case when p_environment='staging' then 'jocduplbot@gmail.com' else p_lead->>'email' end,snapshot);
 for manager_email in select distinct lower(trim(r)) from unnest(owners) r loop
  insert into vf_lead_email_outbox(environment,lead_id,tenant_id,audience,recipient,payload) values(p_environment,lead_uuid,t,'manager',case when p_environment='staging' then 'jocduplbot@gmail.com' else manager_email end,snapshot) on conflict(lead_id,audience,recipient) do nothing;
 end loop;
 return lead_uuid;
end $$;

create function public.vf_claim_lead_email_scoped(p_environment text,p_lead uuid default null,p_limit integer default 5) returns setof public.vf_lead_email_outbox
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Resend deduplicates for 24h only. Stop ambiguous sends conservatively before expiry.
 update vf_lead_email_outbox set status='failed',error_category='reconciliation_required',claim_token=null,locked_until=null
 where environment=p_environment and status in ('pending','sending') and first_attempt_at < now()-interval '23 hours' and (locked_until is null or locked_until<now()) and environment=p_environment and (p_lead is null or lead_id=p_lead);
 return query with due as (
  select id from vf_lead_email_outbox where
   environment=p_environment and (p_lead is null or lead_id=p_lead) and next_attempt_at<=now() and attempts<6 and
   (status='pending' or (status='sending' and locked_until<now()))
   order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,1),6)
 ) update vf_lead_email_outbox o set status='sending',attempts=o.attempts+1,
  first_attempt_at=coalesce(o.first_attempt_at,now()),claim_token=gen_random_uuid(),locked_until=now()+interval '5 minutes'
 from due where o.id=due.id returning o.*;
 -- Recover a crash on the last attempt without leaving the row permanently leased.
 update vf_lead_email_outbox set status='failed',error_category='reconciliation_required',claim_token=null,locked_until=null
 where environment=p_environment and status='sending' and locked_until<now() and attempts>=6 and environment=p_environment and (p_lead is null or lead_id=p_lead);
end $$;


create function public.vf_finish_lead_email_scoped(p_environment text,p_id uuid,p_claim uuid,p_resend_id text,p_error text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update vf_lead_email_outbox set
  status=case when p_resend_id is not null then 'sent' when attempts>=6 then 'failed' else 'pending' end,
  resend_id=p_resend_id,error_category=case when p_resend_id is not null then null else p_error end,
  next_attempt_at=coalesce(first_attempt_at,now()) + case attempts when 1 then interval '5 minutes' when 2 then interval '30 minutes' when 3 then interval '2 hours' when 4 then interval '12 hours' else interval '24 hours' end,
  claim_token=null,locked_until=null
 where environment=p_environment and id=p_id and claim_token=p_claim and status='sending';
 if not found then raise exception 'Claim expired'; end if;
end $$;

revoke all on function public.vf_create_lead_scoped(text,text[],text,text,text,jsonb,jsonb),public.vf_claim_lead_email_scoped(text,uuid,integer),public.vf_finish_lead_email_scoped(text,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.vf_create_lead_scoped(text,text[],text,text,text,jsonb,jsonb),public.vf_claim_lead_email_scoped(text,uuid,integer),public.vf_finish_lead_email_scoped(text,uuid,uuid,text,text) to service_role;
-- Retain old functions for rollback inspection, but never allow the shared server role to claim unscoped jobs.
revoke execute on function public.vf_create_lead(text,jsonb,jsonb),public.vf_claim_lead_email(uuid,integer),public.vf_finish_lead_email(uuid,uuid,text,text) from service_role;
