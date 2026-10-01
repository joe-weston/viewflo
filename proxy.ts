import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicRedirect } from "./lib/pasadena-site";
import {
  shouldRewriteTenantPath,
  tenantForHost,
  tenantRewritePath,
} from "./lib/tenant-routing";

export async function proxy(request: NextRequest) {
  const destination = publicRedirect(
    request.headers.get("host"),
    request.nextUrl.pathname,
    process.env.VERCEL_ENV === "production",
  );
  if (destination) {
    const target = new URL(destination, request.url);
    const source = new URL(request.url);
    source.searchParams.delete("__viewflo_tenant_host");
    target.search = source.search;
    return NextResponse.redirect(target, 308);
  }
  const tenant = tenantForHost(request.headers.get("host"));
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete("x-viewflo-tenant-host");
  if (tenant) forwardedHeaders.set("x-viewflo-tenant-host", tenant);

  // Preserve the transport origin: NextURL normalizes 127.0.0.1 to localhost,
  // which can turn a local internal rewrite into a second HTTP request.
  const rewriteUrl = new URL(request.url);
  const sanitizeQuery = rewriteUrl.searchParams.has("__viewflo_tenant_host");
  rewriteUrl.searchParams.delete("__viewflo_tenant_host");
  const shouldRewrite =
    tenant !== null && shouldRewriteTenantPath(rewriteUrl.pathname);

  if (shouldRewrite) {
    rewriteUrl.pathname = tenantRewritePath(rewriteUrl.pathname, tenant);
    rewriteUrl.searchParams.set("__viewflo_tenant_host", tenant);
  }

  const makeResponse = () =>
    shouldRewrite || sanitizeQuery
      ? NextResponse.rewrite(rewriteUrl, {
          request: { headers: forwardedHeaders },
        })
      : NextResponse.next({
          request: { headers: forwardedHeaders },
        });

  let response = makeResponse();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;

  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await db.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
