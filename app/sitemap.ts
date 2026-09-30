import type { MetadataRoute } from "next";
import { listLegacyPages, routeToUrl } from "../lib/legacy-pages";
import { services } from "../src/data/services";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...new Set([
      ...listLegacyPages().map((p) => p.routePath),
      "gallery",
      "consultation",
      "send-photos",
      ...services.map((s) => `services/${s.slug}`),
    ]),
  ].map((route) => ({
    url: routeToUrl(route),
    changeFrequency: route ? "monthly" : "weekly",
    priority: route ? 0.7 : 1,
  }));
}
