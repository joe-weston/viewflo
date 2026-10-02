import { leadOwner, leadId } from "../../../../../../../lib/lead-inbox";
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ tenant: string; id: string; sequence: string }> },
) {
  const { tenant, id, sequence } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (!leadId(id) || !["1", "2", "3"].includes(sequence))
    return new Response("Not found", { status: 404, headers });
  const ctx = await leadOwner(tenant);
  if (!ctx) return new Response("Unavailable", { status: 403, headers });
  const { data: lead, error: leadError } = await ctx.db
    .from("vf_leads")
    .select("id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("environment", ctx.leadEnvironment)
    .eq("id", id)
    .maybeSingle();
  if (leadError || !lead)
    return new Response("Not found", { status: 404, headers });
  const { data, error } = await ctx.db
    .from("vf_lead_photos")
    .select("storage_path")
    .eq("tenant_id", ctx.tenant.id)
    .eq("lead_id", id)
    .eq("sequence", Number(sequence))
    .maybeSingle();
  if (error || !data)
    return new Response("Not found", { status: 404, headers });
  // Cookie-bound RLS, not a service-role URL. No public or optimized-image cache.
  const photo = await ctx.db.storage
    .from("vf-lead-photos")
    .download(data.storage_path);
  if (photo.error || !photo.data)
    return new Response("Unavailable", { status: 503, headers });
  return new Response(photo.data, {
    headers: {
      ...headers,
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'inline; filename="window-photo.jpg"',
    },
  });
}
