import type { MetadataRoute } from 'next';
import { listLegacyPages, routeToUrl } from '../lib/legacy-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  return listLegacyPages().map((page) => ({
    url: routeToUrl(page.routePath),
    lastModified: new Date(),
    changeFrequency: page.routePath === '' ? 'weekly' : 'monthly',
    priority: page.routePath === '' ? 1 : 0.7,
  }));
}