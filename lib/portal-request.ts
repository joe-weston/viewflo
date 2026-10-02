import "server-only";
import { headers } from "next/headers";
import { portalLocation } from "./portal-urls";
export async function requestPortal(tenant: string) {
  const requestHeaders = await headers();
  return portalLocation(
    requestHeaders.get("host") ?? "",
    tenant,
    process.env.VIEWFLOW_APP_URL,
  );
}
