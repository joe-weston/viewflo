import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("scoped migration preserves history, authorizes owners, isolates claims and delivers independent audiences", async () => {
  const db = new PGlite();
  const tenant = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    owner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const stage = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    prod = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    historic = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create table vf_tenants(id uuid primary key,slug text); create table vf_memberships(tenant_id uuid,user_id uuid,role text); insert into vf_tenants values('${tenant}','pasadena-shades-and-shutters'); insert into auth.users values('${owner}','owner@example.invalid',now()); insert into vf_memberships values('${tenant}','${owner}','owner');`,
    );
    await db.exec(
      readFileSync("supabase/migrations/202609300001_lead_intake.sql", "utf8"),
    );
    await db.exec(
      `insert into vf_tenant_email_settings values('${tenant}','Pasadena Shades & Shutters','notifications@pasadenashadesandshutters.com','owner@example.invalid',array['obsolete@example.invalid'],true); insert into vf_leads(id,tenant_id,kind,name,email,details,source_path,consent_at,fingerprint) values('${historic}','${tenant}','consultation','Historical','historic@example.invalid','{"budget":"Historical answer"}','/consultation',now(),'${"a".repeat(64)}');`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/202610020002_lead_environment.sql",
        "utf8",
      ),
    );
    const input = (id: string) => ({
      id,
      kind: "consultation",
      name: "QA",
      email: "visitor@example.invalid",
      phone: "8185550100",
      notes: "Synthetic",
      details: { projectTypes: ["shutters"], budget: "Old client answer" },
      sourcePath: "/consultation",
      consentAt: new Date().toISOString(),
      fingerprint: "b".repeat(64),
    });
    const create = (
      environment: string,
      id: string,
      recipients = ["owner@example.invalid"],
    ) =>
      db.query(
        "select vf_create_lead_scoped($1,$2::text[],$3,$4,$5,$6::jsonb,'[]'::jsonb)",
        [
          environment,
          recipients,
          "owner@example.invalid",
          `https://stage.example.invalid/pasadena-shades-and-shutters/admin/leads/${id}/`,
          "pasadena-shades-and-shutters",
          JSON.stringify(input(id)),
        ],
      );
    await assert.rejects(
      create("staging", stage, ["arbitrary@example.invalid"]),
    );
    await create("staging", stage);
    await create("staging", stage);
    await assert.rejects(create("production", stage));
    await create("production", prod);
    const old = (
      await db.query<{
        environment: string | null;
        details: { budget: string };
      }>("select environment,details from vf_leads where id=$1", [historic])
    ).rows[0];
    assert.equal(old.environment, null);
    assert.equal(old.details.budget, "Historical answer");
    const rows = (
      await db.query<{
        environment: string;
        recipient: string;
        audience: string;
        payload: { details: { budget?: string } };
      }>(
        "select environment,recipient,audience,payload from vf_lead_email_outbox",
      )
    ).rows;
    assert.equal(rows.length, 4);
    assert.ok(
      rows
        .filter((r) => r.environment === "staging")
        .every((r) => r.recipient === "jocduplbot@gmail.com"),
    );
    assert.deepEqual(
      rows
        .filter((r) => r.environment === "production")
        .map((r) => r.recipient)
        .sort(),
      ["owner@example.invalid", "visitor@example.invalid"],
    );
    assert.ok(rows.every((r) => !r.payload.details.budget));
    type Job = {
      id: string;
      claim_token: string;
      environment: string;
      audience: string;
    };
    const jobs = (
      await db.query<Job>(
        "select * from vf_claim_lead_email_scoped('staging',null,6)",
      )
    ).rows;
    assert.equal(jobs.length, 2);
    assert.ok(jobs.every((r) => r.environment === "staging"));
    await assert.rejects(
      db.query(
        "select vf_finish_lead_email_scoped('production',$1,$2,'id',null)",
        [jobs[0].id, jobs[0].claim_token],
      ),
    );
    await db.query(
      "select vf_finish_lead_email_scoped('staging',$1,$2,'sent',null)",
      [jobs[0].id, jobs[0].claim_token],
    );
    await db.query(
      "select vf_finish_lead_email_scoped('staging',$1,$2,null,'provider_unavailable')",
      [jobs[1].id, jobs[1].claim_token],
    );
    await db.exec(
      "update vf_lead_email_outbox set next_attempt_at=now() where status='pending'",
    );
    const retry = (
      await db.query<Job>(
        "select * from vf_claim_lead_email_scoped('staging',null,6)",
      )
    ).rows;
    assert.equal(retry.length, 1);
    assert.equal(retry[0].id, jobs[1].id);
    assert.equal(
      (
        await db.query(
          "select * from vf_claim_lead_email_scoped('production',null,6)",
        )
      ).rows.length,
      2,
    );
    await db.exec("set role service_role");
    await assert.rejects(db.query("select * from vf_claim_lead_email(null,6)"));
    await db.exec("reset role;set role anon");
    await assert.rejects(create("staging", stage));
  } finally {
    await db.close();
  }
});
