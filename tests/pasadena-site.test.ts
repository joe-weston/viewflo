import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  legacyRedirects,
  normalizePublicPath,
  publicRedirect,
  publicRoutes,
  PASADENA_ORIGIN,
} from "../lib/pasadena-site";
import { listLegacyPages } from "../lib/pasadena-pages";
import { galleryProjects } from "../src/data/content";
const tenant = "/pasadena-shades-and-shutters";
test("every preserved legacy URL has an explicit non-looping destination", () => {
  const inventory = listLegacyPages().map((p) => p.routePath);
  assert.equal(Object.keys(legacyRedirects).length, 51);
  for (const route of inventory) {
    assert.ok(Object.hasOwn(legacyRedirects, route), route);
    const destination = new URL(legacyRedirects[route], PASADENA_ORIGIN);
    assert.ok(
      destination.pathname === "/sitemap.xml" ||
        publicRoutes.includes(
          normalizePublicPath(
            destination.pathname,
          ) as (typeof publicRoutes)[number],
        ),
    );
    if (route)
      assert.equal(
        publicRedirect("www.pasadenashadesandshutters.com", "/" + route),
        legacyRedirects[route],
      );
    assert.equal(
      publicRedirect("www.pasadenashadesandshutters.com", destination.pathname),
      null,
    );
  }
});
test("apex, platform and prefixed custom URLs consolidate in one hop", () => {
  assert.equal(
    publicRedirect(
      "pasadenashadesandshutters.com",
      "/faux-wood-blinds-pasadena.php",
    ),
    PASADENA_ORIGIN + "/services/blinds/",
  );
  assert.equal(
    publicRedirect(
      "viewflo.app",
      tenant + "/ca-shutters/arcadia-shutters.php",
      true,
    ),
    PASADENA_ORIGIN + "/#service-area",
  );
  assert.equal(
    publicRedirect("www.pasadenashadesandshutters.com", tenant + "/gallery/"),
    PASADENA_ORIGIN + "/gallery/",
  );
  assert.equal(
    publicRedirect("127.0.0.1:3188", tenant + "/contact-us.php"),
    tenant + "/consultation/",
  );
  assert.equal(
    publicRedirect("pasadenashadesandshutters.com", "/example.jpg"),
    PASADENA_ORIGIN + "/example.jpg",
  );
  assert.equal(
    publicRedirect("viewflo.app", tenant + "/gallery/", false),
    null,
  );
  assert.equal(
    publicRedirect("pasadenashadesandshutters.com", "/admin/leads/"),
    null,
  );
  assert.equal(
    publicRedirect("viewflo.app", tenant + "/admin/leads/", true),
    null,
  );
});
test("aliases normalize index.html and trailing slashes without wildcard redirects", () => {
  assert.equal(normalizePublicPath("/ca-shutters/index.html"), "ca-shutters");
  assert.equal(
    publicRedirect("localhost:3188", tenant + "/send-photos/"),
    tenant + "/photo-intake/",
  );
  assert.equal(
    publicRedirect("www.pasadenashadesandshutters.com", "/unknown.php"),
    null,
  );
  for (const route of ["/api/leads/", "/auth/", "/account/", "/_next/image"])
    assert.equal(
      publicRedirect("www.pasadenashadesandshutters.com", route),
      null,
    );
  assert.equal(publicRedirect("evil.example", "/contact-us.php"), null);
});
test("all five approved before/after projects have tenant-owned image pairs", () => {
  assert.equal(galleryProjects.length, 5);
  for (const project of galleryProjects)
    for (const asset of [project.beforeImage, project.afterImage])
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "public", asset)),
        asset,
      );
});
