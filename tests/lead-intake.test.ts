import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  handleLeadIntake,
  resolveLeadTenant,
  type LeadDependencies,
  type SavedLead,
} from "../lib/lead-intake";
import { MAX_BODY_BYTES } from "../lib/photo-validation";
const id = "9de946f4-d6b0-4d2d-9c5b-4ca43ab9598e";
async function input(
  kind = "consultation",
  overrides: Record<string, string | Blob> = {},
  host = "localhost:3188",
) {
  const form = new FormData();
  Object.entries({
    requestId: id,
    kind,
    name: "Synthetic QA",
    email: "qa@example.invalid",
    phone: kind === "consultation" ? "818-555-0100" : "",
    notes: "Synthetic test only",
    details: JSON.stringify({
      projectTypes: ["shutters"],
      windowCount: "1–2 windows",
      timeline: "Just gathering ideas",
      city: "Pasadena",
      budget: "Not sure yet",
    }),
    consent: "yes",
    verification: "synthetic",
  }).forEach(([k, v]) => form.append(k, v));
  if (kind === "photo_intake") {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#998877" },
    })
      .withMetadata({ exif: { IFD0: { Artist: "QA" } } })
      .png()
      .toBuffer();
    form.append(
      "photos",
      new Blob([bytes], { type: "image/png" }),
      "window.png",
    );
  }
  Object.entries(overrides).forEach(([k, v]) => form.set(k, v));
  const path = kind === "consultation" ? "consultation" : "photo-intake";
  return new Request(`http://${host}/api/leads/`, {
    method: "POST",
    headers: {
      origin: `http://${host}`,
      referer: `http://${host}/pasadena-shades-and-shutters/${path}/`,
    },
    body: form,
  });
}
function dependencies(): LeadDependencies {
  return {
    ready: () => true,
    verify: async () => true,
    save: async () => {},
    deliver: async () => "sent",
  };
}
test("both lead types save before delivery; photos are normalized with metadata stripped", async () => {
  for (const kind of ["consultation", "photo_intake"]) {
    const calls: string[] = [];
    let saved: SavedLead | undefined;
    const deps = dependencies();
    deps.save = async (lead) => {
      calls.push("save");
      saved = lead;
    };
    deps.deliver = async () => {
      calls.push("deliver");
      return "sent";
    };
    const response = await handleLeadIntake(await input(kind), deps);
    assert.equal(response.status, 201);
    assert.deepEqual(calls, ["save", "deliver"]);
    assert.deepEqual(await response.json(), {
      reference: id,
      emailStatus: "sent",
    });
    assert.ok(saved);
    if (kind === "photo_intake") {
      const meta = await sharp(saved.images[0]).metadata();
      assert.equal(meta.format, "jpeg");
      assert.equal(meta.exif, undefined);
      assert.equal(saved.phone, "");
    }
  }
});
test("email outage preserves accepted lead; save failure cannot claim success or send", async () => {
  const deps = dependencies();
  deps.deliver = async () => {
    throw new Error("private provider info");
  };
  const accepted = await handleLeadIntake(await input(), deps);
  assert.equal(accepted.status, 201);
  assert.equal((await accepted.json()).emailStatus, "queued");
  deps.save = async () => {
    throw new Error("private database info");
  };
  deps.deliver = async () => assert.fail("must not send");
  const failed = await handleLeadIntake(await input(), deps);
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private"));
});
test("retries preserve fingerprint while changed content differs", async () => {
  const saved: SavedLead[] = [];
  const deps = dependencies();
  deps.save = async (lead) => {
    saved.push(lead);
  };
  await handleLeadIntake(await input("photo_intake"), deps);
  await handleLeadIntake(await input("photo_intake"), deps);
  assert.equal(saved[0].fingerprint, saved[1].fingerprint);
  await handleLeadIntake(
    await input("photo_intake", { notes: "changed" }),
    deps,
  );
  assert.notEqual(saved[0].fingerprint, saved[2].fingerprint);
});
test("origin, tenant source path, and custom hostname are validated", async () => {
  const r = await input();
  r.headers.set("origin", "https://attacker.invalid");
  assert.equal(resolveLeadTenant(r), null);
  const bad = await input();
  bad.headers.set(
    "referer",
    "http://localhost:3188/arbitrary-tenant/photo-intake/",
  );
  assert.equal(resolveLeadTenant(bad), null);
  const custom = await input(
    "photo_intake",
    {},
    "pasadenashadesandshutters.com",
  );
  custom.headers.set(
    "referer",
    "http://pasadenashadesandshutters.com/photo-intake/",
  );
  assert.equal(
    resolveLeadTenant(custom)?.tenantSlug,
    "pasadena-shades-and-shutters",
  );
  custom.headers.set("referer", "http://attacker.invalid/photo-intake/");
  assert.equal(resolveLeadTenant(custom), null);
});
test("validation and security prevent save and delivery", async () => {
  const deps = dependencies();
  deps.save = async () => assert.fail("must not save");
  deps.deliver = async () => assert.fail("must not send");
  for (const override of [
    { name: "" },
    { email: "" },
    { email: "bad" },
    { phone: "bad" },
    { consent: "" },
    { website: "spam" },
    { requestId: "bad" },
    { notes: "x".repeat(2001) },
    { details: "{}" },
    { details: "null" },
    { details: JSON.stringify({ projectTypes: ["bogus"] }) },
  ] as Record<string, string>[])
    assert.equal(
      (await handleLeadIntake(await input("consultation", override), deps))
        .status,
      400,
    );
  deps.verify = async () => false;
  assert.equal((await handleLeadIntake(await input(), deps)).status, 400);
  deps.ready = () => false;
  assert.equal((await handleLeadIntake(await input(), deps)).status, 503);
});
test("body and image limits enforced, invalid image bytes rejected", async () => {
  const deps = dependencies();
  deps.save = async () => assert.fail("must not save");
  const large = await input();
  large.headers.set("content-length", String(MAX_BODY_BYTES + 1));
  assert.equal((await handleLeadIntake(large, deps)).status, 413);
  const bad = await input("photo_intake", {
    photos: new Blob(["bad"], { type: "image/jpeg" }),
  });
  assert.equal((await handleLeadIntake(bad, deps)).status, 400);
  const empty = await input("photo_intake", { photos: "" });
  assert.equal((await handleLeadIntake(empty, deps)).status, 400);
  const streamed = await input();
  const oversized = new Request(streamed.url, {
    method: "POST",
    headers: streamed.headers,
    body: "a".repeat(MAX_BODY_BYTES + 1),
  });
  assert.equal((await handleLeadIntake(oversized, deps)).status, 413);
});
