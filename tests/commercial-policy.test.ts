import test from "node:test";
import assert from "node:assert/strict";
import {
  HOSTING,
  SERVICES,
  isHostingPrice,
  billingTiming,
} from "../lib/commercial-policy";
import { serviceEligibility } from "../lib/commercial-policy";
import { allAccepted, type LegalDocument } from "../lib/portal-policy";
const price = {
  currency: "usd",
  unit_amount: 16900,
  recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
};
test("hosting is exactly USD169 monthly, never services installments", () => {
  assert.equal(isHostingPrice(price), true);
  for (const bad of [
    { ...price, unit_amount: 100000 },
    { ...price, currency: "eur" },
    { ...price, recurring: { ...price.recurring, interval: "year" } },
    { ...price, recurring: { ...price.recurring, usage_type: "metered" } },
  ])
    assert.equal(isHostingPrice(bad), false);
  assert.equal(HOSTING.paymentTiming, "Paid in advance for the next month");
});
test("each services option ends at fixed USD4000 and does not include hosting", () => {
  for (const option of Object.values(SERVICES.options))
    assert.equal(option.count * option.amount, 400000);
  assert.equal(SERVICES.options.four_monthly.count, 4);
  assert.equal("selected" in SERVICES, false);
});
test("period end and payment attempt never become an invented invoice cutoff", () => {
  const t = billingTiming(1800000000, 1800003600);
  assert.notEqual(t.periodEnd, t.paymentAttempt);
  assert.equal(t.invoiceCutoff, null);
  assert.deepEqual(billingTiming(null, null), {
    periodEnd: null,
    paymentAttempt: null,
    invoiceCutoff: null,
  });
});
test("SOW acceptance is separate from hosting prerequisite pair", () => {
  const d = {
    version: "1",
    title: "test",
    body: "text",
    sha256: "a".repeat(64),
    published_at: "2026-01-01",
    retired_at: null,
  };
  const docs: LegalDocument[] = [
    { ...d, id: "t", kind: "terms" },
    { ...d, id: "p", kind: "privacy" },
    { ...d, id: "s", kind: "sow" },
  ];
  assert.equal(allAccepted(docs, ["t", "p"]), true);
  assert.equal(allAccepted(docs, ["s"]), false);
});
test("signature alone never establishes earned services eligibility", () => {
  assert.equal(
    serviceEligibility({
      sowId: "s",
      accepted: true,
      conditionHash: null,
      approval: null,
    }),
    "Accepted · earning conditions not defined",
  );
  assert.equal(
    serviceEligibility({
      sowId: "s",
      accepted: true,
      conditionHash: "h",
      conditionsFinalized: true,
      approval: null,
    }),
    "Accepted · awaiting completion/growth approval",
  );
});
test("eligibility requires matching version/conditions and evidence, still not an invoice", () => {
  const approval = {
    sow_document_id: "s",
    condition_sha256: "h",
    evidence_reference: "approved-evidence",
    approved_at: "2026-09-06",
  };
  const input = {
    sowId: "s",
    accepted: true,
    conditionHash: "h",
    conditionsFinalized: true,
    approval,
  };
  assert.equal(
    serviceEligibility(input),
    "Eligibility recorded · invoice review required",
  );
  for (const a of [
    { ...approval, sow_document_id: "old" },
    { ...approval, condition_sha256: "old" },
    { ...approval, evidence_reference: "" },
  ])
    assert.equal(
      serviceEligibility({ ...input, approval: a }),
      "Accepted · awaiting completion/growth approval",
    );
});

test("placeholder conditions fail closed even with approval evidence", () => {
  assert.equal(
    serviceEligibility({
      sowId: "s",
      accepted: true,
      conditionHash: "placeholder-50",
      conditionsFinalized: false,
      approval: {
        sow_document_id: "s",
        condition_sha256: "placeholder-50",
        evidence_reference: "draft only",
        approved_at: "2026-09-06",
      },
    }),
    "Accepted · earning conditions remain draft",
  );
});
