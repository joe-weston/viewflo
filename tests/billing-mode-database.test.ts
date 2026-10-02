import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("actual billing migrations preserve test mappings, isolate modes and retain RLS", async () => {
  const db = new PGlite();
  const tenant = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const user = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values('${user}');`,
    );
    for (const file of [
      "202609060002_tenant_billing.sql",
      "202609060003_commercial_sow.sql",
      "202609060004_contingent_services.sql",
      "202609060005_draft_condition_gate.sql",
    ])
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await db.exec(
      `insert into vf_tenants(id,slug,name) values('${tenant}','tenant-a','A'),('${other}','tenant-b','B'); insert into vf_memberships values('${tenant}','${user}','owner'); insert into vf_billing(tenant_id,stripe_customer_id,stripe_account_id,stripe_price_id,currency,unit_amount,interval,interval_count,commercial_summary) values('${tenant}','cus_same','acct_a','price_test','usd',16900,'month',1,'Synthetic test');`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/202610020001_billing_modes.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query<{ stripe_mode: string }>(
          "select stripe_mode from vf_billing",
        )
      ).rows[0].stripe_mode,
      "test",
    );
    await db.exec(
      `insert into vf_billing(tenant_id,stripe_customer_id,stripe_account_id,stripe_price_id,currency,unit_amount,interval,interval_count,commercial_summary,stripe_mode) values('${tenant}','cus_same','acct_a','price_live','usd',16900,'month',1,'Synthetic live','live'),('${other}','cus_other','acct_a','price_test','usd',16900,'month',1,'Other','test'); insert into vf_checkout_attempts(tenant_id,stripe_mode) values('${tenant}','test'),('${tenant}','live');`,
    );
    await Promise.all(
      Array.from({ length: 4 }, () =>
        db.query(
          "insert into vf_customer_attempts(tenant_id,stripe_mode) values($1,'test') on conflict do nothing",
          [tenant],
        ),
      ),
    );
    const attempt = (
      await db.query("select attempt_id from vf_customer_attempts")
    ).rows[0];
    await db.query(
      "insert into vf_customer_attempts(tenant_id,stripe_mode) values($1,'test') on conflict do nothing",
      [tenant],
    );
    assert.deepEqual(
      (await db.query("select attempt_id from vf_customer_attempts")).rows,
      [attempt],
    );
    await db.query(
      "insert into vf_customer_attempts(tenant_id,stripe_mode) values($1,'live')",
      [tenant],
    );
    assert.equal(
      (await db.query("select * from vf_customer_attempts")).rows.length,
      2,
    );
    const record = (mode: string, account = "acct_a") =>
      db.query(
        "select vf_record_subscription('evt_same','cus_same',$1,'active',$2,$3)",
        [`sub_${mode}`, mode, account],
      );
    await record("test");
    await record("live");
    await record("test");
    assert.equal(
      (await db.query("select * from vf_webhook_events")).rows.length,
      2,
    );
    assert.deepEqual(
      (
        await db.query(
          "select stripe_mode,stripe_subscription_id from vf_billing where tenant_id=$1 order by stripe_mode",
          [tenant],
        )
      ).rows,
      [
        { stripe_mode: "live", stripe_subscription_id: "sub_live" },
        { stripe_mode: "test", stripe_subscription_id: "sub_test" },
      ],
    );
    await assert.rejects(record("test", "acct_wrong"));
    await assert.rejects(record("invalid"));
    assert.equal(
      (await db.query("select * from vf_webhook_events")).rows.length,
      2,
    ); // failed writes roll back receipts
    await db.exec(
      `set request.jwt.claim.sub='${user}'; set role authenticated;`,
    );
    assert.equal((await db.query("select * from vf_billing")).rows.length, 2);
    await assert.rejects(record("test"));
    await assert.rejects(db.exec("update vf_billing set stripe_mode='live'"));
    await assert.rejects(db.query("select * from vf_checkout_attempts"));
    await assert.rejects(db.query("select * from vf_customer_attempts"));
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from vf_billing"));
  } finally {
    await db.close();
  }
});
