import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { currentPair, safeSlug, type LegalDocument } from "./portal-policy";
import { requestPortal } from "./portal-request";
import { loginPath } from "./portal-urls";
export function authReady() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Proxy owns refresh in Server Components. */
          }
        },
      },
    },
  );
}
export function operatorDb() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Billing unavailable");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function tenantContext(slug: string) {
  if (!safeSlug(slug)) return null;
  let location;
  try {
    location = await requestPortal(slug);
  } catch {
    return null;
  }
  if (!authReady()) return null;
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect(loginPath(location));
  const { data: tenant } = await db
    .from("vf_tenants")
    .select("id,slug,name")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return null;
  const { data: member } = await db
    .from("vf_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return null;
  return { db, user, tenant, role: member.role as string };
}
export async function agreements(db: Awaited<ReturnType<typeof supabase>>) {
  const { data, error } = await db
    .from("vf_documents")
    .select("*")
    .in("kind", ["terms", "privacy"])
    .is("retired_at", null)
    .not("published_at", "is", null);
  if (error) return [];
  return currentPair((data ?? []) as LegalDocument[]).filter(
    (d) => createHash("sha256").update(d.body).digest("hex") === d.sha256,
  );
}
export async function tenantSow(
  db: Awaited<ReturnType<typeof supabase>>,
  tenantId: string,
): Promise<LegalDocument | null> {
  const { data, error } = await db
    .from("vf_documents")
    .select("*")
    .eq("kind", "sow")
    .eq("tenant_id", tenantId)
    .is("retired_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (
    error ||
    !data ||
    createHash("sha256").update(data.body).digest("hex") !== data.sha256
  )
    return null;
  return data as LegalDocument;
}
