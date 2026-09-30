import Link from "next/link";
import { tenantContext, agreements, tenantSow } from "../../../../lib/portal";
import { allAccepted, billingRole } from "../../../../lib/portal-policy";
import { billingContext } from "../../../../lib/billing";
import { openPortal, startCheckout } from "../actions";
import { HOSTING, serviceEligibility } from "../../../../lib/commercial-policy";
import { requestPortal } from "../../../../lib/portal-request";
import { tenantPath, billingPath } from "../../../../lib/portal-urls";
import {
  readBillingSnapshot,
  unavailableBilling,
} from "../../../../lib/billing-data";
import { BillingOverview } from "../../../../src/components/BillingOverview";
export default async function Billing({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant } = await params;
  const ctx = await tenantContext(tenant);
  if (!ctx) return null;
  if (!billingRole(ctx.role))
    return (
      <section className="portal-card">
        <h2>Billing access required</h2>
        <p>Billing is available to your business’s billing administrators.</p>
      </section>
    );
  const location = await requestPortal(tenant);
  const links = {
    billing: billingPath(location),
    terms: tenantPath(location, "/admin/agreements/terms"),
    privacy: tenantPath(location, "/admin/agreements/privacy"),
  };
  const query = await searchParams;
  const docs = await agreements(ctx.db);
  const { data: accepted } = await ctx.db
    .from("vf_acceptances")
    .select("document_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id);
  const acceptedIds = (accepted ?? []).map((a) => a.document_id);
  const ready = allAccepted(docs, acceptedIds);
  const acceptance = (kind: string) => {
    const doc = docs.find((d) => d.kind === kind);
    return !doc
      ? "Awaiting final document"
      : acceptedIds.includes(doc.id)
        ? `Accepted · ${doc.version}`
        : "Review required";
  };
  let snapshot = unavailableBilling();
  let summary: string | null = null;
  let cutoffPolicy: string | null = null;
  try {
    const billing = await billingContext(tenant, false);
    snapshot = await readBillingSnapshot(
      billing.stripe,
      billing.billing.stripe_customer_id,
      query.after,
    );
    summary = billing.billing.commercial_summary;
    cutoffPolicy = billing.billing.invoice_cutoff_policy;
    snapshot.canManage =
      snapshot.canManage && !!process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    snapshot.canCheckout =
      snapshot.canCheckout &&
      ready &&
      !!billing.billing.hosting_start_approved_at &&
      !!cutoffPolicy &&
      !!billing.billing.cancellation_policy_approved_at;
  } catch {
    /* Never substitute cached, fixture or invented paid data. */
  }
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
    accepted: acceptedIds.includes(serviceOrder?.sow_document_id),
    conditionHash: serviceOrder?.condition_sha256 ?? null,
    conditionsFinalized:
      !!serviceOrder?.condition_source_version &&
      !!serviceOrder?.conditions_finalized_at &&
      Number.isFinite(Date.parse(serviceOrder.conditions_finalized_at)) &&
      (!approval ||
        Date.parse(serviceOrder.conditions_finalized_at) <=
          Date.parse(approval.approved_at)),
    approval,
  });
  return (
    <>
      {query.error && (
        <p role="alert" className="portal-notice">
          Billing couldn’t be opened. Please retry or contact your
          administrator.
        </p>
      )}
      {query.returned && (
        <p role="status" className="portal-notice">
          Welcome back. Your billing details are checked with Stripe; returning
          here alone does not confirm payment.
        </p>
      )}
      {query.cancelled && (
        <p role="status" className="portal-notice">
          Checkout was closed. You can continue when you’re ready.
        </p>
      )}
      <BillingOverview
        snapshot={snapshot}
        links={links}
        termsStatus={acceptance("terms")}
        privacyStatus={acceptance("privacy")}
        actions={
          <>
            <form action={openPortal}>
              <input type="hidden" name="tenant" value={tenant} />
              <button disabled={!snapshot.canManage}>
                Manage payment method
              </button>
            </form>
            {snapshot.canCheckout && (
              <form action={startCheckout}>
                <input type="hidden" name="tenant" value={tenant} />
                <button className="secondary">Start subscription</button>
              </form>
            )}
          </>
        }
      />
      <section className="billing-policy">
        <h3>Hosting terms</h3>
        <p>{HOSTING.cancellation}</p>
        <p>
          Next-invoice cancellation cutoff:{" "}
          {cutoffPolicy ?? "Awaiting confirmation."}
        </p>
        {summary && <p className="document-body">{summary}</p>}
        <p className="portal-muted">
          Test billing environment. No live charges.
        </p>
      </section>
      {tenant === "pasadena-shades-and-shutters" && (
        <section className="portal-card billing-services">
          <p className="eyebrow">SEPARATE FROM HOSTING</p>
          <h3>Custom services</h3>
          <p>
            Pasadena Phase 1 and Phase 2: $4,000, contingent on the
            completion/growth conditions in the final SOW. The agreement is
            accepted upfront; invoicing occurs only after those conditions are
            earned and approved.
          </p>
          <p>
            Once eligible, choose one $4,000 payment or four monthly $1,000
            installments. No option or dates are selected. Signing, hosting
            activation and website launch do not create a services invoice or
            charge.
          </p>
          <p role="status">
            Services status: {eligibility}. No services invoice has been created
            by this flow.
          </p>
          <Link href={tenantPath(location, "/admin/agreements/sow")}>
            Review the custom services SOW
          </Link>
        </section>
      )}
    </>
  );
}
