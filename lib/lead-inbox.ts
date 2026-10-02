import "server-only";
import { tenantContext } from "./portal";
import { leadEnvironment } from "./lead-environment";
export const leadStatuses = [
  "new",
  "reviewing",
  "contacted",
  "closed",
] as const;
export async function leadOwner(tenant: string) {
  const ctx = await tenantContext(tenant);
  const environment = leadEnvironment();
  return ctx?.role === "owner" &&
    environment &&
    process.env.LEAD_SCOPED_SCHEMA_READY === "true"
    ? { ...ctx, leadEnvironment: environment }
    : null;
}
export function leadId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
