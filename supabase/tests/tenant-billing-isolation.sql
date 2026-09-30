-- Run only against the approved disposable test project after migrations.
-- Transaction rolls back every synthetic record; never use production.
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.vf_tenants(id,slug,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa-one','Synthetic One'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','qa-two','Synthetic Two');
insert into public.vf_memberships values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
insert into public.vf_documents(id,kind,version,title,body,sha256,published_at) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','terms','qa-only','Synthetic terms','Test text',encode(sha256(convert_to('Test text','UTF8')),'hex'),now()),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','privacy','qa-only','Synthetic privacy','Test text',encode(sha256(convert_to('Test text','UTF8')),'hex'),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.vf_tenants)<>1 then raise exception 'Tenant isolation failed'; end if;
 if exists(select 1 from public.vf_tenants where slug='qa-two') then raise exception 'Other tenant leaked'; end if;
 begin
  perform public.vf_accept_document('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  raise exception 'Expected cross-tenant rejection';
 exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
 begin
  perform public.vf_accept_document('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  raise exception 'Expected terms prerequisite';
 exception when raise_exception then if sqlerrm<>'Terms required first' then raise; end if; end;
end $$;
select public.vf_accept_document('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select public.vf_accept_document('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select public.vf_accept_document('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
do $$ begin
 if (select count(*) from public.vf_acceptances)<>2 then raise exception 'Acceptance idempotence failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.vf_acceptances) then raise exception 'Acceptance records leaked'; end if;
end $$;
reset role;
rollback;
