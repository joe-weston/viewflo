import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { startCustomerBroker } from "./customer-broker.mjs";
import { customerMailbox, providerPayload } from "./customer-mail-policy";

const run = "vfcrm-20261106000000-abc12345";
const sender = "test@example.invalid";
const sample = {
  from: sender,
  to: customerMailbox,
  subject: "We received your photo request",
  text: "Fixture body",
};

test("host sender rejects additional recipients and forwards only the verified sender and bot", () => {
  assert.throws(() =>
    providerPayload(run, "intake", sender, {
      ...sample,
      to: [customerMailbox, "other@example.invalid"],
    }),
  );
  assert.throws(() =>
    providerPayload(run, "intake", sender, {
      ...sample,
      bcc: "other@example.invalid",
    }),
  );
  const mail = providerPayload(run, "intake", sender, {
    ...sample,
    from: "someone@example.invalid",
    reply_to: "someone@example.invalid",
  });
  assert.equal(mail.from, sender);
  assert.deepEqual(mail.to, [customerMailbox]);
  assert.equal(
    mail.subject,
    "[" + run + " intake] We received your photo request",
  );
  assert.equal("reply_to" in mail, false);
});

test("broker claims one exact send and returns acceptance only after provider result", async () => {
  const app = "a".repeat(64),
    control = "b".repeat(64);
  const broker = await startCustomerBroker(app, control, 0);
  const { port } = broker.address() as AddressInfo;
  const request = (
    path: string,
    token: string,
    payload?: object,
    key?: string,
  ) =>
    fetch("http://127.0.0.1:" + port + path, {
      method: payload ? "POST" : "GET",
      signal: AbortSignal.timeout(10000),
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
        ...(key ? { "idempotency-key": key } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
  try {
    assert.equal(
      (await request("/arm", control, { kind: "quote" })).status,
      409,
    );
    assert.equal(
      (await request("/arm", control, { kind: "intake" })).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/emails",
          app,
          { ...sample, to: "other@example.invalid" },
          "lead-email/abcdef",
        )
      ).status,
      403,
    );
    const send = request("/emails", app, sample, "lead-email/abcdef");
    let job;
    for (let i = 0; i < 20 && !job; i++) {
      job = await (await request("/next", control)).json();
      if (!job) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(job?.kind, "intake");
    assert.equal(await (await request("/next", control)).json(), null);
    assert.equal(
      (
        await request("/finish", control, {
          kind: "intake",
          key: "other",
          status: 200,
          id: "synthetic-provider",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/finish", control, {
          kind: "intake",
          key: job.key,
          status: 200,
          id: "synthetic-provider",
        })
      ).status,
      200,
    );
    assert.deepEqual(await (await send).json(), { id: "synthetic-provider" });
    assert.deepEqual(
      await (await request("/emails", app, sample, "lead-email/abcdef")).json(),
      { id: "synthetic-provider" },
    );
    assert.equal(await (await request("/next", control)).json(), null);
  } finally {
    broker.closeAllConnections();
    await new Promise<void>((resolve) => broker.close(() => resolve()));
  }
});
