import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("inbox RLS limits reads, status changes and private photos to the tenant owner",async()=>{
 const db=new PGlite();
 const a="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",b="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
 const owner="11111111-1111-4111-8111-111111111111",member="22222222-2222-4222-8222-222222222222",foreign="33333333-3333-4333-8333-333333333333";
 const idA="cccccccc-cccc-4ccc-8ccc-cccccccccccc",idB="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create schema storage;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth,storage to authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key,bucket_id text,name text);alter table storage.objects enable row level security;grant select on storage.objects to authenticated;
   create table vf_tenants(id uuid primary key,slug text unique,name text);
   create table vf_memberships(tenant_id uuid,user_id uuid,role text);alter table vf_memberships enable row level security;
   create policy membership_self on vf_memberships for select to authenticated using(user_id=auth.uid());grant select on vf_memberships to authenticated;
   insert into vf_tenants values('${a}','pasadena-shades-and-shutters','Pasadena'),('${b}','other','Other');
   insert into vf_memberships values('${a}','${owner}','owner'),('${a}','${member}','member'),('${b}','${foreign}','owner');`);
  await db.exec(readFileSync("supabase/migrations/202609300001_lead_intake.sql","utf8"));
  await db.exec(readFileSync("supabase/migrations/202609300002_lead_inbox.sql","utf8"));
  for(const [tenant,id]of [[a,idA],[b,idB]]){
   await db.query("insert into vf_leads(id,tenant_id,kind,name,email,details,source_path,consent_at,fingerprint) values($1,$2,'photo_intake','Synthetic','qa@example.invalid','{}','/send-photos',now(),$3)",[id,tenant,"a".repeat(64)]);
   await db.query("insert into vf_lead_photos(lead_id,tenant_id,sequence,storage_path,size_bytes)values($1,$2,1,$3,100)",[id,tenant,tenant+"/"+id+"/photo.jpg"]);
   await db.query("insert into storage.objects values($1,'vf-lead-photos',$2)",[id,tenant+"/"+id+"/photo.jpg"]);
  }
  async function asUser(uid:string){await db.exec("reset role;set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);}
  await asUser(owner);
  assert.equal((await db.query("select * from vf_leads")).rows.length,1);
  assert.equal((await db.query("select * from vf_lead_photos")).rows.length,1);
  assert.equal((await db.query("select * from storage.objects")).rows.length,1);
  assert.equal((await db.query("update vf_leads set status='contacted' where id=$1 returning id",[idA])).rows.length,1);
  assert.equal((await db.query("update vf_leads set status='closed' where id=$1 returning id",[idB])).rows.length,0);
  await assert.rejects(db.query("update vf_leads set email='changed@example.invalid'"));
  await assert.rejects(db.query("select * from vf_lead_email_outbox"));
  await asUser(member);
  for(const table of ["vf_leads","vf_lead_photos","storage.objects"])assert.equal((await db.query("select * from "+table)).rows.length,0);
  await asUser(foreign);
  assert.equal((await db.query<{id:string}>("select id from vf_leads")).rows[0].id,idB);
  await db.exec("reset role;set role anon");await assert.rejects(db.query("select * from vf_leads"));
 }finally{await db.close();}
});
