import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { legacyRedirects, PASADENA_ORIGIN } from "../../lib/pasadena-site";
const evidence = path.resolve("tmp/ui-verification/pasadena-magic-replacement");
const tenant = "/pasadena-shades-and-shutters";
const server = new URL(
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3188",
);
function getWithHost(pathname: string, host: string) {
  return new Promise<{ status: number; body: string; location?: string }>(
    (resolve, reject) => {
      const req = http.get(
        {
          hostname: server.hostname,
          port: server.port,
          path: pathname,
          headers: { host },
        },
        (r) => {
          let body = "";
          r.setEncoding("utf8");
          r.on("data", (chunk) => (body += chunk));
          r.on("end", () =>
            resolve({
              status: r.statusCode || 0,
              body,
              location: r.headers.location,
            }),
          );
        },
      );
      req.on("error", reject);
    },
  );
}
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
async function capture(page: import("@playwright/test").Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("img")
    .evaluateAll((images) =>
      images.forEach((i) => i.setAttribute("loading", "eager")),
    );
  // Exercise the actual scroll path so Chromium resolves lazy srcsets inside clipped comparisons.
  for (const article of await page.locator("article").all())
    await article.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(
      () =>
        page
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      { timeout: 15000 },
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: evidence + "/" + name + ".png",
    fullPage: true,
  });
}
test("public design, responsive navigation, gallery filter and factual copy", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(tenant + "/");
  await expect(page.locator("h1")).toContainText("Custom window treatments");
  await expect(
    page.getByText(/Growth System|212 reviews|555-0142|free in-home/i),
  ).toHaveCount(0);
  for (const id of [
    "about",
    "services",
    "service-area",
    "faq",
    "reviews",
    "process",
  ])
    await expect(page.locator("#" + id)).toHaveCount(1);
  await capture(page, info.project.name + "-home");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.screenshot({
      path: evidence + "/mobile-menu.png",
      fullPage: false,
    });
    await page
      .getByRole("navigation", { name: "Mobile" })
      .getByRole("link", { name: "Project Gallery" })
      .click();
  } else await page.goto(tenant + "/gallery/");
  await expect(page.locator("h1")).toContainText("Before and after");
  await expect(
    page.locator("article").filter({ has: page.getByRole("slider") }),
  ).toHaveCount(5);
  await capture(page, info.project.name + "-gallery");
  await page.getByRole("button", { name: "Arcadia", exact: true }).click();
  await expect(
    page.locator("article").filter({ has: page.getByRole("slider") }),
  ).toHaveCount(1);
  await capture(page, info.project.name + "-gallery-filter");
  expect(errors).toEqual([]);
});
test("service routes, legal routes and real unknown/growth 404s", async ({
  page,
  request,
}, info) => {
  for (const route of [
    "services/shutters",
    "services/shades",
    "services/blinds",
    "services/drapery",
    "services/motorized",
    "privacy",
    "terms",
    "consultation",
  ]) {
    expect((await page.goto(tenant + "/" + route + "/"))?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "privacy")
      await expect(
        page.getByText(
          "We will only retain personal information as long as necessary for the fulfillment of those purposes.",
          { exact: true },
        ),
      ).toBeVisible();
    if (route === "terms")
      await expect(
        page.getByText("modify or copy the materials;", { exact: true }),
      ).toBeVisible();
    await expect(
      page.getByText(/free in-home|licensed installer|212 reviews|555-0142/i),
    ).toHaveCount(0);
    await capture(page, info.project.name + "-" + route.replaceAll("/", "-"));
  }
  for (const route of [
    "unknown",
    "services/unknown",
    "internal",
    "estimate",
    "estimate-result",
    "design-guidance",
    "offers",
  ])
    expect((await request.get(tenant + "/" + route + "/")).status()).toBe(404);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/services/shutters/");
  expect(sitemap).not.toContain(".php");
});
test("all 50 old non-home URLs permanently map in one hop", async () => {
  for (const [route, target] of Object.entries(legacyRedirects)) {
    if (!route) continue;
    const r = await getWithHost(
      "/" + route + "?utm_source=legacy",
      "www.pasadenashadesandshutters.com",
    );
    expect(r.status, route).toBe(308);
    const dest = new URL(r.location!, PASADENA_ORIGIN);
    expect(dest.origin).toBe(PASADENA_ORIGIN);
    expect(dest.pathname + dest.hash, route).toBe(target);
    expect(dest.search).toBe("?utm_source=legacy");
  }
  const apex = await getWithHost(
    "/pasadena-shades.php",
    "pasadenashadesandshutters.com",
  );
  expect(apex.status).toBe(308);
  expect(apex.location).toBe(PASADENA_ORIGIN + "/services/shades/");
  const canonical = await getWithHost("/", "www.pasadenashadesandshutters.com");
  expect(canonical.status).toBe(200);
  expect(canonical.body).toContain('href="/gallery"');
  expect(canonical.body).toContain('content="index, follow"');
  expect(canonical.body).not.toContain("preview-banner");
  const robots = await getWithHost(
    "/robots.txt",
    "www.pasadenashadesandshutters.com",
  );
  expect(robots.body).toContain("Allow: /");
  expect(robots.body).toContain("Disallow: /admin/");
  const spoof = await getWithHost(
    tenant + "/?__viewflo_tenant_host=pasadena-shades-and-shutters",
    "localhost:" + server.port,
  );
  expect(spoof.status).toBe(200);
  expect(spoof.body).toContain('content="noindex, nofollow"');
  expect(spoof.body).toContain('href="/pasadena-shades-and-shutters/gallery"');
  const inbox = await getWithHost(
    "/admin/leads/",
    "www.pasadenashadesandshutters.com",
  );
  expect(inbox.body).not.toContain("qa@example.invalid");
  expect(inbox.body).toContain("Workspace unavailable");
});
