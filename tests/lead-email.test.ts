import test from "node:test";
import assert from "node:assert/strict";
import { render } from "@react-email/render";
import { LeadResend, sendLeadEmail } from "../lib/lead-resend";
import {
  emailContent,
  processEmailJobs,
  type EmailJob,
} from "../lib/lead-email";
const job: EmailJob = {
  id: "job",
  lead_id: "lead",
  audience: "manager",
  recipient: "manager@example.invalid",
  claim_token: "claim",
  payload: {
    reference: "lead",
    kind: "photo_intake",
    name: "QA <script>alert(1)</script>",
    email: "qa@example.invalid",
    phone: "",
    notes: "Synthetic only",
    details: {
      projectTypes: ["shutters"],
      city: "Pasadena",
      windowCount: "1–2 windows",
      timeline: "Just gathering ideas",
      budget: "Not sure yet",
    },
    sourcePath: "/photo-intake",
    receivedAt: "2026-09-30T12:00:00Z",
    photoCount: 1,
    senderName: "Pasadena Shades & Shutters",
    senderEmail: "leads@mail.example.invalid",
    replyTo: "office@example.invalid",
  },
};
test("SDK sends stable idempotency keys and sanitized failures without real email", async () => {
  const original = globalThis.fetch;
  const calls: { key: string | null; body: string }[] = [];
  try {
    globalThis.fetch = async (_url, options) => {
      calls.push({
        key: new Headers(options?.headers).get("Idempotency-Key"),
        body: String(options?.body),
      });
      return Response.json({ id: "synthetic-resend-id" });
    };
    const client = new LeadResend("synthetic-test-key");
    assert.equal(await sendLeadEmail(client, job), "synthetic-resend-id");
    await sendLeadEmail(client, job);
    assert.equal(calls[0].key, calls[1].key);
    assert.equal(calls[0].body, calls[1].body);
    assert.equal(calls[0].key, "lead-email/job");
    assert.ok(!JSON.parse(calls[0].body).attachments);
    globalThis.fetch = async () =>
      Response.json(
        { message: "private recipient and secret" },
        { status: 500 },
      );
    await assert.rejects(sendLeadEmail(client, job), {
      message: "Send unavailable",
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("manager summary is actionable with submitter reply-to and no attachments", async () => {
  const content = emailContent(job);
  assert.equal(content.replyTo, "qa@example.invalid");
  assert.ok(content.text.includes("City: Pasadena"));
  assert.ok(content.text.includes("Photos: 1"));
  assert.ok(!("attachments" in content));
  const html = await render(content.react);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("confirmation uses tenant reply-to and neutral next steps", () => {
  const content = emailContent({
    ...job,
    audience: "submitter",
    recipient: "qa@example.invalid",
  });
  assert.equal(content.replyTo, "office@example.invalid");
  assert.ok(content.text.includes("not a confirmed appointment"));
  assert.ok(content.text.includes("Synthetic only"));
  assert.ok(!content.text.includes("Budget:"));
});
test("both staging audiences route exclusively to the shared mailbox and identify the run", () => {
  for (const audience of ["submitter", "manager"] as const) {
    const content = emailContent({
      ...job,
      audience,
      recipient: "robinaalvarez@gmail.com",
      payload: {
        ...job.payload,
        environment: "staging",
        adminUrl:
          "https://stage.example.invalid/pasadena-shades-and-shutters/admin/leads/lead/",
      },
    });
    assert.equal(content.to, "jocduplbot@gmail.com");
    assert.ok(content.subject.includes(`[STAGING ${audience} lead]`));
    assert.ok(!content.text.includes("Budget:"));
    if (audience === "manager")
      assert.ok(
        content.text.includes(
          "https://stage.example.invalid/pasadena-shades-and-shutters/admin/leads/lead/",
        ),
      );
  }
});
test("one recipient failure does not block another and provider details are sanitized", async () => {
  const outcomes: [string, string | null, string | null][] = [];
  const jobs = [
    job,
    { ...job, id: "confirmation", audience: "submitter" as const },
  ];
  const result = await processEmailJobs(
    jobs,
    async (j) => {
      if (j.id === "confirmation")
        throw new Error("secret and customer details");
      return "resend-id";
    },
    async (j, id, error) => {
      outcomes.push([j.id, id, error]);
    },
  );
  assert.deepEqual(result, [true, false]);
  assert.deepEqual(outcomes, [
    ["job", "resend-id", null],
    ["confirmation", null, "provider_unavailable"],
  ]);
});
