-- Prepared only. Existing mappings remain test; live requires a separate approved row.
alter table public.vf_billing add column stripe_mode text not null default 'test' check(stripe_mode in ('test','live'));
alter table public.vf_billing add column collection_method text check(collection_method in ('charge_automatically','send_invoice'));
alter table public.vf_billing drop constraint vf_billing_pkey;
alter table public.vf_billing add primary key(tenant_id,stripe_mode);
alter table public.vf_billing drop constraint vf_billing_stripe_customer_id_key;
alter table public.vf_billing drop constraint vf_billing_stripe_subscription_id_key;
create unique index vf_billing_customer_mode on public.vf_billing(stripe_account_id,stripe_mode,stripe_customer_id);
create unique index vf_billing_subscription_mode on public.vf_billing(stripe_account_id,stripe_mode,stripe_subscription_id);
alter table public.vf_checkout_attempts add column stripe_mode text not null default 'test' check(stripe_mode in ('test','live'));
alter table public.vf_checkout_attempts drop constraint vf_checkout_attempts_pkey;
alter table public.vf_checkout_attempts add primary key(tenant_id,stripe_mode);
alter table public.vf_checkout_attempts drop constraint vf_checkout_attempts_session_id_key;
create unique index vf_checkout_session_mode on public.vf_checkout_attempts(stripe_mode,session_id);
create table public.vf_customer_attempts (
 tenant_id uuid not null references public.vf_tenants,
 stripe_mode text not null check(stripe_mode in ('test','live')),
 attempt_id uuid not null default gen_random_uuid(), created_at timestamptz not null default now(),
 primary key(tenant_id,stripe_mode)
);
alter table public.vf_customer_attempts enable row level security;
revoke all on public.vf_customer_attempts from public,anon,authenticated;
grant all on public.vf_customer_attempts to service_role;
alter table public.vf_webhook_events add column stripe_mode text not null default 'test' check(stripe_mode in ('test','live'));
alter table public.vf_webhook_events add column stripe_account_id text not null default 'legacy-test';
alter table public.vf_webhook_events drop constraint vf_webhook_events_pkey;
alter table public.vf_webhook_events add primary key(stripe_account_id,stripe_mode,event_id);
-- Remove the old unscoped writer; never leave a way to update both modes.
drop function public.vf_record_subscription(text,text,text,text);
create function public.vf_record_subscription(p_event text,p_customer text,p_subscription text,p_status text,p_mode text,p_account text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_mode not in ('test','live') then raise exception 'Invalid billing mode'; end if;
 insert into vf_webhook_events(event_id,stripe_mode,stripe_account_id) values(p_event,p_mode,p_account) on conflict do nothing;
 if not found then return; end if;
 update vf_billing set stripe_subscription_id=p_subscription,subscription_status=p_status,updated_at=now()
 where stripe_customer_id=p_customer and stripe_mode=p_mode and stripe_account_id=p_account;
 if not found then raise exception 'Unknown billing customer'; end if;
end $$;
revoke all on function public.vf_record_subscription(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.vf_record_subscription(text,text,text,text,text,text) to service_role;
