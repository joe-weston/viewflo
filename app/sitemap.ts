import type { MetadataRoute } from "next";
import { publicRoutes, PASADENA_ORIGIN } from "../lib/pasadena-site";
export default function sitemap(): MetadataRoute.Sitemap {
 return publicRoutes.map(route=>({url:PASADENA_ORIGIN+(route?"/"+route+"/":"/"),changeFrequency:"monthly",priority:route?0.7:1}));
}
