import { tenantContext } from "../../../../../../lib/portal";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant: string; kind: string }> },
) {
  const { tenant, kind } = await params;
  const ctx = await tenantContext(tenant);
  if (!ctx || !["terms", "privacy", "sow"].includes(kind))
    return new Response("Unavailable", { status: 404 });
  const version = new URL(request.url).searchParams.get("version");
  if (!version || version.length > 100)
    return new Response("Unavailable", { status: 404 });
  let query = ctx.db
    .from("vf_documents")
    .select("title,body,version")
    .eq("kind", kind)
    .eq("version", version)
    .not("published_at", "is", null);
  query =
    kind === "sow"
      ? query.eq("tenant_id", ctx.tenant.id)
      : query.is("tenant_id", null);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return new Response("Unavailable", { status: 404 });
  return new Response(
    `${data.title}\nVersion: ${data.version}\n\n${data.body}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="viewflow-${kind}.txt"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
