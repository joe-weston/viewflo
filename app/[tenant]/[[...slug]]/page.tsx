import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { PASADENA_TENANT, tenantForHost } from "../../../lib/tenant-routing";
import {
  PASADENA_ORIGIN,
  legacyRedirects,
  normalizePublicPath,
  publicRoutes,
} from "../../../lib/pasadena-site";
import { services } from "../../../src/data/services";
import { SiteHeader } from "../../../src/components/layout/SiteHeader";
import { SiteFooter } from "../../../src/components/layout/SiteFooter";
import { TenantSiteProvider } from "../../../src/components/TenantLink";
import { Home } from "../../../src/screens/Home";
import { GalleryPage } from "../../../src/screens/GalleryPage";
import { Consultation } from "../../../src/screens/Consultation";
import { PhotoIntake as SendPhotos } from "../../../src/screens/PhotoIntake";
import { ServiceDetail } from "../../../src/screens/ServiceDetail";
import { LegalPage } from "../../../src/screens/LegalPage";
import { PasadenaTheme } from "../../../src/tenants/pasadena/PasadenaTheme";
import { isPalettePreviewEnabled } from "../../../lib/palette-preview";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ tenant: string; slug?: string[] }>;
  searchParams: Promise<{ __viewflo_tenant_host?: string }>;
};
const titles: Record<string, string> = {
  "": "Custom Window Treatments in Pasadena",
  gallery: "Local Window Treatment Projects",
  consultation: "Request a Design Consultation",
  "photo-intake": "Send Photos of Your Windows",
  privacy: "Privacy Policy",
  terms: "Terms of Use",
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { tenant, slug } = await params;
  if (tenant !== PASADENA_TENANT) notFound();
  const route = normalizePublicPath(slug?.join("/") || "");
  const service = services.find((s) => route === "services/" + s.slug);
  const canonical = PASADENA_ORIGIN + (route ? "/" + route + "/" : "/");
  const requestHeaders = await headers();
  const canonicalHost =
    ((await searchParams).__viewflo_tenant_host === tenant ||
      requestHeaders.get("x-viewflo-tenant-host") === tenant ||
      tenantForHost(requestHeaders.get("host")) !== null) &&
    process.env.VERCEL_ENV !== "preview";
  return {
    title: {
      absolute:
        (titles[route] || service?.name || "Page not found") +
        " | Pasadena Shades & Shutters",
    },
    description:
      service?.blurb ||
      "Custom shutters, shades, blinds, drapery and motorized window treatments. Personal design guidance with Robin Alvarez. Call 818-618-5288.",
    alternates: { canonical },
    robots: { index: canonicalHost, follow: canonicalHost },
    openGraph: {
      url: canonical,
      title: titles[route] || service?.name,
      siteName: "Pasadena Shades & Shutters",
      images: [PASADENA_ORIGIN + "/818aaed5-2de2-408a-9918-b48936405ebb.jpg"],
    },
  };
}
import { PasadenaAnalytics } from "../../../src/components/PasadenaAnalytics";
export default async function Page({ params, searchParams }: Props) {
  const { tenant, slug } = await params;
  if (tenant !== PASADENA_TENANT) notFound();
  const route = normalizePublicPath(slug?.join("/") || "");
  const requestHeaders = await headers();
  const prefix =
    (await searchParams).__viewflo_tenant_host === tenant ||
    requestHeaders.get("x-viewflo-tenant-host") === tenant ||
    tenantForHost(requestHeaders.get("host")) === tenant
      ? ""
      : "/" + tenant;
  if (route && legacyRedirects[route])
    permanentRedirect(
      legacyRedirects[route] === "/sitemap.xml"
        ? "/sitemap.xml"
        : prefix + legacyRedirects[route],
    );
  if (route === "send-photos") permanentRedirect(prefix + "/photo-intake/");
  if (!publicRoutes.includes(route as (typeof publicRoutes)[number]))
    notFound();
  const content =
    route === "" ? (
      <Home />
    ) : route === "gallery" ? (
      <GalleryPage />
    ) : route === "consultation" ? (
      <Consultation />
    ) : route === "photo-intake" ? (
      <SendPhotos />
    ) : route === "privacy" || route === "terms" ? (
      <LegalPage kind={route} />
    ) : (
      <ServiceDetail slug={route.split("/")[1]} />
    );
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": PASADENA_ORIGIN + "/#business",
    name: "Pasadena Shades & Shutters",
    url: PASADENA_ORIGIN,
    telephone: "+18186185288",
    areaServed: ["Pasadena", "Montrose", "Glendale", "South Pasadena"],
    sameAs: [
      "https://www.yelp.com/biz/pasadena-shades-and-shutters-montrose",
      "https://www.google.com/maps?cid=10720248438238584178",
    ],
  };
  return (
    <TenantSiteProvider prefix={prefix}>
      <PasadenaTheme preview={isPalettePreviewEnabled(process.env)}>
        {isPalettePreviewEnabled(process.env) && (
          <p className="preview-banner">
            Website preview - publication pending
          </p>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        <PasadenaAnalytics
          enabled={
            process.env.VERCEL_ENV === "production" &&
            process.env.PASADENA_ANALYTICS_ENABLED === "true"
          }
        />
        <SiteHeader />
        {content}
        <SiteFooter />
      </PasadenaTheme>
    </TenantSiteProvider>
  );
}
