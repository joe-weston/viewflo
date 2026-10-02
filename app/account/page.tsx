import { redirect } from "next/navigation";
import Link from "next/link";
import { authReady, supabase } from "../../lib/portal";
import { headers } from "next/headers";
import { tenantForHost } from "../../lib/tenant-routing";
export const dynamic = "force-dynamic";
export default async function Account() {
  if (tenantForHost((await headers()).get("host"))) redirect("/admin/billing");
  if (!authReady()) redirect("/auth");
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth");
  const { data } = await db.from("vf_tenants").select("id,slug,name");
  return (
    <div className="portal-shell">
      <Link href="/">ViewFlow</Link>
      <h1>Your workspaces</h1>
      {data?.length ? (
        <ul>
          {data.map((t) => (
            <li key={t.id}>
              <Link href={`/${t.slug}/admin`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No workspace is assigned to this account yet. Ask your administrator
          to authorize access.
        </p>
      )}
    </div>
  );
}
