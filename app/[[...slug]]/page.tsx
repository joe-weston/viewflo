import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegacyPage, listLegacyPages, routeToUrl } from '../../lib/legacy-pages';
import { LegacyWufooEmbeds } from '../legacy-wufoo-embeds';

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return listLegacyPages().map((page) => ({ slug: page.routePath ? page.routePath.split('/') : undefined }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegacyPage(slug);
  if (!page) return {};

  return {
    title: page.meta.title,
    description: page.meta.description,
    keywords: page.meta.keywords,
    alternates: {
      canonical: routeToUrl(page.routePath),
    },
    openGraph: {
      title: page.meta.ogTitle || page.meta.title,
      description: page.meta.description,
      url: routeToUrl(page.routePath),
      images: page.meta.ogImage ? [page.meta.ogImage] : ['/images/logo.png'],
    },
  };
}

export default async function LegacyPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getLegacyPage(slug);
  if (!page) notFound();

  return (
    <>
      <div className="next-migration-note" data-source={page.sourcePath} data-route={page.routePath} />
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyWufooEmbeds />
    </>
  );
}