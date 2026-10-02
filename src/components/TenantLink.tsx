"use client";
import Link from "next/link";
import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";

const Prefix = createContext("/pasadena-shades-and-shutters");
export function TenantSiteProvider({
  prefix,
  children,
}: {
  prefix: string;
  children: ReactNode;
}) {
  return <Prefix.Provider value={prefix}>{children}</Prefix.Provider>;
}
export function TenantLink({ href, ...props }: ComponentProps<typeof Link>) {
  const prefix = useContext(Prefix);
  const slug = "/pasadena-shades-and-shutters";
  const target =
    typeof href === "string" && (href === slug || href.startsWith(slug + "/"))
      ? prefix + href.slice(slug.length) || "/"
      : href;
  return <Link href={target} {...props} />;
}
