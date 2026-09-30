import { stripeClient } from "../../../../lib/billing";
import { operatorDb } from "../../../../lib/portal";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature)
    return new Response("Unavailable", { status: 400 });
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode)
    return new Response("Test mode required", { status: 400 });
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return new Response("Ignored");
  try {
    const object = event.data.object as { id: string; customer: string };
    const stripe = stripeClient();
    const account = await stripe.accounts.retrieve(null);
    if (account.id !== process.env.STRIPE_EXPECTED_ACCOUNT_ID)
      throw new Error("Account mismatch");
    // Retrieve current state: delayed/reordered payloads do not overwrite newer provider status.
    const subscription = await stripe.subscriptions.retrieve(object.id);
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const db = operatorDb();
    const { data: mapping } = await db
      .from("vf_billing")
      .select("stripe_account_id")
      .eq("stripe_customer_id", customer)
      .maybeSingle();
    if (!mapping || mapping.stripe_account_id !== account.id)
      throw new Error("Unknown customer");
    const subscriptions = await stripe.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
    });
    if (subscriptions.has_more)
      throw new Error("Subscription reconciliation required");
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
    });
    if (error) throw error;
    return new Response("Received");
  } catch {
    return new Response("Retry later", { status: 500 });
  }
}
