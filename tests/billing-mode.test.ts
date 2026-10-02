import test from "node:test";
import assert from "node:assert/strict";
import {
  billingConfig,
  assertMode,
  assertCustomer,
  assertSubscription,
} from "../lib/billing-mode";
test("default configuration is test only; live needs explicit gate and distinct credentials", () => {
  const env = {
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_EXPECTED_ACCOUNT_ID: "acct_fixture",
  };
  assert.equal(billingConfig(env).mode, "test");
  assert.throws(() => billingConfig({ ...env, STRIPE_MODE: "live" }));
  assert.throws(() =>
    billingConfig({
      ...env,
      STRIPE_MODE: "live",
      STRIPE_LIVE_BILLING_ENABLED: "true",
    }),
  );
  assert.throws(() =>
    billingConfig({ ...env, STRIPE_SECRET_KEY: "sk_live_fixture" }),
  );
  assert.throws(() => billingConfig({ ...env, STRIPE_MODE: "typo" }));
  const live = {
    ...env,
    STRIPE_MODE: "live",
    STRIPE_LIVE_BILLING_ENABLED: "true",
    STRIPE_LIVE_SECRET_KEY: "sk_live_fixture",
    STRIPE_LIVE_EXPECTED_ACCOUNT_ID: "acct_live",
  };
  assert.equal(billingConfig(live).account, "acct_live");
  assert.throws(() =>
    billingConfig({ ...live, STRIPE_LIVE_SECRET_KEY: "sk_test_fixture" }),
  );
});
test("customer requires matching tenant, mode and provider identity", () => {
  const c = {
    id: "cus_a",
    livemode: false,
    metadata: { tenant_id: "tenant_a" },
  };
  assertCustomer(c, "cus_a", "tenant_a", "test");
  for (const wrong of [
    { ...c, deleted: true },
    { ...c, livemode: true },
    { ...c, id: "cus_b" },
    { ...c, metadata: { tenant_id: "tenant_b" } },
  ])
    assert.throws(() => assertCustomer(wrong, "cus_a", "tenant_a", "test"));
  assert.throws(() => assertMode(c, "live"));
});
test("subscription validates tenant/customer ownership, one hosting price and mode", () => {
  const price = {
    id: "price_host",
    livemode: true,
    unit_amount: 16900,
    currency: "usd",
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  };
  const s = {
    customer: "cus_a",
    livemode: true,
    metadata: { tenant_id: "tenant_a" },
    items: { has_more: false, data: [{ quantity: 1, price }] },
  };
  const e = {
    mode: "live" as const,
    tenant: "tenant_a",
    customer: "cus_a",
    price: "price_host",
  };
  assertSubscription(s, e);
  for (const wrong of [
    { ...s, livemode: false },
    { ...s, customer: "cus_b" },
    { ...s, metadata: { tenant_id: "other" } },
    { ...s, items: { has_more: true, data: s.items.data } },
    {
      ...s,
      items: {
        has_more: false,
        data: [{ quantity: 1, price: { ...price, unit_amount: 400000 } }],
      },
    },
    { ...s, items: { has_more: false, data: [{ quantity: 2, price }] } },
  ])
    assert.throws(() => assertSubscription(wrong, e));
});
