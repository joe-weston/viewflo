import { createClient } from "@supabase/supabase-js";
import { handlePhotoIntake, type Intake } from "../../../lib/photo-intake";
export const runtime = "nodejs";
export const maxDuration = 30;
function ready() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.TURNSTILE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.PHOTO_INTAKE_HOSTNAME &&
    process.env.PHOTO_INTAKE_ENABLED === "true"
  );
}
async function verify(token: string) {
  try {
    const result = await fetch(
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
    const data = await result.json();
    return (
      data.success === true &&
      data.action === "photo-quote" &&
      data.hostname === process.env.PHOTO_INTAKE_HOSTNAME
    );
  } catch {
    return false;
  }
}
async function save(intake: Intake) {
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const bucket = client.storage.from("pasadena-photo-requests");
  const existing = await client
    .from("pasadena_photo_requests")
    .select("fingerprint")
    .eq("id", intake.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.fingerprint === intake.fingerprint) return;
    throw new Error("Request identity conflict");
  }
  const paths: string[] = [];
  let insertAttempted = false;
  try {
    for (const [i, image] of intake.images.entries()) {
      const path = `${intake.id}/${i + 1}.jpg`;
      const { error } = await bucket.upload(path, image, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
    }
    insertAttempted = true;
    const { error } = await client.from("pasadena_photo_requests").insert({
      id: intake.id,
      fingerprint: intake.fingerprint,
      contact: intake.contact,
      notes: intake.notes,
      photo_paths: paths,
      consent_at: new Date().toISOString(),
      status: "new",
    });
    if (error) throw error;
  } catch (error) {
    // An insert timeout may have committed. Never delete photos referenced by a saved row.
    if (insertAttempted) {
      const saved = await client
        .from("pasadena_photo_requests")
        .select("fingerprint")
        .eq("id", intake.id)
        .maybeSingle();
      if (saved.data?.fingerprint === intake.fingerprint) return;
      if (saved.error) throw error; // Preserve uncertain uploads for operator reconciliation.
    }
    if (paths.length) await bucket.remove(paths);
    throw error;
  }
}
export function POST(request: Request) {
  return handlePhotoIntake(request, { ready, verify, save });
}
