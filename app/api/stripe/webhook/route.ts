import { stripeClient } from "../../../../lib/billing";
import {
  billingConfig,
  assertMode,
  assertCustomer,
  assertSubscription,
} from "../../../../lib/billing-mode";
import { operatorDb } from "../../../../lib/portal";
import { verifyBillingEvent } from "../../../../lib/billing-webhook";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  let config, stripe, event;
  try {
    config = billingConfig();
    stripe = stripeClient();
    event = verifyBillingEvent(await request.text(), signature, config);
  } catch {
    return new Response("Invalid billing event", { status: 400 });
  }
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return new Response("Ignored");
  try {
    const account = await stripe.accounts.retrieve(null);
    if (account.id !== config.account) throw new Error("Account mismatch");
    const object = event.data.object as { id: string };
    const subscription = await stripe.subscriptions.retrieve(object.id);
    assertMode(subscription, config.mode);
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const db = operatorDb();
    const { data: mapping, error: mappingError } = await db
      .from("vf_billing")
      .select("tenant_id,stripe_account_id,stripe_price_id")
      .eq("stripe_customer_id", customer)
      .eq("stripe_mode", config.mode)
      .eq("stripe_account_id", account.id)
      .maybeSingle();
    if (mappingError || !mapping) throw new Error("Unknown customer");
    assertCustomer(
      await stripe.customers.retrieve(customer),
      customer,
      mapping.tenant_id,
      config.mode,
    );
    const expected = {
      mode: config.mode,
      customer,
      tenant: mapping.tenant_id,
      price: mapping.stripe_price_id,
    };
    assertSubscription(subscription, expected);
    // Refresh current provider state; delayed payloads never declare payment success.
    const subscriptions = await stripe.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
    });
    if (subscriptions.has_more)
      throw new Error("Subscription reconciliation required");
    for (const item of subscriptions.data) assertSubscription(item, expected);
    const active = subscriptions.data.filter(
      (s) => !["canceled", "incomplete_expired"].includes(s.status),
    );
    if (active.length > 1)
      throw new Error("Multiple subscriptions need reconciliation");
    const current =
      active[0] ??
      subscriptions.data.sort((a, b) => b.created - a.created)[0] ??
      subscription;
    const { error } = await db.rpc("vf_record_subscription", {
      p_event: event.id,
      p_customer: customer,
      p_subscription: current.id,
      p_status: current.status,
      p_mode: config.mode,
      p_account: account.id,
    });
    if (error) throw error;
    return new Response("Received");
  } catch {
    return new Response("Retry later", { status: 500 });
  }
}
