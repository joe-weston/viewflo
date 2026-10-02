import {
  normalizeHostname,
  PASADENA_TENANT,
  PASADENA_HOSTS,
} from "./tenant-routing";
export const PASADENA_ORIGIN = "https://www.pasadenashadesandshutters.com";
export const legacyRedirects: Readonly<Record<string, string>> = {
  "": "/",
  "about-us.php": "/#meet_robin",
  "ca-shutters": "/#service-area",
  "ca-shutters/altadena-shutters.php": "/#altadena",
  "ca-shutters/arcadia-shutters.php": "/#arcadia",
  "ca-shutters/burbank-shutters.php": "/#burbank",
  "ca-shutters/echo-park-shutters.php": "/#echo-park",
  "ca-shutters/glendale-shutters.php": "/#glendale",
  "ca-shutters/la-canada-shutters.php": "/#la-canada",
  "ca-shutters/la-crescenta-shutters.php": "/#la-crescenta",
  "ca-shutters/los-angeles-shutters.php": "/#los-angeles",
  "ca-shutters/monrovia-shutters.php": "/#monrovia",
  "ca-shutters/montrose-shutters.php": "/#montrose",
  "ca-shutters/pasadena-shutters.php": "/#pasadena",
  "ca-shutters/san-marino-shutters.php": "/#san-marino",
  "ca-shutters/silverlake-shutters.php": "/#silverlake",
  "ca-shutters/south-pasadena-shutters.php": "/#south-pasadena",
  "ca-shutters/sun-valley-shutters.php": "/#sun-valley",
  "ca-shutters/sunland-shutters.php": "/#sunland",
  "ca-shutters/toluca-lake-shutters.php": "/#toluca-lake",
  "contact-us.php": "/consultation/",
  "faqs.php": "/#choosing-treatments",
  "faux-wood-blinds-pasadena.php": "/services/blinds/#faux-wood-blinds",
  "feedback.php": "/#reviews",
  "newsletter.php": "/",
  "our-services.php": "/#what_we_make",
  "pasadena-shades.php": "/services/shades/",
  "pasadena-shutters": "/#what_we_make",
  "pasadena-shutters.php": "/services/shutters/",
  "pasadena-shutters/category/window-treatments": "/#what_we_make",
  "pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds":
    "/services/blinds/#faux-wood-blinds",
  "pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering":
    "/#how_it_works",
  "pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds":
    "/#how_it_works",
  "pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference":
    "/#what_we_make",
  "pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons":
    "/services/shades/#woven-wood-shades",
  "pasadena-window-treatments.php": "/services/drapery/",
  "pasadena-wood-blinds.php": "/services/blinds/#wood-blinds",
  "polycore-shutters-pasadena.php": "/services/shutters/#polycore-shutters",
  "privacy.php": "/privacy/",
  "shutter-projects": "/gallery/",
  "shutter-projects/motorized-roller-shades-on-las-flores-dr-in-glendale-ca.php":
    "/gallery/#motorized-roller-shades-on-las-flores-dr-in-glendale-ca",
  "shutter-projects/motorized-roller-shades-on-madeline-dr-in-pasadena-ca.php":
    "/gallery/#motorized-roller-shades-on-madeline-dr-in-pasadena-ca",
  "shutter-projects/norman-woodlore-plantation-shutters-on-oak-knoll-gardens-dr-in-pasadena-ca.php":
    "/gallery/#norman-woodlore-plantation-shutters-on-oak-knoll-gardens-dr-in-pasadena-ca",
  "shutter-projects/pinch-pleated-drapes-track-traverse-rods-under-cornice-hillard-ave-la-canada-flintridge-ca.php":
    "/gallery/#pinch-pleated-drapes-track-traverse-rods-under-cornice-hillard-ave-la-canada-flintridge-ca",
  "shutter-projects/woven-wood-shades-on-toluca-estates-dr-in-toluca-lake-ca.php":
    "/gallery/#woven-wood-shades-on-toluca-estates-dr-in-toluca-lake-ca",
  "sitemap.php": "/sitemap.xml",
  "specials.php": "/consultation/",
  "terms.php": "/terms/",
  "testimonials.php": "/#reviews",
  "videos.php": "/gallery/#before_and_after",
  "woven-wood-shades-pasadena.php": "/services/shades/#woven-wood-shades",
};
export const publicRoutes = [
  "",
  "gallery",
  "consultation",
  "photo-intake",
  "services/shutters",
  "services/shades",
  "services/blinds",
  "services/drapery",
  "services/motorized",
  "privacy",
  "terms",
] as const;
export function normalizePublicPath(path: string) {
  return path.replace(/^\/+|\/+$/g, "").replace(/(?:^|\/)index\.html$/, "");
}
export function publicRedirect(
  host: string | null,
  pathname: string,
  production = false,
): string | null {
  const hostname = normalizeHostname(host);
  const prefix = "/" + PASADENA_TENANT;
  const prefixed = pathname === prefix || pathname.startsWith(prefix + "/");
  const custom = PASADENA_HOSTS.has(hostname);
  if (!custom && !prefixed) return null;
  const route = normalizePublicPath(
    prefixed ? pathname.slice(prefix.length) : pathname,
  );
  const platform = /^(?:admin|api|auth|account|tenants|_next)(?:\/|$)/.test(
    route,
  );
  if (platform) return null;
  const legacy = route && legacyRedirects[route];
  const target = legacy || (route === "send-photos" ? "/photo-intake/" : null);
  const originRedirect =
    (custom &&
      (hostname !== "www.pasadenashadesandshutters.com" || prefixed)) ||
    (production &&
      (hostname === "viewflo.app" || hostname === "www.viewflo.app") &&
      prefixed &&
      !/^admin(?:\/|$)/.test(route));
  const canonicalPath = route
    ? "/" + route + (/\.[a-z0-9]+$/i.test(route) ? "" : "/")
    : "/";
  if (originRedirect) return PASADENA_ORIGIN + (target || canonicalPath);
  if (target)
    return custom || target === "/sitemap.xml" ? target : prefix + target;
  return null;
}
