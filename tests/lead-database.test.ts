import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const tenant = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const lead = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  kind: "consultation",
  name: "QA",
  email: "qa@example.invalid",
  phone: "818-555-0100",
  notes: "Synthetic only",
  details: {},
  sourcePath: "/consultation",
  consentAt: "2026-09-30T12:00:00Z",
  fingerprint: "a".repeat(64),
};
test("migration, atomic receipt/outbox, snapshots, authorization, and retry claims", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table vf_tenants(id uuid primary key,slug text unique,name text); insert into vf_tenants values('${tenant}','pasadena-shades-and-shutters','Pasadena'),('${other}','other-tenant','Other');`,
    );
    await db.exec(
      readFileSync("supabase/migrations/202609300001_lead_intake.sql", "utf8"),
    );
    const create = (
      slug = "pasadena-shades-and-shutters",
      input = lead,
      photos: object[] = [],
    ) =>
      db.query("select vf_create_lead($1,$2::jsonb,$3::jsonb)", [
        slug,
        JSON.stringify(input),
        JSON.stringify(photos),
      ]);
    await assert.rejects(create()); // Unconfigured tenant fails before persistence.
    assert.equal((await db.query("select * from vf_leads")).rows.length, 0);
    await db.exec(
      `insert into vf_tenant_email_settings values('${tenant}','Pasadena','leads@mail.example.invalid','office@example.invalid',array['manager@example.invalid','manager@example.invalid'],true);`,
    );
    await create();
    await create();
    assert.equal((await db.query("select * from vf_leads")).rows.length, 1);
    assert.equal(
      (await db.query("select * from vf_lead_email_outbox")).rows.length,
      2,
    );
    await assert.rejects(create("other-tenant"));
    await assert.rejects(
      create(undefined, { ...lead, fingerprint: "b".repeat(64) }),
    );
    await db.exec(
      "update vf_tenant_email_settings set manager_recipients=array['different@example.invalid']",
    );
    assert.equal(
      (
        await db.query<{ recipient: string }>(
          "select recipient from vf_lead_email_outbox where audience='manager'",
        )
      ).rows[0].recipient,
      "manager@example.invalid",
    );
    // Both public roles lack privileges on every table and function, even tenant members.
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      for (const table of [
        "vf_leads",
        "vf_lead_photos",
        "vf_lead_email_outbox",
        "vf_tenant_email_settings",
      ])
        await assert.rejects(db.query(`select * from ${table}`));
      await assert.rejects(create());
      await assert.rejects(
        db.query("select * from vf_claim_lead_email(null,5)"),
      );
      await db.exec("reset role");
    }
    type Claimed = { id: string; claim_token: string; attempts: number };
    const claimed = (
      await db.query<Claimed>("select * from vf_claim_lead_email(null,1)")
    ).rows;
    const second = (
      await db.query<Claimed>("select * from vf_claim_lead_email(null,6)")
    ).rows;
    assert.equal(claimed.length, 1);
    assert.equal(second.length, 1);
    assert.notEqual(claimed[0].id, second[0].id);
    assert.equal(
      (await db.query("select * from vf_claim_lead_email(null,6)")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "select vf_finish_lead_email($1,$2,null,'provider_unavailable')",
        [claimed[0].id, other],
      ),
    );
    await db.query("select vf_finish_lead_email($1,$2,'resend-id',null)", [
      second[0].id,
      second[0].claim_token,
    ]);
    await db.query(
      "select vf_finish_lead_email($1,$2,null,'provider_unavailable')",
      [claimed[0].id, claimed[0].claim_token],
    );
    const pending = (
      await db.query<{ status: string; delay: number }>(
        "select status,extract(epoch from next_attempt_at-first_attempt_at)::int as delay from vf_lead_email_outbox where id=$1",
        [claimed[0].id],
      )
    ).rows[0];
    assert.equal(pending.status, "pending");
    assert.equal(pending.delay, 300);
    await db.query(
      "update vf_lead_email_outbox set next_attempt_at=now()-interval '1 minute' where id=$1",
      [claimed[0].id],
    );
    const retried = (
      await db.query<Claimed>("select * from vf_claim_lead_email(null,6)")
    ).rows[0];
    assert.equal(retried.attempts, 2);
    assert.notEqual(retried.claim_token, claimed[0].claim_token);
    let active = retried;
    for (const delay of [1800, 7200, 43200, 86400]) {
      await db.query(
        "select vf_finish_lead_email($1,$2,null,'provider_unavailable')",
        [active.id, active.claim_token],
      );
      const row = (
        await db.query<{ delay: number }>(
          "select extract(epoch from next_attempt_at-first_attempt_at)::int as delay from vf_lead_email_outbox where id=$1",
          [active.id],
        )
      ).rows[0];
      assert.equal(row.delay, delay);
      await db.query(
        "update vf_lead_email_outbox set next_attempt_at=now()-interval '1 minute' where id=$1",
        [active.id],
      );
      active = (
        await db.query<Claimed>("select * from vf_claim_lead_email(null,6)")
      ).rows[0];
    }
    assert.equal(active.attempts, 6);
    await db.query(
      "update vf_lead_email_outbox set locked_until=now()-interval '1 minute',first_attempt_at=now()-interval '25 hours' where id=$1",
      [claimed[0].id],
    );
    assert.equal(
      (await db.query("select * from vf_claim_lead_email(null,6)")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ status: string; error_category: string }>(
          "select status,error_category from vf_lead_email_outbox where id=$1",
          [claimed[0].id],
        )
      ).rows[0].error_category,
      "reconciliation_required",
    );
    // A failed photo insert must roll back lead and email rows as one transaction.
    await assert.rejects(
      create(
        undefined,
        {
          ...lead,
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          kind: "photo_intake",
        },
        [
          {
            sequence: 1,
            storage_path: "another-tenant/photo.jpg",
            size_bytes: 10,
          },
        ],
      ),
    );
    assert.equal((await db.query("select * from vf_leads")).rows.length, 1);
  } finally {
    await db.close();
  }
});
