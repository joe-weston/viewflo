import Link from "next/link";
import { tenantContext } from "../../../lib/portal";
import { requestPortal } from "../../../lib/portal-request";
import { tenantPath, loginPath } from "../../../lib/portal-urls";
import { signout } from "../../auth/actions";
import { AdminNav } from "../../../src/components/AdminNav";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await tenantContext(tenant);
  let location;
  try {
    location = await requestPortal(tenant);
  } catch {
    location = null;
  }
  if (!ctx || !location)
    return (
      <div className="portal-shell">
        <Link href="/">Viewflo</Link>
        <h1>Workspace unavailable</h1>
        <p>
          Your account may not have access, or this workspace may not be ready.
          Contact your workspace administrator.
        </p>
        <Link href={location ? loginPath(location) : "/auth"}>
          Return to sign in
        </Link>
      </div>
    );
  return (
    <div className="portal-shell admin-shell">
      <header className="portal-header">
        <Link href={tenantPath(location)}>{ctx.tenant.name}</Link>
        <form action={signout}>
          <input type="hidden" name="tenant" value={tenant} />
          <button className="secondary">Sign out</button>
        </form>
      </header>
      <p className="eyebrow">PRIVATE BUSINESS WORKSPACE</p>
      <h1>{ctx.tenant.name}</h1>
      <AdminNav
        tenantPrefix={location.customDomain ? `/${tenant}` : ""}
        items={[
          { label: "Overview", href: tenantPath(location, "/admin") },
          { label: "Billing", href: tenantPath(location, "/admin/billing") },
          { label: "Website", href: tenantPath(location) },
        ]}
      />
      {children}
      <footer className="admin-footer">
        Your business workspace · Powered by Viewflo
      </footer>
    </div>
  );
}
