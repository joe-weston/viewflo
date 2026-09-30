import Link from "next/link";
import { tenantContext } from "../../../lib/portal";
import { signout } from "../../auth/actions";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await tenantContext(tenant);
  if (!ctx)
    return (
      <div className="portal-shell">
        <Link href="/">ViewFlow</Link>
        <h1>Workspace unavailable</h1>
        <p>
          Your account may not have access, or this workspace may not be ready.
          Contact your workspace administrator.
        </p>
        <Link href="/auth">Return to sign in</Link>
      </div>
    );
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Link href="/">ViewFlow</Link>
        <form action={signout}>
          <button className="secondary">Sign out</button>
        </form>
      </header>
      <p className="eyebrow">BUSINESS WORKSPACE</p>
      <h1>{ctx.tenant.name}</h1>
      <nav aria-label="Workspace" className="portal-nav">
        <Link href={`/${tenant}/admin`}>Overview</Link>
        <Link href={`/${tenant}/admin/agreements/terms`}>Terms</Link>
        <Link href={`/${tenant}/admin/agreements/privacy`}>Privacy</Link>
        <Link href={`/${tenant}/admin/billing`}>Billing</Link>
        <Link href={`/${tenant}/admin/agreements/sow`}>Services SOW</Link>
        <Link href={`/${tenant}`}>Website preview</Link>
      </nav>
      {children}
    </div>
  );
}
