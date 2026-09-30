import "server-only";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { isHostingPrice } from "./commercial-policy";
import { allAccepted, billingRole, requireTestKey } from "./portal-policy";
import { agreements, operatorDb, tenantContext } from "./portal";
import { requestPortal } from "./portal-request";
import { billingPath } from "./portal-urls";
export function stripeClient() {
  return new Stripe(requireTestKey(process.env.STRIPE_SECRET_KEY));
}
export async function billingContext(slug: string, requireAcceptance = true) {
  const ctx = await tenantContext(slug);
  if (!ctx || !billingRole(ctx.role)) throw new Error("Billing unavailable");
  const { data: billing, error } = await ctx.db
    .from("vf_billing")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (
    error ||
    !billing?.approved_at ||
    !billing.commercial_summary ||
    !billing.provider_identity_verified_at
  )
    throw new Error("Billing configuration awaiting review");
  if (
    requireAcceptance &&
    (!billing.hosting_start_approved_at ||
      !billing.invoice_cutoff_policy ||
      !billing.cancellation_policy_approved_at)
  )
    throw new Error("Hosting start and cancellation timing need review");
  if (requireAcceptance) {
    const docs = await agreements(ctx.db);
    const { data: accepted, error: acceptError } = await ctx.db
      .from("vf_acceptances")
      .select("document_id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("user_id", ctx.user.id);
    if (
      acceptError ||
      !allAccepted(
        docs,
        (accepted ?? []).map((a) => a.document_id),
      )
    )
      throw new Error("Review current agreements first");
  }
  const stripe = stripeClient();
  const account = await stripe.accounts.retrieve(null);
  if (
    account.id !== billing.stripe_account_id ||
    account.id !== process.env.STRIPE_EXPECTED_ACCOUNT_ID
  )
    throw new Error("Payment account not verified");
  return { ...ctx, billing, stripe };
}
export async function checkout(slug: string) {
  const ctx = await billingContext(slug);
  const { billing, stripe } = ctx;
  const price = await stripe.prices.retrieve(billing.stripe_price_id);
  if (
    price.livemode ||
    !isHostingPrice(price) ||
    !price.active ||
    price.type !== "recurring" ||
    price.unit_amount !== billing.unit_amount ||
    price.currency !== billing.currency ||
    price.recurring?.interval !== billing.interval ||
    price.recurring?.interval_count !== billing.interval_count ||
    price.recurring?.usage_type !== "licensed"
  )
    throw new Error("Price needs review");
  const admin = operatorDb();
  let customer = billing.stripe_customer_id as string | null;
  if (!customer) {
    // Stable across retries and concurrent requests; mapping is never client-supplied.
    const created = await stripe.customers.create(
      { metadata: { tenant_id: ctx.tenant.id } },
      { idempotencyKey: `vf-customer-${ctx.tenant.id}` },
    );
    const { error } = await admin
      .from("vf_billing")
      .update({ stripe_customer_id: created.id })
      .eq("tenant_id", ctx.tenant.id)
      .is("stripe_customer_id", null);
    if (error) throw new Error("Could not save billing account");
    const { data: stored, error: readError } = await admin
      .from("vf_billing")
      .select("stripe_customer_id")
      .eq("tenant_id", ctx.tenant.id)
      .single();
    if (readError || !stored?.stripe_customer_id)
      throw new Error("Could not read billing account");
    customer = stored.stripe_customer_id;
  }
  if (!customer) throw new Error("Billing unavailable");
  const subscriptions = await stripe.subscriptions.list({
    customer,
    status: "all",
    limit: 100,
  });
  if (
    subscriptions.has_more ||
    subscriptions.data.some(
      (s) => !["canceled", "incomplete_expired"].includes(s.status),
    )
  )
    throw new Error("Manage your existing subscription in Billing");
  const pending = await stripe.checkout.sessions.list({
    customer,
    status: "open",
    limit: 100,
  });
  if (pending.has_more) throw new Error("Billing needs review");
  const existing = pending.data.find((s) => s.mode === "subscription");
  if (existing?.url) {
    const lines = await stripe.checkout.sessions.listLineItems(existing.id);
    if (
      existing.livemode ||
      existing.client_reference_id !== ctx.tenant.id ||
      lines.has_more ||
      lines.data.length !== 1 ||
      lines.data[0].price?.id !== price.id ||
      lines.data[0].quantity !== 1
    )
      throw new Error("Existing checkout needs reconciliation");
    return existing.url;
  }
  const { error: insertError } = await admin
    .from("vf_checkout_attempts")
    .upsert(
      { tenant_id: ctx.tenant.id },
      { onConflict: "tenant_id", ignoreDuplicates: true },
    );
  if (insertError) throw new Error("Checkout unavailable");
  let { data: attempt, error: attemptError } = await admin
    .from("vf_checkout_attempts")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .single();
  if (attemptError || !attempt) throw new Error("Checkout unavailable");
  if (attempt.session_id) {
    const previous = await stripe.checkout.sessions.retrieve(
      attempt.session_id,
    );
    if (previous.status === "open")
      throw new Error("Checkout needs reconciliation");
    if (previous.status !== "expired")
      throw new Error("Payment is processing; check billing status");
    const { error: rotateError } = await admin
      .from("vf_checkout_attempts")
      .update({
        attempt_id: randomUUID(),
        created_at: new Date().toISOString(),
        session_id: null,
      })
      .eq("tenant_id", ctx.tenant.id)
      .eq("attempt_id", attempt.attempt_id);
    if (rotateError) throw new Error("Checkout unavailable");
    const next = await admin
      .from("vf_checkout_attempts")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .single();
    attempt = next.data;
    attemptError = next.error;
    if (attemptError || !attempt) throw new Error("Checkout unavailable");
  }
  // Same request payload/key across races and retries. Never blindly rotate an ambiguous
  // attempt after Stripe's idempotency retention window; operator reconciliation required.
  const createdAt = Math.floor(Date.parse(attempt.created_at) / 1000);
  if (Date.now() / 1000 - createdAt > 1700)
    throw new Error("Checkout requires reconciliation");
  const location = await requestPortal(slug);
  const base = location.origin + billingPath(location);
  const session = await stripe.checkout.sessions.create(
    {
      customer,
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${base}?returned=1`,
      cancel_url: `${base}?cancelled=1`,
      client_reference_id: ctx.tenant.id,
      subscription_data: { metadata: { tenant_id: ctx.tenant.id } },
      expires_at: createdAt + 3600,
    },
    { idempotencyKey: `vf-checkout-${attempt.attempt_id}` },
  );
  const { error: saveError } = await admin
    .from("vf_checkout_attempts")
    .update({ session_id: session.id })
    .eq("tenant_id", ctx.tenant.id)
    .eq("attempt_id", attempt.attempt_id);
  if (saveError)
    throw new Error("Checkout status could not be saved; retry safely");
  if (!session.url) throw new Error("Checkout unavailable");
  return session.url;
}
export async function portal(slug: string) {
  const ctx = await billingContext(slug, false);
  if (!ctx.billing.stripe_customer_id)
    throw new Error("No billing account yet");
  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  if (!configuration) throw new Error("Billing portal needs review");
  const location = await requestPortal(slug);
  return (
    await ctx.stripe.billingPortal.sessions.create({
      customer: ctx.billing.stripe_customer_id,
      configuration,
      return_url: location.origin + billingPath(location),
    })
  ).url;
}
