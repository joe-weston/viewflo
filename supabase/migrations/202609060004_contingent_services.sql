-- No invoice/charge creation. Earning conditions come from the company-approved SOW.
alter table public.vf_service_orders add column sow_document_id uuid references public.vf_documents;
alter table public.vf_service_orders add column condition_definition text;
alter table public.vf_service_orders add column condition_sha256 text;
alter table public.vf_service_orders add constraint vf_condition_digest check((condition_definition is null and condition_sha256 is null) or (condition_definition is not null and length(trim(condition_definition))>0 and condition_sha256=encode(sha256(convert_to(condition_definition,'UTF8')),'hex')));
create table public.vf_service_approvers (user_id uuid primary key references auth.users);
alter table public.vf_service_approvers enable row level security;
revoke all on public.vf_service_approvers from anon,authenticated;
grant all on public.vf_service_approvers to service_role;
create table public.vf_service_eligibility_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.vf_tenants,
 sow_document_id uuid not null references public.vf_documents, condition_sha256 text not null,
 approved_by uuid not null references public.vf_service_approvers(user_id), approved_at timestamptz not null default now(),
 evidence_reference text not null check(length(trim(evidence_reference)) between 1 and 2000),
 unique(tenant_id,sow_document_id,condition_sha256)
);
alter table public.vf_service_eligibility_events enable row level security;
revoke all on public.vf_service_eligibility_events from anon,authenticated,service_role;
grant select on public.vf_service_eligibility_events to authenticated,service_role;
create policy eligibility_billing_read on public.vf_service_eligibility_events for select to authenticated using(exists(select 1 from public.vf_memberships m where m.tenant_id=vf_service_eligibility_events.tenant_id and m.user_id=auth.uid() and m.role in ('owner','billing')));
create function public.vf_approve_service_eligibility(p_tenant uuid,p_sow uuid,p_actor uuid,p_evidence text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.vf_service_orders; event_id uuid;
begin
 if not exists(select 1 from vf_service_approvers where user_id=p_actor) then raise exception 'Approver not authorized'; end if;
 select * into o from vf_service_orders where tenant_id=p_tenant for update;
 if not found or o.sow_document_id is distinct from p_sow or o.condition_definition is null or o.condition_sha256 is null then raise exception 'Conditions not defined'; end if;
 if not exists(select 1 from vf_documents d where d.id=p_sow and d.kind='sow' and d.tenant_id=p_tenant and d.published_at<=now() and d.retired_at is null and d.sha256=encode(sha256(convert_to(d.body,'UTF8')),'hex')) then raise exception 'SOW unavailable'; end if;
 if not exists(select 1 from vf_acceptances where tenant_id=p_tenant and document_id=p_sow and action='accept') then raise exception 'SOW acceptance required'; end if;
 insert into vf_service_eligibility_events(tenant_id,sow_document_id,condition_sha256,approved_by,evidence_reference) values(p_tenant,p_sow,o.condition_sha256,p_actor,p_evidence) on conflict do nothing returning id into event_id;
 if event_id is null then select id into event_id from vf_service_eligibility_events where tenant_id=p_tenant and sow_document_id=p_sow and condition_sha256=o.condition_sha256; end if;
 return event_id;
end $$;
revoke all on function public.vf_approve_service_eligibility(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.vf_approve_service_eligibility(uuid,uuid,uuid,text) to service_role;
-- Only an authenticated operator workflow may invoke this service-role RPC with its
-- verified actor. No such approval UI/API is enabled here; no approvers are seeded.
-- Recording eligibility is not an invoice, payment election, or collection authorization.
