import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHostname,
  PASADENA_TENANT,
  rewritePasadenaHtml,
  shouldRewriteTenantPath,
  tenantForHost,
  tenantRewritePath,
} from "../lib/tenant-routing";

test("Pasadena domains resolve to the first Viewflo tenant", () => {
  assert.equal(
    tenantForHost("www.pasadenashadesandshutters.com"),
    PASADENA_TENANT,
  );
  assert.equal(
    tenantForHost("PASADENASHADESANDSHUTTERS.COM:443"),
    PASADENA_TENANT,
  );
  assert.equal(tenantForHost("viewflo.example"), null);
  assert.equal(normalizeHostname(" example.test.:3188 "), "example.test");
});

test("public page paths rewrite while assets and platform paths do not", () => {
  assert.equal(shouldRewriteTenantPath("/"), true);
  assert.equal(shouldRewriteTenantPath("/about-us.php"), true);
  assert.equal(shouldRewriteTenantPath("/admin"), true);
  assert.equal(shouldRewriteTenantPath("/style.css"), false);
  assert.equal(shouldRewriteTenantPath("/images/header.png"), false);
  assert.equal(shouldRewriteTenantPath("/_next/static/chunk.js"), false);
  assert.equal(shouldRewriteTenantPath("/api/photo-requests"), false);
  assert.equal(tenantRewritePath("/", PASADENA_TENANT), "/" + PASADENA_TENANT);
  assert.equal(
    tenantRewritePath("/about-us.php", PASADENA_TENANT),
    "/" + PASADENA_TENANT + "/about-us.php",
  );
});

test("legacy assets use the tenant snapshot and preview links keep tenant context", () => {
  const html =
    '<a href="/about-us.php">About</a><img src="/images/header.png"><img src="/shutter-projects/images/project.jpg"><a href="https://example.com">External</a>';
  assert.equal(
    rewritePasadenaHtml(html, "/" + PASADENA_TENANT),
    '<a href="/' +
      PASADENA_TENANT +
      '/about-us.php">About</a><img src="/tenants/pasadena/images/header.png"><img src="/tenants/pasadena/shutter-projects/images/project.jpg"><a href="https://example.com">External</a>',
  );
  assert.equal(
    rewritePasadenaHtml(html, ""),
    '<a href="/about-us.php">About</a><img src="/tenants/pasadena/images/header.png"><img src="/tenants/pasadena/shutter-projects/images/project.jpg"><a href="https://example.com">External</a>',
  );
});
