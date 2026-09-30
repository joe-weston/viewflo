import test from "node:test";
import assert from "node:assert/strict";
import {
  portalLocation,
  tenantPath,
  billingPath,
  invoiceCursor,
} from "../lib/portal-urls";
const tenant = "pasadena-shades-and-shutters";
test("Pasadena portal stays on both custom domains without a tenant prefix", () => {
  for (const host of [
    "pasadenashadesandshutters.com",
    "www.pasadenashadesandshutters.com",
  ]) {
    const site = portalLocation(host, tenant);
    assert.equal(site.origin, `https://${host}`);
    assert.equal(billingPath(site), "/admin/billing");
    assert.equal(
      tenantPath(site, "/admin/agreements/terms"),
      "/admin/agreements/terms",
    );
    assert.equal(tenantPath(site), "/");
  }
});
test("platform and loopback preview retain tenant prefixes", () => {
  assert.equal(
    billingPath(portalLocation("viewflo.app", tenant, "https://viewflo.app")),
    `/${tenant}/admin/billing`,
  );
  assert.equal(
    portalLocation("127.0.0.1:3188", tenant).origin,
    "http://127.0.0.1:3188",
  );
});
test("unapproved origins, cross-tenant hosts and hostile paths are refused", () => {
  for (const host of [
    "evil.test",
    "viewflo.app.evil.test",
    "viewflo.app, evil.test",
    "viewflo.app@evil.test",
    "www.pasadenashadesandshutters.com:443",
  ])
    assert.throws(() => portalLocation(host, tenant, "https://viewflo.app"));
  assert.throws(() =>
    portalLocation("pasadenashadesandshutters.com", "another-tenant"),
  );
  assert.throws(() =>
    portalLocation("viewflo.app", tenant, "http://viewflo.app"),
  );
  assert.throws(() =>
    portalLocation("viewflo.app", tenant, "https://viewflo.app/redirect"),
  );
  assert.throws(() =>
    portalLocation("viewflo.app", "../other", "https://viewflo.app"),
  );
});
test("invoice pagination rejects arrays, paths and unbounded identifiers", () => {
  assert.equal(invoiceCursor("in_123Abc"), "in_123Abc");
  assert.equal(invoiceCursor(undefined), undefined);
  for (const value of [
    "cus_123",
    ["in_123"],
    "in_../other",
    "in_" + "a".repeat(129),
  ])
    assert.throws(() => invoiceCursor(value));
});
test("tenant links reject protocol-relative and traversing paths", () => {
  const site = portalLocation("pasadenashadesandshutters.com", tenant);
  for (const path of [
    "//evil.test",
    "/../other",
    "/admin\\evil",
    "https://evil.test",
  ])
    assert.throws(() => tenantPath(site, path));
});
