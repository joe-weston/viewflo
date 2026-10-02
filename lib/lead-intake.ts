import { createHash } from "node:crypto";
import sharp from "sharp";
import { PASADENA_TENANT, tenantForHost } from "./tenant-routing";
import { MAX_BODY_BYTES, validatePhotos } from "./photo-validation";
import {
  validateLead,
  type LeadInput,
  type LeadDetails,
  type LeadKind,
} from "./lead-fields";
export type SavedLead = LeadInput & {
  tenantSlug: string;
  fingerprint: string;
  images: Buffer[];
};
export type LeadDependencies = {
  ready: () => boolean;
  verify: (token: string, hostname: string) => Promise<boolean>;
  save: (lead: SavedLead) => Promise<void>;
  deliver: (id: string) => Promise<"sent" | "queued">;
};
const json = (status: number, body: object) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function resolveLeadTenant(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  try {
    const origin = new URL(request.headers.get("origin") || "");
    if (origin.host !== host || origin.protocol !== url.protocol) return null;
    const referer = new URL(request.headers.get("referer") || "");
    if (referer.origin !== origin.origin) return null;
    const custom = tenantForHost(host);
    const prefix = custom ? "" : `/${PASADENA_TENANT}`;
    if (!custom && !referer.pathname.startsWith(prefix + "/")) return null;
    const sourcePath = referer.pathname.replace(/\/$/, "");
    if (
      ![
        `${prefix}/consultation`,
        `${prefix}/photo-intake`,
        `${prefix}/send-photos`,
      ].includes(sourcePath)
    )
      return null;
    return {
      tenantSlug: custom || PASADENA_TENANT,
      hostname: origin.hostname,
      sourcePath,
    };
  } catch {
    return null;
  }
}
export async function handleLeadIntake(
  request: Request,
  deps: LeadDependencies,
) {
  const context = resolveLeadTenant(request);
  if (!context)
    return json(403, {
      error: "Please submit from this website's request form.",
    });
  if (!deps.ready())
    return json(503, {
      error:
        "Requests are temporarily unavailable. Please call 818-618-5288. Your request has not been saved.",
    });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return json(415, { error: "Use the request form." });
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES)
    return json(413, {
      error: "Choose up to 3 photos, no larger than 1 MB each.",
    });
  let lead: SavedLead;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json(400, { error: "Please complete the form." });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return json(413, { error: "The upload is too large." });
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const field = (key: string) => String(form.get(key) || "").trim();
    if (field("website"))
      return json(400, { error: "Unable to accept this request." });
    const input: LeadInput = {
      id: field("requestId"),
      kind: field("kind") as LeadKind,
      name: field("name"),
      email: field("email").toLowerCase(),
      phone: field("phone"),
      notes: field("notes"),
      details: JSON.parse(field("details")) as LeadDetails,
      sourcePath: context.sourcePath,
      consentAt: new Date().toISOString(),
    };
    const issue = validateLead(input);
    if (issue) return json(400, { error: issue });
    if (
      (input.kind === "consultation") !==
      context.sourcePath.endsWith("/consultation")
    )
      return json(400, { error: "Use the matching request form." });
    if (field("consent") !== "yes")
      return json(400, {
        error:
          "Please confirm permission to respond to your request and use any photos.",
      });
    const uploads = form.getAll("photos");
    if (uploads.some((f) => !(f instanceof File)))
      return json(400, { error: "Choose valid photo files." });
    const files = uploads as File[];
    if (input.kind === "photo_intake" || files.length) {
      const photoIssue = validatePhotos(files);
      if (photoIssue) return json(400, { error: photoIssue });
    }
    const token = field("verification");
    if (
      !token ||
      token.length > 2048 ||
      !(await deps.verify(token, context.hostname))
    )
      return json(400, { error: "Please complete the security check again." });
    const images: Buffer[] = [];
    for (const file of files) {
      try {
        const image = sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 24000000,
          failOn: "warning",
        });
        const meta = await image.metadata();
        if (
          !["jpeg", "png"].includes(meta.format || "") ||
          (meta.pages || 1) > 1
        )
          throw new Error("image");
        const normalized = await image
          .rotate()
          .resize({
            width: 2000,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        if (normalized.length > 3145728) throw new Error("size");
        images.push(normalized);
      } catch {
        return json(400, {
          error:
            "One photo could not be read. Choose a valid JPG or PNG image.",
        });
      }
    }
    const hash = createHash("sha256").update(
      JSON.stringify({
        ...input,
        consentAt: undefined,
        tenantSlug: context.tenantSlug,
      }),
    );
    images.forEach((image) => hash.update(image));
    lead = {
      ...input,
      tenantSlug: context.tenantSlug,
      fingerprint: hash.digest("hex"),
      images,
    };
  } catch {
    return json(400, {
      error: "The request could not be read. Please try again.",
    });
  }
  try {
    await deps.save(lead);
  } catch {
    return json(503, {
      error:
        "We could not confirm your request was saved. Please retry with the same form or call 818-618-5288.",
    });
  }
  let emailStatus: "sent" | "queued" = "queued";
  try {
    emailStatus = await deps.deliver(lead.id);
  } catch {
    /* Durable outbox owns recovery. */
  }
  return json(201, { reference: lead.id, emailStatus });
}
