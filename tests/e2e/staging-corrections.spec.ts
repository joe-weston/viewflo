import { test, expect } from "@playwright/test";
import { legacyRedirects } from "../../lib/pasadena-site";
import fs from "node:fs";
const prefix = "/pasadena-shades-and-shutters";
const evidence = "tmp/ui-verification/pasadena-staging-corrections";
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("every mapped destination points at visible meaningful content; aliases survive", async ({
  page,
  request,
}, info) => {
  for (const [old, target] of Object.entries(legacyRedirects)) {
    if (!old) continue;
    const response = await request.get(`${prefix}/${old}?utm_source=qa`, {
      maxRedirects: 0,
    });
    expect(response.status(), old).toBe(308);
    const location = response.headers().location;
    expect(location).toContain("utm_source=qa");
    if (target === "/sitemap.xml") {
      expect(location).toMatch(/^\/sitemap.xml\?/);
      continue;
    }
    const [path, hash] = target.split("#");
    await page.goto(prefix + path);
    if (hash) {
      const destination = page.locator(`[id="${hash}"]`);
      await expect(destination, old).toHaveCount(1);
      await expect(destination, old).toBeVisible();
      expect(
        (await destination.innerText()).trim().length,
        old,
      ).toBeGreaterThan(10);
      expect(
        await destination.evaluate((el) =>
          parseInt(getComputedStyle(el).scrollMarginTop),
        ),
      ).toBeGreaterThanOrEqual(100);
    } else await expect(page.locator("h1")).toBeVisible();
  }
  await page.goto(prefix + "/");
  for (const alias of [
    "about",
    "services",
    "gallery",
    "process",
    "service-area",
    "reviews",
    "faq",
  ])
    await expect(page.locator("#" + alias)).toHaveCount(1);
  await page
    .locator("#reviews")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await expect(page.getByText("27 reviews", { exact: true })).toBeVisible();
  await expect(
    page.getByText("11 recommended reviews", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Write a Google review ↗" }),
  ).toHaveCount(2);
  await page.screenshot({
    path: `${evidence}/${info.project.name}-reviews.png`,
  });
  await page.goto(prefix + "/gallery/");
  await page
    .getByRole("heading", { name: "Original local projects" })
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page
    .locator('section[aria-label="Original local projects"] img')
    .evaluateAll((images) =>
      images.forEach((image) => image.setAttribute("loading", "eager")),
    );
  await expect
    .poll(() =>
      page
        .locator('section[aria-label="Original local projects"] img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${evidence}/${info.project.name}-legacy-projects.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("staging default sends no analytics requests and forms have neutral copy", async ({
  page,
}, info) => {
  const analytics: string[] = [];
  await page.route(/google-analytics|googletagmanager/, (route) => {
    analytics.push(route.request().url());
    return route.abort();
  });
  for (const path of [
    "/",
    "/consultation/",
    "/photo-intake/",
    "/services/blinds/",
  ]) {
    await page.goto(prefix + path);
    await expect(
      page.getByText(/free|budget range|final pric|pricing depends/i),
    ).toHaveCount(0);
    await page.screenshot({
      path: `${evidence}/${info.project.name}-${path.replaceAll("/", "") || "home"}.png`,
      fullPage: true,
    });
  }
  expect(analytics).toEqual([]);
});
