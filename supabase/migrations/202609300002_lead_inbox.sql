-- Prepared only; depends on 202609300001_lead_intake.sql. No deployment/application authorized.
grant select on public.vf_leads, public.vf_lead_photos to authenticated;
grant update(status) on public.vf_leads to authenticated;
create policy lead_owner_read on public.vf_leads for select to authenticated
using (exists(select 1 from public.vf_memberships m where m.tenant_id=vf_leads.tenant_id and m.user_id=auth.uid() and m.role='owner'));
create policy lead_owner_status on public.vf_leads for update to authenticated
using (exists(select 1 from public.vf_memberships m where m.tenant_id=vf_leads.tenant_id and m.user_id=auth.uid() and m.role='owner'))
with check (exists(select 1 from public.vf_memberships m where m.tenant_id=vf_leads.tenant_id and m.user_id=auth.uid() and m.role='owner'));
create policy lead_photo_owner on public.vf_lead_photos for select to authenticated
using (exists(select 1 from public.vf_memberships m where m.tenant_id=vf_lead_photos.tenant_id and m.user_id=auth.uid() and m.role='owner'));
create policy lead_storage_owner on storage.objects for select to authenticated
using (bucket_id='vf-lead-photos' and exists(
 select 1 from public.vf_lead_photos p join public.vf_memberships m on m.tenant_id=p.tenant_id
 where p.storage_path=storage.objects.name and m.user_id=auth.uid() and m.role='owner'
));
