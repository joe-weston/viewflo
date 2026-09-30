import { requestPortal } from "../../../../../lib/portal-request";
import { tenantPath } from "../../../../../lib/portal-urls";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  agreements,
  tenantContext,
  tenantSow,
} from "../../../../../lib/portal";
import { billingRole } from "../../../../../lib/portal-policy";
import { AgreementChoice } from "../../../../../src/components/AgreementChoice";
import { acceptDocument } from "../../actions";
export default async function Agreement({
  params,
}: {
  params: Promise<{ tenant: string; kind: string }>;
}) {
  const { tenant, kind } = await params;
  if (!["terms", "privacy", "sow"].includes(kind)) notFound();
  const ctx = await tenantContext(tenant);
  if (!ctx) return null;
  const location = await requestPortal(tenant);
  const docs = await agreements(ctx.db);
  if (kind === "sow") {
    const sow = await tenantSow(ctx.db, ctx.tenant.id);
    if (sow) docs.push(sow);
  }
  const doc = docs.find((d) => d.kind === kind);
  if (!doc)
    return (
      <section className="portal-card">
        <h2>
          {kind === "sow"
            ? "Custom services SOW"
            : kind === "terms"
              ? "Terms of Service"
              : "Privacy Policy"}
        </h2>
        <p>
          The final document is not available yet. You won’t be asked to accept
          a draft.
        </p>
      </section>
    );
  const { data: accepted } = await ctx.db
    .from("vf_acceptances")
    .select("document_id,accepted_at")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id);
  const saved = accepted?.find((a) => a.document_id === doc.id);
  const terms = docs.find((d) => d.kind === "terms");
  const termsAccepted = accepted?.some((a) => a.document_id === terms?.id);
  return (
    <>
      <article className="portal-document">
        <p className="eyebrow">
          {kind === "sow"
            ? "SEPARATE CUSTOM SERVICES AGREEMENT"
            : kind === "terms"
              ? "STEP 2 · SERVICE AGREEMENT"
              : "STEP 3 · PRIVACY NOTICE"}
        </p>
        <h2>{doc.title}</h2>
        <p>Version {doc.version}</p>
        <a
          href={
            tenantPath(location, `/admin/agreements/${kind}/download`) +
            `?version=${encodeURIComponent(doc.version)}`
          }
        >
          Download this document
        </a>
        <div className="document-body">
          {doc.body.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>
      {saved ? (
        <p role="status">
          Recorded on{" "}
          {new Date(saved.accepted_at).toLocaleDateString("en-US", {
            timeZone: "UTC",
          })}
          .{" "}
          <Link href={tenantPath(location, "/admin/billing")}>
            Continue to billing
          </Link>
        </p>
      ) : !billingRole(ctx.role) ? (
        <p>A billing administrator must complete this step.</p>
      ) : kind === "privacy" && !termsAccepted ? (
        <Link href={tenantPath(location, "/admin/agreements/terms")}>
          Review and accept the terms first
        </Link>
      ) : (
        <AgreementChoice
          key={doc.id}
          kind={kind}
          tenant={tenant}
          document={doc.id}
          action={acceptDocument}
        />
      )}
    </>
  );
}
