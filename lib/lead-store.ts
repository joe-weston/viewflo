import "server-only";
import { createClient } from "@supabase/supabase-js";
import { LeadResend, sendLeadEmail } from "./lead-resend";
import { createHash, timingSafeEqual } from "node:crypto";
import type { SavedLead } from "./lead-intake";
import { processEmailJobs, type EmailJob } from "./lead-email";
function database() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
      },
    },
  );
}
export function leadReady() {
  return (
    process.env.LEAD_INTAKE_ENABLED === "true" &&
    !!(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.LEAD_INTAKE_HOSTNAMES
    )
  );
}
export async function verifyLead(token: string, hostname: string) {
  if (
    !process.env.LEAD_INTAKE_HOSTNAMES?.split(",")
      .map((h) => h.trim())
      .includes(hostname)
  )
    return false;
  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: token,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const data = await r.json();
    return (
      data.success === true &&
      data.action === "lead-intake" &&
      data.hostname === hostname
    );
  } catch {
    return false;
  }
}
export async function saveLead(lead: SavedLead) {
  const db = database();
  const { data: tenant, error: tenantError } = await db
    .from("vf_tenants")
    .select("id")
    .eq("slug", lead.tenantSlug)
    .single();
  if (tenantError || !tenant) throw new Error("Tenant unavailable");
  const { data: existing, error: readError } = await db
    .from("vf_leads")
    .select("tenant_id,fingerprint")
    .eq("id", lead.id)
    .maybeSingle();
  if (readError) throw new Error("Intake unavailable");
  if (existing) {
    if (
      existing.tenant_id !== tenant.id ||
      existing.fingerprint !== lead.fingerprint
    )
      throw new Error("Identity conflict");
    return;
  }
  const bucket = db.storage.from("vf-lead-photos");
  const { data: config, error: configError } =
    await db.storage.getBucket("vf-lead-photos");
  if (configError || !config || config.public)
    throw new Error("Private storage unavailable");
  const photos = [];
  for (const [i, image] of lead.images.entries()) {
    // Fingerprint-separated immutable paths avoid retries overwriting another request's photos.
    const path = `${tenant.id}/${lead.id}/${lead.fingerprint}/${i + 1}.jpg`;
    const { error } = await bucket.upload(path, image, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) {
      // An existing immutable object is safe only when its bytes match this normalized image.
      const { data } = await bucket.download(path);
      if (!data || !Buffer.from(await data.arrayBuffer()).equals(image))
        throw new Error("Upload unavailable");
    }
    photos.push({
      sequence: i + 1,
      storage_path: path,
      size_bytes: image.length,
    });
  }
  const { images: _images, tenantSlug: _slug, ...input } = lead;
  void _images;
  void _slug;
  const { error } = await db.rpc("vf_create_lead", {
    p_slug: lead.tenantSlug,
    p_lead: input,
    p_photos: photos,
  });
  if (error) {
    const { data: saved } = await db
      .from("vf_leads")
      .select("fingerprint,tenant_id")
      .eq("id", lead.id)
      .maybeSingle();
    if (
      saved?.fingerprint === lead.fingerprint &&
      saved.tenant_id === tenant.id
    )
      return;
    // Preserve uncertain uploads for reconciliation; never delete objects concurrently referenced by a committed lead.
    throw new Error("Save unavailable");
  }
}
export async function deliverLeadEmails(
  leadId: string | null = null,
): Promise<"sent" | "queued"> {
  if (!process.env.RESEND_API_KEY) return "queued";
  const db = database();
  const { data, error } = await db.rpc("vf_claim_lead_email", {
    p_lead: leadId,
    p_limit: 6,
  });
  if (error) throw new Error("Claim unavailable");
  const resend = new LeadResend(process.env.RESEND_API_KEY);
  await processEmailJobs(
    (data || []) as EmailJob[],
    (job) => sendLeadEmail(resend, job),
    async (job, id, category) => {
      const { error: finishError } = await db.rpc("vf_finish_lead_email", {
        p_id: job.id,
        p_claim: job.claim_token,
        p_resend_id: id,
        p_error: category,
      });
      if (finishError) throw new Error("Delivery reconciliation required");
      if (!id)
        console.warn("lead_email_retry", { reference: job.lead_id, category });
    },
  );
  if (!leadId) return "queued";
  const { data: statuses, error: statusError } = await db
    .from("vf_lead_email_outbox")
    .select("status")
    .eq("lead_id", leadId)
    .eq("audience", "submitter");
  return !statusError &&
    statuses?.length &&
    statuses.every((row) => row.status === "sent")
    ? "sent"
    : "queued";
}
export function authorizedCron(
  header: string | null,
  secret = process.env.CRON_SECRET,
) {
  if (!secret || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
