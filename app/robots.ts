import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { tenantForHost } from "../lib/tenant-routing";
import { PASADENA_ORIGIN } from "../lib/pasadena-site";
export default async function robots():Promise<MetadataRoute.Robots> {
 const requestHeaders = await headers();
 const custom=(requestHeaders.get("x-viewflo-tenant-host")==="pasadena-shades-and-shutters" || tenantForHost(requestHeaders.get("host"))!==null) && process.env.VERCEL_ENV!=="preview";
 return custom?{rules:{userAgent:"*",allow:"/",disallow:["/admin/","/auth/","/api/","/account/"]},sitemap:PASADENA_ORIGIN+"/sitemap.xml"}:{rules:{userAgent:"*",disallow:"/"}};
}
