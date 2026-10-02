import "server-only";
import { tenantContext } from "./portal";
export const leadStatuses=["new","reviewing","contacted","closed"] as const;
export async function leadOwner(tenant:string){
 const ctx=await tenantContext(tenant);
 return ctx?.role==="owner"?ctx:null;
}
export function leadId(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
