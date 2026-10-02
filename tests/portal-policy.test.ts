import test from "node:test";
import assert from "node:assert/strict";
import {
  allAccepted,
  billingRole,
  currentPair,
  requireTestKey,
  safeSlug,
  type LegalDocument,
} from "../lib/portal-policy";
const terms: LegalDocument = {
  id: "terms-1",
  kind: "terms",
  version: "1",
  title: "Terms",
  body: "Terms",
  sha256: "a".repeat(64),
  published_at: "2026-01-01T00:00:00Z",
  retired_at: null,
};
const privacy: LegalDocument = { ...terms, id: "privacy-1", kind: "privacy" };
test("checkout requires both current versions, not old acceptance", () => {
  assert.equal(allAccepted([terms, privacy], ["terms-1"]), false);
  assert.equal(
    allAccepted([terms, privacy], ["terms-1", "privacy-old"]),
    false,
  );
  assert.equal(allAccepted([terms, privacy], ["terms-1", "privacy-1"]), true);
});
test("draft, future, retired, missing and duplicate documents fail closed", () => {
  for (const docs of [
    [],
    [terms],
    [terms, { ...privacy, published_at: "2999-01-01" }],
    [terms, { ...privacy, retired_at: "2026-01-02" }],
    [terms, privacy, { ...terms, id: "duplicate" }],
  ])
    assert.equal(currentPair(docs).length, 0);
});
test("member is not a billing role", () => {
  assert.equal(billingRole("member"), false);
  assert.equal(billingRole("owner"), true);
  assert.equal(billingRole("billing"), true);
  assert.equal(billingRole("admin"), false);
});
test("invalid slugs and path injection rejected", () => {
  for (const slug of [
    "../admin",
    "//evil.test",
    "tenant?next=x",
    "UPPER",
    "x".repeat(81),
    "a/b",
  ])
    assert.equal(safeSlug(slug), false);
  assert.equal(safeSlug("pasadena-shades-and-shutters"), true);
});
test("live and absent payment keys refused", () => {
  assert.throws(() => requireTestKey(undefined));
  assert.throws(() => requireTestKey("sk_live_example"));
  assert.equal(requireTestKey("sk_test_fixture"), "sk_test_fixture");
});
