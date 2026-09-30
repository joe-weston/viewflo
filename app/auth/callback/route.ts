import { NextResponse } from "next/server";
import { supabase, authReady } from "../../../lib/portal";
import {
  portalLocation,
  billingPath,
  loginPath,
} from "../../../lib/portal-urls";
import { tenantForHost } from "../../../lib/tenant-routing";
import { billingRole, safeSlug } from "../../../lib/portal-policy";
import { completeManagerLogin } from "../../../lib/manager-auth";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const tenant = url.searchParams.get("tenant") ?? tenantForHost(host) ?? "";
  if (!safeSlug(tenant))
    return new NextResponse("Invalid workspace", { status: 400 });
  let location;
  try {
    location = portalLocation(host, tenant, process.env.VIEWFLOW_APP_URL);
  } catch {
    return new NextResponse("Invalid workspace origin", { status: 400 });
  }
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, location.origin));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const token = url.searchParams.get("token_hash");
  if (
    authReady() &&
    token &&
    token.length <= 1024 &&
    url.searchParams.get("type") === "email"
  ) {
    const db = await supabase();
    const outcome = await completeManagerLogin({
      verify: async () =>
        !(await db.auth.verifyOtp({ token_hash: token, type: "email" })).error,
      authorized: async () => {
        const {
          data: { user },
        } = await db.auth.getUser();
        if (user) {
          const { data: site } = await db
            .from("vf_tenants")
            .select("id")
            .eq("slug", tenant)
            .maybeSingle();
          if (site) {
            const { data: member } = await db
              .from("vf_memberships")
              .select("role")
              .eq("tenant_id", site.id)
              .eq("user_id", user.id)
              .maybeSingle();
            if (member && billingRole(member.role)) return true;
          }
        }
        return false;
      },
      signout: async () => {
        await db.auth.signOut();
      },
    });
    if (outcome === "ok") return finish(billingPath(location));
    return finish(`${loginPath(location)}&error=${outcome}`);
  }
  return finish(`${loginPath(location)}&error=expired`);
}
