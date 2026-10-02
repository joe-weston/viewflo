import { safeSlug } from "./portal-policy";
import { tenantForHost } from "./tenant-routing";
export type PortalLocation = {
  origin: string;
  tenant: string;
  customDomain: boolean;
};

export function portalLocation(
  host: string,
  tenant: string,
  configuredOrigin?: string,
): PortalLocation {
  if (!safeSlug(tenant) || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host))
    throw new Error("Invalid workspace origin");
  const hostTenant = tenantForHost(host);
  if (hostTenant) {
    if (hostTenant !== tenant) throw new Error("Workspace domain mismatch");
    if (host.includes(":")) throw new Error("Invalid workspace origin");
    return {
      origin: `https://${host.toLowerCase()}`,
      tenant,
      customDomain: true,
    };
  }
  if (/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host))
    return { origin: `http://${host}`, tenant, customDomain: false };
  if (!configuredOrigin)
    throw new Error("Platform origin awaiting configuration");
  const approved = new URL(configuredOrigin);
  if (
    approved.protocol !== "https:" ||
    approved.username ||
    approved.password ||
    approved.pathname !== "/" ||
    approved.search ||
    approved.hash ||
    approved.host.toLowerCase() !== host.toLowerCase() ||
    tenantForHost(approved.host)
  )
    throw new Error("Invalid workspace origin");
  return { origin: approved.origin, tenant, customDomain: false };
}
export function tenantPath(location: PortalLocation, suffix = "") {
  if (
    suffix &&
    (!suffix.startsWith("/") ||
      suffix.startsWith("//") ||
      /[\\\u0000-\u001f]/.test(suffix) ||
      suffix.split("/").some((segment) => segment === "." || segment === ".."))
  )
    throw new Error("Invalid workspace path");
  return (location.customDomain ? "" : `/${location.tenant}`) + suffix || "/";
}
export function billingPath(location: PortalLocation) {
  return tenantPath(location, "/admin/billing");
}
export function loginPath(location: PortalLocation) {
  return `/auth?tenant=${encodeURIComponent(location.tenant)}`;
}
export function invoiceCursor(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^in_[A-Za-z0-9]{1,128}$/.test(value))
    throw new Error("Invalid invoice cursor");
  return value;
}
