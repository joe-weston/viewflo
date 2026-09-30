"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNav({
  items,
  tenantPrefix = "",
}: {
  items: { label: string; href: string }[];
  tenantPrefix?: string;
}) {
  const rawPath = usePathname().replace(/\/$/, "");
  const pathname =
    tenantPrefix &&
    (rawPath === tenantPrefix || rawPath.startsWith(tenantPrefix + "/"))
      ? rawPath.slice(tenantPrefix.length)
      : rawPath;
  return (
    <nav aria-label="Workspace" className="portal-nav admin-tabs">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href.replace(/\/$/, "") ? "page" : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
