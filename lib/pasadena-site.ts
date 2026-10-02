import {
  normalizeHostname,
  PASADENA_TENANT,
  PASADENA_HOSTS,
} from "./tenant-routing";
export const PASADENA_ORIGIN = "https://www.pasadenashadesandshutters.com";
export const legacyRedirects: Readonly<Record<string, string>> = {
  "": "/",
  "about-us.php": "/#about",
  "ca-shutters": "/#service-area",
  "ca-shutters/altadena-shutters.php": "/#service-area",
  "ca-shutters/arcadia-shutters.php": "/#service-area",
  "ca-shutters/burbank-shutters.php": "/#service-area",
  "ca-shutters/echo-park-shutters.php": "/#service-area",
  "ca-shutters/glendale-shutters.php": "/#service-area",
  "ca-shutters/la-canada-shutters.php": "/#service-area",
  "ca-shutters/la-crescenta-shutters.php": "/#service-area",
  "ca-shutters/los-angeles-shutters.php": "/#service-area",
  "ca-shutters/monrovia-shutters.php": "/#service-area",
  "ca-shutters/montrose-shutters.php": "/#service-area",
  "ca-shutters/pasadena-shutters.php": "/#service-area",
  "ca-shutters/san-marino-shutters.php": "/#service-area",
  "ca-shutters/silverlake-shutters.php": "/#service-area",
  "ca-shutters/south-pasadena-shutters.php": "/#service-area",
  "ca-shutters/sun-valley-shutters.php": "/#service-area",
  "ca-shutters/sunland-shutters.php": "/#service-area",
  "ca-shutters/toluca-lake-shutters.php": "/#service-area",
  "contact-us.php": "/consultation/",
  "faqs.php": "/#faq",
  "faux-wood-blinds-pasadena.php": "/services/blinds/",
  "feedback.php": "/#reviews",
  "newsletter.php": "/",
  "our-services.php": "/#services",
  "pasadena-shades.php": "/services/shades/",
  "pasadena-shutters": "/#services",
  "pasadena-shutters.php": "/services/shutters/",
  "pasadena-shutters/category/window-treatments": "/#services",
  "pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds":
    "/services/blinds/",
  "pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering":
    "/#services",
  "pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds":
    "/#services",
  "pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference":
    "/#services",
  "pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons":
    "/services/shades/",
  "pasadena-window-treatments.php": "/services/drapery/",
  "pasadena-wood-blinds.php": "/services/blinds/",
  "polycore-shutters-pasadena.php": "/services/shutters/",
  "privacy.php": "/privacy/",
  "shutter-projects": "/gallery/",
  "shutter-projects/motorized-roller-shades-on-las-flores-dr-in-glendale-ca.php":
    "/gallery/",
  "shutter-projects/motorized-roller-shades-on-madeline-dr-in-pasadena-ca.php":
    "/gallery/",
  "shutter-projects/norman-woodlore-plantation-shutters-on-oak-knoll-gardens-dr-in-pasadena-ca.php":
    "/gallery/",
  "shutter-projects/pinch-pleated-drapes-track-traverse-rods-under-cornice-hillard-ave-la-canada-flintridge-ca.php":
    "/gallery/",
  "shutter-projects/woven-wood-shades-on-toluca-estates-dr-in-toluca-lake-ca.php":
    "/gallery/",
  "sitemap.php": "/sitemap.xml",
  "specials.php": "/consultation/",
  "terms.php": "/terms/",
  "testimonials.php": "/#reviews",
  "videos.php": "/gallery/",
  "woven-wood-shades-pasadena.php": "/services/shades/",
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
  if (target) return custom ? target : prefix + target;
  return null;
}
