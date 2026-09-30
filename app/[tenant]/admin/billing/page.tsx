import Link from "next/link";
import { tenantContext, agreements, tenantSow } from "../../../../lib/portal";
import { allAccepted, billingRole } from "../../../../lib/portal-policy";
import { billingContext } from "../../../../lib/billing";
import { openPortal, startCheckout } from "../actions";
import {
  HOSTING,
  billingTiming,
  serviceEligibility,
} from "../../../../lib/commercial-policy";
export default async function Billing({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { tenant } = await params;
  const ctx = await tenantContext(tenant);
  if (!ctx) return null;
  if (!billingRole(ctx.role))
    return (
      <p>Billing is available to your business’s billing administrators.</p>
    );
  const docs = await agreements(ctx.db);
  const { data: accepted } = await ctx.db
    .from("vf_acceptances")
    .select("document_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id);
  const ready = allAccepted(
    docs,
    (accepted ?? []).map((a) => a.document_id),
  );
  let summary: string | null = null;
  let status = "Not available";
  let canManage = false;
  let canCheckout = false;
  let timing = billingTiming(null, null);
  let cutoffPolicy: string | null = null;
  try {
    const billing = await billingContext(tenant, false);
    summary = billing.billing.commercial_summary;
    cutoffPolicy = billing.billing.invoice_cutoff_policy;
    if (billing.billing.stripe_customer_id) {
      const subscriptions = await billing.stripe.subscriptions.list({
        customer: billing.billing.stripe_customer_id,
        status: "all",
        limit: 100,
      });
      const current = subscriptions.data.find(
        (s) => !["canceled", "incomplete_expired"].includes(s.status),
      );
      status = current?.status ?? "No current subscription";
      if (current) {
        let paymentAttempt: number | null = null;
        if (current.latest_invoice) {
          const invoice =
            typeof current.latest_invoice === "string"
              ? await billing.stripe.invoices.retrieve(current.latest_invoice)
              : current.latest_invoice;
          paymentAttempt = invoice.next_payment_attempt;
        }
        timing = billingTiming(
          current.items.data.length === 1
            ? current.items.data[0].current_period_end
            : null,
          paymentAttempt,
        );
      }
      canCheckout = !current && !subscriptions.has_more;
      canManage = !!process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    } else {
      status = "No subscription";
      canCheckout = true;
    }
    canCheckout =
      canCheckout &&
      !!billing.billing.hosting_start_approved_at &&
      !!cutoffPolicy &&
      !!billing.billing.cancellation_policy_approved_at;
  } catch {
    /* Show unavailable, never cached or simulated paid status. */
  }
  const query = await searchParams;
  const { data: serviceOrder } = await ctx.db
    .from("vf_service_orders")
    .select(
      "sow_document_id,condition_sha256,conditions_finalized_at,condition_source_version",
    )
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  const { data: approval } =
    serviceOrder?.sow_document_id && serviceOrder.condition_sha256
      ? await ctx.db
          .from("vf_service_eligibility_events")
          .select(
            "sow_document_id,condition_sha256,evidence_reference,approved_at",
          )
          .eq("tenant_id", ctx.tenant.id)
          .eq("sow_document_id", serviceOrder.sow_document_id)
          .eq("condition_sha256", serviceOrder.condition_sha256)
          .maybeSingle()
      : { data: null };
  const currentSow = await tenantSow(ctx.db, ctx.tenant.id);
  const eligibility = serviceEligibility({
    sowId:
      currentSow?.id === serviceOrder?.sow_document_id
        ? (currentSow?.id ?? null)
        : null,
    accepted: !!accepted?.some(
      (a) => a.document_id === serviceOrder?.sow_document_id,
    ),
    conditionHash: serviceOrder?.condition_sha256 ?? null,
    conditionsFinalized:
      !!serviceOrder?.condition_source_version &&
      !!serviceOrder?.conditions_finalized_at &&
      Number.isFinite(Date.parse(serviceOrder.conditions_finalized_at)) && (!approval || Date.parse(serviceOrder.conditions_finalized_at) <= Date.parse(approval.approved_at)),
    approval,
  });
  return (
    <section className="portal-card">
      <p className="eyebrow">BILLING</p>
      <h2>Custom web hosting</h2>
      <p>
        <strong>USD $169 per month</strong> · {HOSTING.paymentTiming}.
      </p>
      <p>{HOSTING.cancellation}</p>
      <p>
        Current billing period ends: {timing.periodEnd ?? "Not available"}
        {timing.periodEnd ? " (UTC)" : ""}.
      </p>
      <p>
        Latest invoice’s next payment attempt:{" "}
        {timing.paymentAttempt ?? "Not available"}
        {timing.paymentAttempt ? " (UTC)" : ""}.
      </p>
      <p>
        Next-invoice cancellation cutoff:{" "}
        {cutoffPolicy ??
          "Awaiting confirmation. Period end and payment attempt are not the invoice cutoff."}
      </p>
      {query.error && (
        <p role="alert">
          Billing couldn’t be opened. No success has been recorded here. Please
          retry or contact your administrator.
        </p>
      )}
      {query.returned && (
        <p role="status">
          Welcome back. Your subscription status below is checked with the
          payment provider; returning here alone does not confirm payment.
        </p>
      )}
      {query.cancelled && (
        <p role="status">
          Checkout was closed. You can continue when you’re ready.
        </p>
      )}
      <p>
        Status: <strong>{status}</strong>
      </p>
      {summary ? (
        <>
          <p className="document-body">{summary}</p>
          <p>Test billing environment. No live charges.</p>
        </>
      ) : (
        <p className="portal-notice">
          The hosting price is confirmed. Payment is unavailable until the start
          date, invoice timing, account configuration and service agreements are
          ready.
        </p>
      )}
      {!ready && (
        <p>
          <Link href={`/${tenant}/admin/agreements/terms`}>
            Review the service agreements
          </Link>{" "}
          before starting a subscription.
        </p>
      )}
      <form action={startCheckout}>
        <input type="hidden" name="tenant" value={tenant} />
        <button disabled={!ready || !summary || !canCheckout}>
          Continue to secure checkout
        </button>
      </form>
      <h3>Invoices and payment methods</h3>
      <p>
        Use the secure billing portal to view available invoices, update your
        payment method and manage your subscription.
      </p>
      <form action={openPortal}>
        <input type="hidden" name="tenant" value={tenant} />
        <button className="secondary" disabled={!canManage}>
          Manage billing
        </button>
      </form>
      {tenant === "pasadena-shades-and-shutters" && (
        <section>
          <h3>Separate custom services</h3>
          <p>
            Pasadena Phase 1 and Phase 2: USD $4,000, contingent on the
            completion/growth conditions in the final SOW. The agreement is
            accepted upfront; invoicing occurs only after those conditions are
            earned and approved. Hosting is separate.
          </p>
          <p>
            Once eligible, payment arrangements will be selected separately: one
            $4,000 payment or four monthly $1,000 installments. No option or
            dates are selected. Signing, hosting activation and website launch
            do not create an invoice or services charge.
          </p>
          <p role="status">
            Services status: {eligibility}. No services invoice has been created
            by this flow.
          </p>
          <Link href={`/${tenant}/admin/agreements/sow`}>
            Review the custom services SOW
          </Link>
        </section>
      )}
    </section>
  );
}

