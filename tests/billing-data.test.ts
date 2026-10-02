import test from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { readBillingSnapshot, billingDate, money } from "../lib/billing-data";

function provider(
  overrides: {
    status?: string;
    cancel?: boolean;
    customer?: string;
    live?: boolean;
    draft?: boolean;
    cursorCustomer?: string;
    multiple?: boolean;
    hasMoreSubscriptions?: boolean;
    subscriptionLive?: boolean;
    priceLive?: boolean;
    collection?: string;
  } = {},
) {
  const customer = overrides.customer ?? "cus_site";
  const invoice = {
    id: "in_new",
    customer,
    livemode: overrides.live ?? false,
    number: "VF-1001",
    created: 1760000000,
    total: 16900,
    amount_paid: 16900,
    currency: "usd",
    status: overrides.draft ? "draft" : "paid",
    status_transitions: { paid_at: 1760000010 },
    due_date: null,
    hosted_invoice_url: "https://invoice.stripe.com/i/test",
    invoice_pdf: "https://evil.test/invoice.pdf",
    next_payment_attempt: 1760000100,
  };
  const subscription = {
    id: "sub_site",
    customer,
    livemode: overrides.subscriptionLive ?? false,
    metadata: { tenant_id: "tenant_site" },
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancel ?? false,
    cancel_at: null,
    collection_method: overrides.collection ?? "charge_automatically",
    latest_invoice: "in_new",
    items: {
      has_more: false,
      data: [
        {
          quantity: 1,
          current_period_end: 1765000000,
          price: {
            id: "price_site",
            unit_amount: 16900,
            currency: "usd",
            livemode: overrides.priceLive ?? false,
            recurring: {
              interval: "month",
              interval_count: 1,
              usage_type: "licensed",
            },
          },
        },
      ],
    },
  };
  const calls: unknown[] = [];
  const stripe = {
    subscriptions: {
      list: async (args: unknown) => {
        calls.push(args);
        return {
          data: overrides.multiple
            ? [subscription, subscription]
            : [subscription],
          has_more: overrides.hasMoreSubscriptions ?? false,
        };
      },
    },
    invoices: {
      list: async (args: unknown) => {
        calls.push(args);
        return { data: [invoice], has_more: true };
      },
      retrieve: async (id: string) => ({
        ...invoice,
        id,
        customer:
          id === "in_cursor"
            ? (overrides.cursorCustomer ?? customer)
            : customer,
      }),
    },
  } as unknown as Stripe;
  return { stripe, calls };
}
test("billing reads tenant-scoped subscriptions and invoices with real amounts/dates", async () => {
  const { stripe, calls } = provider();
  const result = await readBillingSnapshot(stripe, "cus_site");
  assert.equal(result.amount, 16900);
  assert.equal(result.nextBillingAt, 1765000000);
  assert.equal(result.paymentAttemptAt, 1760000100);
  assert.equal(result.invoices[0].paid, 16900);
  assert.equal(result.invoices[0].pdf, null);
  assert.equal(result.nextCursor, "in_new");
  assert.deepEqual(calls, [
    { customer: "cus_site", status: "all", limit: 100 },
    { customer: "cus_site", limit: 10 },
  ]);
});

test("live history uses live subscriptions, prices and invoices only; send-invoice renewal is visible", async () => {
  const p = provider({
    live: true,
    subscriptionLive: true,
    priceLive: true,
    collection: "send_invoice",
  });
  const result = await readBillingSnapshot(
    p.stripe,
    "cus_site",
    undefined,
    "live",
    { tenant: "tenant_site", price: "price_site" },
  );
  assert.equal(result.nextBillingAt, 1765000000);
  assert.equal(result.invoices.length, 1);
  await assert.rejects(
    readBillingSnapshot(provider().stripe, "cus_site", undefined, "live"),
  );
  await assert.rejects(
    readBillingSnapshot(p.stripe, "cus_site", undefined, "test"),
  );
  await assert.rejects(
    readBillingSnapshot(p.stripe, "cus_site", undefined, "live", {
      tenant: "other",
      price: "price_site",
    }),
  );
  await assert.rejects(
    readBillingSnapshot(p.stripe, "cus_site", undefined, "live", {
      tenant: "tenant_site",
      price: "price_services",
    }),
  );
  await assert.rejects(
    readBillingSnapshot(
      provider({ live: true, subscriptionLive: true }).stripe,
      "cus_site",
      undefined,
      "live",
    ),
  );
});
test("scheduled cancellation shows service end rather than a next charge", async () => {
  const result = await readBillingSnapshot(
    provider({ cancel: true }).stripe,
    "cus_site",
  );
  assert.equal(result.nextBillingAt, null);
  assert.equal(result.endsAt, 1765000000);
});
test("past-due subscriptions expose retry separately rather than inventing a billing date", async () => {
  const result = await readBillingSnapshot(
    provider({ status: "past_due" }).stripe,
    "cus_site",
  );
  assert.equal(result.status, "past due");
  assert.equal(result.nextBillingAt, null);
  assert.equal(result.paymentAttemptAt, 1760000100);
});
test("invoice cursors require same-customer test-mode ownership before pagination", async () => {
  await assert.rejects(
    readBillingSnapshot(
      provider({ cursorCustomer: "cus_other" }).stripe,
      "cus_site",
      "in_cursor",
    ),
  );
  const { stripe, calls } = provider();
  await readBillingSnapshot(stripe, "cus_site", "in_cursor");
  assert.deepEqual(calls[1], {
    customer: "cus_site",
    limit: 10,
    starting_after: "in_cursor",
  });
});
test("foreign customer data, live invoices and ambiguous subscriptions fail closed", async () => {
  for (const option of [
    { customer: "cus_other" },
    { live: true },
    { multiple: true },
    { hasMoreSubscriptions: true },
  ])
    await assert.rejects(
      readBillingSnapshot(provider(option).stripe, "cus_site"),
    );
});
test("draft invoices are excluded and a missing customer performs no Stripe reads", async () => {
  assert.equal(
    (await readBillingSnapshot(provider({ draft: true }).stripe, "cus_site"))
      .invoices.length,
    0,
  );
  const { stripe, calls } = provider();
  const result = await readBillingSnapshot(stripe, null);
  assert.equal(result.status, "No subscription");
  assert.equal(result.canManage, false);
  assert.equal(calls.length, 0);
  await assert.rejects(readBillingSnapshot(stripe, null, "in_cursor"));
});
test("invoice dates/currencies are formatted explicitly without fabricating absent dates", () => {
  assert.equal(money(16900, "usd"), "$169.00");
  assert.equal(money(1000, "jpy"), "¥1,000");
  assert.equal(billingDate(null), "Not scheduled");
});
