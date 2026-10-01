"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { leadOwner,leadId,leadStatuses } from "../../../../../lib/lead-inbox";
import { requestPortal } from "../../../../../lib/portal-request";
import { tenantPath } from "../../../../../lib/portal-urls";
export async function updateLead(tenant:string,id:string,form:FormData){
 const status=String(form.get("status")||"");
 if(!leadId(id)||!leadStatuses.includes(status as typeof leadStatuses[number]))throw new Error("Invalid request.");
 const ctx=await leadOwner(tenant);if(!ctx)throw new Error("Access denied.");
 const {data,error}=await ctx.db.from("vf_leads").update({status}).eq("tenant_id",ctx.tenant.id).eq("id",id).select("id").maybeSingle();
 if(error||!data)throw new Error("Unable to update this request.");
 const location=await requestPortal(tenant);const url=tenantPath(location,"/admin/leads/"+id);
 revalidatePath("/"+tenant+"/admin/leads");revalidatePath("/"+tenant+"/admin/leads/"+id);redirect(url);
}
