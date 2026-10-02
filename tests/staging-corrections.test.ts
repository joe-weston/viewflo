import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  leadEnvironment,
  deliveryRecipient,
  stagingMailbox,
} from "../lib/lead-environment";
import {
  reviewSnapshot,
  googleReviewAction,
} from "../src/data/review-snapshot";
import { validateLead } from "../lib/lead-fields";
import { serviceAreas } from "../src/data/content";
import { legacyRedirects, publicRedirect } from "../lib/pasadena-site";
import { archivedProjects } from "../src/data/archived-projects";
import { resolveOwnerRecipients } from "../lib/lead-recipients";
test("recipient resolution uses confirmed tenant owner identities and rejects ordinary members", async () => {
  const memberships = async () => [
    { user_id: "owner", role: "owner" },
    { user_id: "ordinary", role: "member" },
  ];
  assert.deepEqual(
    await resolveOwnerRecipients(memberships, async (id) => ({
      email: `${id}@example.invalid`,
      email_confirmed_at: "2026-10-02",
    })),
    ["owner@example.invalid"],
  );
  await assert.rejects(
    resolveOwnerRecipients(
      async () => [{ user_id: "ordinary", role: "member" }],
      async () => ({ email: "ordinary@example.invalid" }),
    ),
  );
  await assert.rejects(
    resolveOwnerRecipients(memberships, async () => ({
      email: "unconfirmed@example.invalid",
    })),
  );
});
test("staging routing cannot address Robin or arbitrary visitors; production requires production host identity", () => {
  assert.equal(
    leadEnvironment({ VERCEL_ENV: "preview", LEAD_ENVIRONMENT: "production" }),
    null,
  );
  assert.equal(
    leadEnvironment({ VERCEL_ENV: "production", LEAD_ENVIRONMENT: "staging" }),
    null,
  );
  assert.equal(leadEnvironment({}), null);
  assert.equal(
    leadEnvironment({ VERCEL_ENV: "preview", LEAD_ENVIRONMENT: "staging" }),
    "staging",
  );
  assert.equal(
    leadEnvironment({
      VERCEL_ENV: "production",
      LEAD_ENVIRONMENT: "production",
    }),
    "production",
  );
  for (const email of [
    "robinaalvarez@gmail.com",
    "arbitrary@example.invalid",
  ]) {
    assert.equal(deliveryRecipient("staging", email), stagingMailbox);
    assert.equal(deliveryRecipient("production", email), email);
  }
});
test("consultation needs no budget and tolerates older budget payloads", () => {
  const input = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    kind: "consultation" as const,
    name: "QA",
    email: "qa@example.invalid",
    phone: "8185550100",
    notes: "",
    sourcePath: "/consultation",
    consentAt: "",
    details: {
      projectTypes: ["shutters"],
      city: "Pasadena",
      windowCount: "1–2 windows",
      timeline: "Just gathering ideas",
    },
  };
  assert.equal(validateLead(input), null);
  assert.equal(
    validateLead({
      ...input,
      details: { ...input.details, budget: "Not sure yet" },
    }),
    null,
  );
  const form = readFileSync("src/components/leads/LeadForm.tsx", "utf8");
  assert.ok(!form.includes("budget"));
});
test("snapshot has selected authors, separate totals, source dates, concise verbatim quotes and preserved review action", () => {
  assert.equal(reviewSnapshot.captured, "October 2, 2026");
  assert.deepEqual(
    reviewSnapshot.sources.map((s) => s.count),
    ["27 reviews", "11 recommended reviews"],
  );
  assert.deepEqual(
    reviewSnapshot.sources.flatMap((s) => s.reviews.map((r) => r.author)),
    [
      "Eileen Christensen",
      "Stephanie Darling",
      "Michael Argumaniz Hardin",
      "Tess Y.",
      "Kelsey D.",
      "Lala M.",
    ],
  );
  for (const source of reviewSnapshot.sources) {
    assert.equal(source.rating, "5.0");
    assert.ok(
      source.reviews.every((r) => r.rating === 5 && r.date && r.excerpt),
    );
    assert.ok(
      source.reviews.reduce((n, r) => n + r.excerpt.split(/\s+/).length, 0) <=
        25,
    );
  }
  assert.ok(
    readFileSync(
      "tenant-sites/pasadena/content/mirror/index.html",
      "utf8",
    ).includes(googleReviewAction),
  );
});
test("legacy targets have 17 distinct source city entries and five documented projects", () => {
  assert.equal(serviceAreas.length, 17);
  assert.equal(new Set(serviceAreas.map((a) => a.id)).size, 17);
  for (const area of serviceAreas) {
    assert.equal(
      legacyRedirects[`ca-shutters/${area.id}-shutters.php`],
      `/#${area.id}`,
    );
    assert.ok(
      readFileSync(
        "tenant-sites/pasadena/content/mirror/ca-shutters/index.html",
        "utf8",
      ).includes(`${area.id}-shutters.php`),
    );
  }
  assert.equal(archivedProjects.length, 5);
  for (const p of archivedProjects)
    assert.equal(
      legacyRedirects[`shutter-projects/${p.id}.php`],
      `/gallery/#${p.id}`,
    );
  assert.equal(
    publicRedirect("localhost", "/pasadena-shades-and-shutters/sitemap.php"),
    "/sitemap.xml",
  );
});
