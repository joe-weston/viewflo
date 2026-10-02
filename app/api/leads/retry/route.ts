import {
  authorizedCron,
  deliverLeadEmails,
  leadReady,
} from "../../../../lib/lead-store";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorizedCron(request.headers.get("authorization")))
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!leadReady() || !process.env.RESEND_API_KEY)
    return Response.json(
      { error: "Delivery unavailable" },
      { status: 503, headers },
    );
  try {
    await deliverLeadEmails();
    return Response.json({ processed: true }, { headers });
  } catch {
    console.error("lead_email_worker_unavailable");
    return Response.json({ error: "Retry later" }, { status: 503, headers });
  }
}
