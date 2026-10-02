import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  handlePhotoIntake,
  type Intake,
  type IntakeDependencies,
} from "../lib/photo-intake";
import {
  validateContact,
  validatePhotos,
  MAX_BODY_BYTES,
} from "../lib/photo-validation";
const url = "http://localhost:3100/api/photo-requests/";
async function request(overrides: Record<string, string | Blob> = {}) {
  const form = new FormData();
  form.append("contact", "qa@example.invalid");
  form.append("requestId", "9de946f4-d6b0-4d2d-9c5b-4ca43ab9598e");
  form.append("notes", "Synthetic test only");
  form.append("consent", "yes");
  form.append("verification", "synthetic-test-token");
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#998877" },
  })
    .withMetadata({ exif: { IFD0: { Artist: "Synthetic QA" } } })
    .png()
    .toBuffer();
  form.append("photos", new Blob([image], { type: "image/png" }), "window.png");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return new Request(url, {
    method: "POST",
    headers: { origin: "http://localhost:3100" },
    body: form,
  });
}
function deps(
  save: (x: Intake) => Promise<void> = async () => {},
): IntakeDependencies {
  return { ready: () => true, verify: async () => true, save };
}
test("valid image is normalized and success follows durable save", async () => {
  let saved: Intake | undefined;
  const input = await request();
  const sourcePhoto = (await input.clone().formData()).get("photos") as File;
  assert.ok(
    (await sharp(Buffer.from(await sourcePhoto.arrayBuffer())).metadata()).exif,
  );
  const response = await handlePhotoIntake(
    input,
    deps(async (x) => {
      saved = x;
    }),
  );
  assert.equal(response.status, 201);
  assert.ok(saved);
  assert.equal(saved.contact, "qa@example.invalid");
  const meta = await sharp(saved.images[0]).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.exif, undefined);
  assert.equal((await response.json()).reference, saved.id);
});
test("host header handles Next local URL normalization without accepting foreign origins", async () => {
  const r = await request();
  r.headers.set("host", "127.0.0.1:3187");
  r.headers.set("origin", "http://127.0.0.1:3187");
  assert.equal((await handlePhotoIntake(r, deps())).status, 201);
  const invalid = await request();
  invalid.headers.set("host", "127.0.0.1:3187");
  assert.equal((await handlePhotoIntake(invalid, deps())).status, 403);
});
test("identical retry retains identity and content fingerprint", async () => {
  const saved: Intake[] = [];
  const d = deps(async (x) => {
    saved.push(x);
  });
  await handlePhotoIntake(await request(), d);
  await handlePhotoIntake(await request(), d);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].id, saved[1].id);
  assert.equal(saved[0].fingerprint, saved[1].fingerprint);
});
test("invalid request identity is rejected", async () => {
  assert.equal(
    (await handlePhotoIntake(await request({ requestId: "bad" }), deps()))
      .status,
    400,
  );
});
test("unconfigured intake fails closed without accepting photos", async () => {
  const d = deps();
  d.ready = () => false;
  assert.equal((await handlePhotoIntake(await request(), d)).status, 503);
});
test("cross-origin requests are rejected", async () => {
  const r = await request();
  r.headers.set("origin", "https://unrelated.invalid");
  assert.equal((await handlePhotoIntake(r, deps())).status, 403);
});
test("contact must be a real email/phone shape", () => {
  for (const c of [
    "not an email",
    "..........",
    "1234",
    "12345678901234567890",
  ])
    assert.equal(validateContact(c), false);
  assert.equal(validateContact("818-618-5288"), true);
  assert.equal(validateContact("qa@example.invalid"), true);
});
test("requires consent and rejects invalid contact, overlong notes, honeypot", async () => {
  for (const override of [
    { consent: "" },
    { contact: "invalid" },
    { notes: "x".repeat(2001) },
    { website: "spam" },
  ] as Record<string, string>[])
    assert.equal(
      (await handlePhotoIntake(await request(override), deps())).status,
      400,
    );
});
test("rejects invalid image bytes even with JPEG MIME", async () => {
  const r = await request({
    photos: new Blob(["not a photo"], { type: "image/jpeg" }),
  });
  assert.equal((await handlePhotoIntake(r, deps())).status, 400);
});
test("security failure prevents storage", async () => {
  const d = deps(async () => assert.fail("must not save"));
  d.verify = async () => false;
  assert.equal((await handlePhotoIntake(await request(), d)).status, 400);
});
test("storage failure cannot display success", async () => {
  const response = await handlePhotoIntake(
    await request(),
    deps(async () => {
      throw new Error("private configuration");
    }),
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("private configuration"));
});
test("file constraints cover empty, count, size and unsupported types", () => {
  assert.ok(validatePhotos([]));
  assert.ok(validatePhotos(Array(4).fill({ size: 10, type: "image/jpeg" })));
  assert.ok(validatePhotos([{ size: 1048577, type: "image/png" }]));
  assert.ok(validatePhotos([{ size: 0, type: "image/png" }]));
  assert.ok(validatePhotos([{ size: 10, type: "image/svg+xml" }]));
  assert.equal(validatePhotos([{ size: 1048576, type: "image/jpeg" }]), null);
});
test("body limits enforced from header and actual stream", async () => {
  const r = await request();
  r.headers.set("content-length", String(MAX_BODY_BYTES + 1));
  assert.equal((await handlePhotoIntake(r, deps())).status, 413);
  const streamed = new Request(url, {
    method: "POST",
    headers: {
      origin: "http://localhost:3100",
      "content-type": "multipart/form-data; boundary=x",
    },
    body: "a".repeat(MAX_BODY_BYTES + 1),
  });
  assert.equal((await handlePhotoIntake(streamed, deps())).status, 413);
});
