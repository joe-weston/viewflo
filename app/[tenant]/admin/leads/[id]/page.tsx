import Link from "next/link";
import { notFound } from "next/navigation";
import { leadOwner, leadId, leadStatuses } from "../../../../../lib/lead-inbox";
import { requestPortal } from "../../../../../lib/portal-request";
import { tenantPath } from "../../../../../lib/portal-urls";
import { updateLead } from "./actions";
export const metadata = { referrer: "no-referrer" };
export default async function Lead({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  if (!leadId(id)) notFound();
  const ctx = await leadOwner(tenant);
  if (!ctx)
    return (
      <section className="portal-card">
        <h2>Lead unavailable</h2>
        <p>Workspace owner access is required.</p>
      </section>
    );
  const { data: lead, error } = await ctx.db
    .from("vf_leads")
    .select("id,kind,name,email,phone,notes,details,status,created_at")
    .eq("tenant_id", ctx.tenant.id)
    .eq("environment", ctx.leadEnvironment)
    .eq("id", id)
    .maybeSingle();
  if (error)
    return (
      <section className="portal-card">
        <h2>Lead unavailable</h2>
        <p role="alert">Please try again later.</p>
      </section>
    );
  if (!lead) notFound();
  const { data: photos, error: photoError } = await ctx.db
    .from("vf_lead_photos")
    .select("sequence")
    .eq("tenant_id", ctx.tenant.id)
    .eq("lead_id", id)
    .order("sequence");
  const location = await requestPortal(tenant);
  return (
    <section className="portal-card">
      <Link href={tenantPath(location, "/admin/leads")} className="underline">
        All inquiries
      </Link>
      <h2 className="mt-5">{lead.name}</h2>
      <p>
        {lead.kind === "consultation"
          ? "Consultation request"
          : "Photo request"}
      </p>
      <dl className="mt-6 space-y-4">
        <div>
          <dt>Email</dt>
          <dd>
            <a href={"mailto:" + lead.email}>{lead.email}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{lead.phone || "Not provided"}</dd>
        </div>
        {Object.entries(lead.details || {})
          .filter(([key]) => key !== "budget")
          .map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>
                {Array.isArray(value)
                  ? value.join(", ")
                  : String(value || "Not provided")}
              </dd>
            </div>
          ))}
      </dl>
      <h3 className="mt-6">Notes</h3>
      <p className="whitespace-pre-wrap break-words">
        {lead.notes || "No notes supplied."}
      </p>
      <h3 className="mt-6">Photos</h3>
      {photoError ? (
        <p role="alert">Photos could not be loaded.</p>
      ) : (
        <ul className="space-y-3">
          {photos?.map((photo) => (
            <li key={photo.sequence}>
              <a
                className="underline"
                href={tenantPath(
                  location,
                  "/admin/leads/" + id + "/photos/" + photo.sequence,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open private photo {photo.sequence}
              </a>
            </li>
          ))}
        </ul>
      )}
      <form action={updateLead.bind(null, tenant, id)} className="mt-8">
        <label htmlFor="lead-status">Request status</label>
        <select
          id="lead-status"
          name="status"
          defaultValue={lead.status}
          className="my-3 block"
        >
          <option disabled value="">
            Choose a status
          </option>
          {leadStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="submit">Save status</button>
      </form>
      <p className="mt-6 break-all text-sm">Reference: {id}</p>
    </section>
  );
}
