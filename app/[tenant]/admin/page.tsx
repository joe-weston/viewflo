import Link from "next/link";
import { tenantContext, agreements } from "../../../lib/portal";
import { allAccepted } from "../../../lib/portal-policy";
export default async function Overview({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { tenant } = await params;
  const ctx = await tenantContext(tenant);
  if (!ctx) return null;
  const docs = await agreements(ctx.db);
  const { data } = await ctx.db
    .from("vf_acceptances")
    .select("document_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id);
  const done = allAccepted(
    docs,
    (data ?? []).map((a) => a.document_id),
  );
  const { data: history } = await ctx.db
    .from("vf_documents")
    .select("id,kind,version,title")
    .in(
      "id",
      (data ?? []).map((a) => a.document_id),
    );
  return (
    <section className="portal-card">
      <h2>Your account, in one place.</h2>
      <p>
        Review the service agreements, then set up your subscription. You can
        return here to manage billing whenever you need.
      </p>
      {(await searchParams).error && (
        <p role="alert">
          That action couldn’t be completed. Please review the current
          agreements and try again.
        </p>
      )}
      <ol>
        <li>Sign in to your authorized workspace.</li>
        <li>Read and accept the Terms of Service.</li>
        <li>Read and acknowledge the Privacy Policy.</li>
        <li>Review your subscription and continue to secure checkout.</li>
      </ol>
      {docs.length !== 2 ? (
        <p role="status" className="portal-notice">
          The service agreements are being prepared. Acceptance and payment will
          be available after they are finalized.
        </p>
      ) : (
        <Link
          className="portal-button"
          href={`/${tenant}/admin/${done ? "billing" : "agreements/terms"}`}
        >
          {done ? "Go to billing" : "Review terms"}
        </Link>
      )}
      {!!history?.length && (
        <section>
          <h3>Your agreement records</h3>
          <ul>
            {history.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/${tenant}/admin/agreements/${doc.kind}/download?version=${encodeURIComponent(doc.version)}`}
                >
                  {doc.title} · {doc.version} · Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
