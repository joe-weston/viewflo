import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  MAX_BODY_BYTES,
  validateContact,
  validatePhotos,
} from "./photo-validation";
export type Intake = {
  id: string;
  fingerprint: string;
  contact: string;
  notes: string;
  consent: true;
  images: Buffer[];
};
export type IntakeDependencies = {
  ready: () => boolean;
  verify: (token: string) => Promise<boolean>;
  save: (request: Intake) => Promise<void>;
};
const json = (status: number, body: object) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function handlePhotoIntake(
  request: Request,
  deps: IntakeDependencies,
) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") || requestUrl.host;
  let sameOrigin = false;
  try {
    const submittedOrigin = new URL(origin || "");
    sameOrigin =
      submittedOrigin.host === host &&
      submittedOrigin.protocol === requestUrl.protocol;
  } catch {
    /* Missing or malformed origins are rejected. */
  }
  if (!sameOrigin)
    return json(403, { error: "Please submit from this website." });
  if (!deps.ready())
    return json(503, {
      error:
        "Photo requests are temporarily unavailable. Please call 818-618-5288. Your photos have not been sent.",
    });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return json(415, { error: "Use the photo request form." });
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES)
    return json(413, {
      error: "Choose up to 3 photos, no larger than 1 MB each.",
    });
  try {
    // Bound the actual stream as well as Content-Length; stop before decoding multipart.
    const reader = request.body?.getReader();
    if (!reader) return json(400, { error: "Please complete the form." });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return json(413, { error: "The upload is too large." });
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const contact = String(form.get("contact") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const files = form
      .getAll("photos")
      .filter((x): x is File => x instanceof File);
    if (form.get("website"))
      return json(400, { error: "Unable to accept this request." });
    if (!validateContact(contact))
      return json(400, {
        error: "Enter a valid phone number or email address.",
      });
    if (notes.length > 2000)
      return json(400, {
        error: "Keep your project notes under 2,000 characters.",
      });
    if (form.get("consent") !== "yes")
      return json(400, {
        error: "Please confirm permission to use your photos for this request.",
      });
    const photoError = validatePhotos(files);
    if (photoError) return json(400, { error: photoError });
    const token = String(form.get("verification") || "");
    if (!token || token.length > 2048 || !(await deps.verify(token)))
      return json(400, { error: "Please complete the security check again." });
    const images: Buffer[] = [];
    for (const file of files) {
      try {
        const bytes = Buffer.from(await file.arrayBuffer());
        const image = sharp(bytes, {
          limitInputPixels: 24000000,
          failOn: "warning",
        });
        const meta = await image.metadata();
        if (
          !["jpeg", "png"].includes(meta.format || "") ||
          (meta.pages || 1) > 1
        )
          throw new Error("format");
        images.push(
          await image
            .rotate()
            .resize({
              width: 2000,
              height: 2000,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer(),
        );
      } catch {
        return json(400, {
          error:
            "One photo could not be read. Choose a valid JPG or PNG image.",
        });
      }
    }
    const id = String(form.get("requestId") || "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return json(400, { error: "Please reload the form and try again." });
    const hash = createHash("sha256").update(
      JSON.stringify({ contact, notes }),
    );
    for (const image of images) hash.update(image);
    const fingerprint = hash.digest("hex");
    try {
      await deps.save({
        id,
        fingerprint,
        contact,
        notes,
        consent: true,
        images,
      });
    } catch {
      return json(503, {
        error:
          "We could not save your request. Please try again or call 818-618-5288.",
      });
    }
    return json(201, { reference: id });
  } catch {
    return json(400, {
      error: "The upload could not be read. Please try again.",
    });
  }
}
