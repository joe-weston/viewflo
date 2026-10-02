"use server";
import { redirect } from "next/navigation";
import { agreements, tenantContext, tenantSow } from "../../../lib/portal";
import { billingRole, safeSlug } from "../../../lib/portal-policy";
import { checkout, portal } from "../../../lib/billing";
import { requestPortal } from "../../../lib/portal-request";
import { tenantPath } from "../../../lib/portal-urls";
export async function acceptDocument(form: FormData) {
  const slug = String(form.get("tenant") ?? "");
  if (!safeSlug(slug)) redirect("/auth");
  const location = await requestPortal(slug);
  const ctx = await tenantContext(slug);
  if (!ctx || !billingRole(ctx.role))
    redirect(tenantPath(location, "/admin") + "?error=access");
  const id = String(form.get("document") ?? "");
  const docs = await agreements(ctx.db);
  const sow = await tenantSow(ctx.db, ctx.tenant.id);
  if (sow) docs.push(sow);
  const document = docs.find((d) => d.id === id);
  if (!document || form.get("choice") !== "yes")
    redirect(tenantPath(location, "/admin") + "?error=agreement");
  const { error } = await ctx.db.rpc("vf_accept_document", {
    p_tenant: ctx.tenant.id,
    p_document: id,
  });
  if (error) redirect(tenantPath(location, "/admin") + "?error=agreement");
  redirect(
    document.kind === "terms"
      ? tenantPath(location, "/admin/agreements/privacy")
      : tenantPath(location, "/admin/billing"),
  );
}
export async function startCheckout(form: FormData) {
  const slug = String(form.get("tenant") ?? "");
  if (!safeSlug(slug)) redirect("/auth");
  const location = await requestPortal(slug);
  let url: string;
  try {
    url = await checkout(slug);
  } catch {
    redirect(tenantPath(location, "/admin/billing") + "?error=unavailable");
  }
  redirect(url);
}
export async function openPortal(form: FormData) {
  const slug = String(form.get("tenant") ?? "");
  if (!safeSlug(slug)) redirect("/auth");
  const location = await requestPortal(slug);
  let url: string;
  try {
    url = await portal(slug);
  } catch {
    redirect(tenantPath(location, "/admin/billing") + "?error=unavailable");
  }
  redirect(url);
}
