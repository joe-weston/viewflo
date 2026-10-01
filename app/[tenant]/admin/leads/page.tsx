import Link from "next/link";
import { leadOwner } from "../../../../lib/lead-inbox";
import { requestPortal } from "../../../../lib/portal-request";
import { tenantPath } from "../../../../lib/portal-urls";
export default async function Leads({params}:{params:Promise<{tenant:string}>}){
 const {tenant}=await params;const ctx=await leadOwner(tenant);
 if(!ctx)return <section className="portal-card"><h2>Lead inbox unavailable</h2><p>Only authorized workspace owners can review customer inquiries.</p></section>;
 const location=await requestPortal(tenant);
 const {data,error}=await ctx.db.from("vf_leads").select("id,kind,name,created_at,status").eq("tenant_id",ctx.tenant.id).order("created_at",{ascending:false}).limit(100);
 return <section className="portal-card"><h2>Customer inquiries</h2><p>Latest 100 saved requests. Customer details and photos stay in this private workspace.</p>
 {error?<p role="alert">The inbox is temporarily unavailable. No customer information was loaded.</p>:!data?.length?<p>No inquiries have been received yet.</p>:<ul className="mt-6 space-y-4">{data.map(lead=><li key={lead.id} className="border-b border-linen pb-4"><Link className="underline underline-offset-4" href={tenantPath(location,"/admin/leads/"+lead.id)}>{lead.name} — {lead.kind==="consultation"?"Consultation":"Photo request"}</Link><p className="mt-2 text-sm">{lead.status} · {new Date(lead.created_at).toLocaleDateString("en-US",{timeZone:"America/Los_Angeles"})}</p></li>)}</ul>}
 </section>;
}
