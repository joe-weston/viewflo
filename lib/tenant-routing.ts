export const PASADENA_TENANT = "pasadena-shades-and-shutters";
export const PASADENA_HOSTS = new Set([
  "pasadenashadesandshutters.com",
  "www.pasadenashadesandshutters.com",
]);

const STATIC_ASSET_PREFIXES = [
  "/_next/",
  "/api/",
  "/auth/",
  "/account/",
  "/tenants/",
];

const STATIC_ASSET_PATTERN =
  /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|webp|woff2?|ttf)$/i;

export function normalizeHostname(value: string | null): string {
  if (!value) return "";
  const first = value.split(",", 1)[0].trim().toLowerCase();
  return first.replace(/:\d+$/, "").replace(/\.$/, "");
}

export function tenantForHost(value: string | null): string | null {
  return PASADENA_HOSTS.has(normalizeHostname(value)) ? PASADENA_TENANT : null;
}

export function shouldRewriteTenantPath(pathname: string): boolean {
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/" + PASADENA_TENANT ||
    pathname.startsWith("/" + PASADENA_TENANT + "/")
  )
    return false;

  if (
    STATIC_ASSET_PREFIXES.some(
      (prefix) =>
        pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
    )
  )
    return false;

  return !STATIC_ASSET_PATTERN.test(pathname);
}

export function tenantRewritePath(pathname: string, tenant: string): string {
  const suffix = pathname === "/" ? "" : pathname;
  return "/" + tenant + suffix;
}

const PASADENA_ASSET_PATH =
  /^\/(?:ca-shutters|images|js|lightbox|shutter-projects)\//i;

export function rewritePasadenaHtml(html: string, pagePrefix: string): string {
  return html.replace(
    /\b(href|src)=(['"])(.*?)\2/gi,
    (_match, attribute: string, quote: string, value: string) => {
      if (!value.startsWith("/") || value.startsWith("//"))
        return attribute + "=" + quote + value + quote;

      const rewritten = PASADENA_ASSET_PATH.test(value)
        ? "/tenants/pasadena" + value
        : attribute.toLowerCase() === "href" && pagePrefix
          ? pagePrefix + (value === "/" ? "" : value) || "/"
          : value;

      return attribute + "=" + quote + rewritten + quote;
    },
  );
}
