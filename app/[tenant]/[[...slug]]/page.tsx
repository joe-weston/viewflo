import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getLegacyPage as getPasadenaPage,
  listLegacyPages as listPasadenaPages,
  routeToUrl as pasadenaRouteToUrl,
} from "../../../lib/pasadena-pages";
import {
  normalizeHostname,
  PASADENA_HOSTS,
  PASADENA_TENANT,
  rewritePasadenaHtml,
} from "../../../lib/tenant-routing";
import { services } from "../../../src/data/services";
import { SiteFooter } from "../../../src/components/layout/SiteFooter";
import { SiteHeader } from "../../../src/components/layout/SiteHeader";
import { GalleryPage } from "../../../src/screens/GalleryPage";
import { Consultation } from "../../../src/screens/Consultation";
import { SendPhotos } from "../../../src/screens/SendPhotos";
import { ServiceDetail } from "../../../src/screens/ServiceDetail";
import { PasadenaLegacyDocument } from "../../../src/tenants/pasadena/PasadenaLegacyDocument";

const modernRoutes = [
  "gallery",
  "consultation",
  "send-photos",
  ...services.map((service) => "services/" + service.slug),
];

const modernTitles: Record<string, string> = {
  gallery: "Local Window Treatment Projects",
  consultation: "Request a Consultation",
  "send-photos": "Send Window Photos for a Quote",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenant: string; slug?: string[] }>;
  searchParams: Promise<{ __viewflo_tenant_host?: string }>;
};

export function generateStaticParams() {
  const routes = new Set([
    ...listPasadenaPages().map((page) => page.routePath),
    ...modernRoutes,
  ]);
  return [...routes].map((route) => ({
    tenant: PASADENA_TENANT,
    slug: route ? route.split("/") : [],
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, tenant } = await params;
  if (tenant !== PASADENA_TENANT) notFound();

  const route = slug?.join("/") || "";
  const page = getPasadenaPage(slug);
  if (page) {
    return {
      title: { absolute: page.meta.title },
      description: page.meta.description,
      keywords: page.meta.keywords,
      alternates: { canonical: pasadenaRouteToUrl(page.routePath) },
      openGraph: {
        title: page.meta.ogTitle || page.meta.title,
        description: page.meta.description,
        url: pasadenaRouteToUrl(page.routePath),
        images: page.meta.ogImage
          ? [page.meta.ogImage]
          : ["/tenants/pasadena/images/logo.png"],
      },
    };
  }

  const service = services.find(
    (candidate) => route === "services/" + candidate.slug,
  );
  if (!service && !modernTitles[route]) return {};

  return {
    title: modernTitles[route] || service?.name,
    description:
      service?.blurb ||
      "Send photos of your windows or request a consultation with Pasadena Shades & Shutters.",
    robots: { index: false, follow: false },
  };
}

function ModernPasadenaPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="preview-banner">Website preview - publication pending</p>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { slug, tenant } = await params;
  if (tenant !== PASADENA_TENANT) notFound();

  const route = slug?.join("/") || "";
  const page = getPasadenaPage(slug);
  if (page) {
    const requestHeaders = await headers();
    const hostname = normalizeHostname(requestHeaders.get("host"));
    const domainContext = await searchParams;
    const pagePrefix =
      domainContext.__viewflo_tenant_host === PASADENA_TENANT ||
      PASADENA_HOSTS.has(hostname)
        ? ""
        : "/" + PASADENA_TENANT;

    return (
      <PasadenaLegacyDocument
        html={rewritePasadenaHtml(page.html, pagePrefix)}
        sourceId={page.routePath || "home"}
      />
    );
  }

  if (route === "gallery")
    return (
      <ModernPasadenaPage>
        <GalleryPage />
      </ModernPasadenaPage>
    );
  if (route === "consultation")
    return (
      <ModernPasadenaPage>
        <Consultation />
      </ModernPasadenaPage>
    );
  if (route === "send-photos")
    return (
      <ModernPasadenaPage>
        <SendPhotos />
      </ModernPasadenaPage>
    );

  const service = services.find(
    (candidate) => route === "services/" + candidate.slug,
  );
  if (service)
    return (
      <ModernPasadenaPage>
        <ServiceDetail slug={service.slug} />
      </ModernPasadenaPage>
    );

  notFound();
}
