import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { verifyBillingEvent } from "../lib/billing-webhook";
test("signed webhooks reject tampering, wrong secrets, stale signatures, cross-mode and foreign accounts", () => {
  const secret = "whsec_synthetic_fixture";
  const config = {
    mode: "test" as const,
    key: "sk_test_fixture",
    account: "acct_a",
    webhookSecret: secret,
    portalConfiguration: undefined,
  };
  const payload = (livemode = false, account?: string) =>
    JSON.stringify({
      id: "evt_fixture",
      object: "event",
      type: "customer.subscription.updated",
      livemode,
      account,
      data: { object: { id: "sub_fixture" } },
    });
  const header = (body: string, timestamp?: number) =>
    Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret,
      ...(timestamp ? { timestamp } : {}),
    });
  const body = payload();
  assert.equal(
    verifyBillingEvent(body, header(body), config).id,
    "evt_fixture",
  );
  assert.throws(() => verifyBillingEvent(body + " ", header(body), config));
  assert.throws(() =>
    verifyBillingEvent(body, header(body), {
      ...config,
      webhookSecret: "whsec_wrong",
    }),
  );
  assert.throws(() => verifyBillingEvent(body, header(body, 1), config));
  assert.throws(() => verifyBillingEvent(body, null, config));
  const live = payload(true);
  assert.throws(() => verifyBillingEvent(live, header(live), config));
  assert.equal(
    verifyBillingEvent(live, header(live), { ...config, mode: "live" })
      .livemode,
    true,
  );
  const foreign = payload(false, "acct_b");
  assert.throws(() => verifyBillingEvent(foreign, header(foreign), config));
});
