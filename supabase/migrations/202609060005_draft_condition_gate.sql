-- Company review drafts and placeholder targets are never earning conditions.
alter table public.vf_service_orders add column conditions_finalized_at timestamptz;
alter table public.vf_service_orders add column condition_source_version text;
alter table public.vf_billing add column provider_identity_verified_at timestamptz;
create function public.vf_require_final_conditions() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from vf_service_orders o where o.tenant_id=new.tenant_id and o.sow_document_id=new.sow_document_id and o.condition_sha256=new.condition_sha256 and o.conditions_finalized_at<=now() and length(trim(o.condition_source_version))>0) then raise exception 'Final company-approved conditions required'; end if;
 return new;
end $$;
create trigger vf_final_condition_gate before insert on public.vf_service_eligibility_events for each row execute function public.vf_require_final_conditions();
-- Fields stay NULL. Only verified final source review may populate them.
-- No 50-visitor threshold, percentage formula, or assessment date is seeded.
