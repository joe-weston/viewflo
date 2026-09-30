import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
const evidence = path.resolve("tmp/ui-verification/pasadena-replacement");

function getWithHost(pathname: string, host: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port: 3188,
        path: pathname,
        headers: { host },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode || 0, body }),
        );
      },
    );
    request.on("error", reject);
  });
}
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("exact Pasadena home, tenant links and project gallery", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/pasadena-shades-and-shutters/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Blinds, Shades, Shutters and Draperies",
  );
  await expect(
    page.locator('link[rel="stylesheet"][href="/tenants/pasadena/style.css"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('img[src="/tenants/pasadena/images/header.png"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.menu-top a[href="/pasadena-shades-and-shutters/about-us.php"]',
    ).first(),
  ).toHaveAttribute(
    "href",
    "/pasadena-shades-and-shutters/about-us.php",
  );
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("img")
    .evaluateAll((images) =>
      images.forEach((image) => image.setAttribute("loading", "eager")),
    );
  await expect
    .poll(() =>
      page
        .locator("img")
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
    path: evidence + "/" + info.project.name + "-legacy-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  const customDomain = await getWithHost(
    "/",
    "www.pasadenashadesandshutters.com",
  );
  expect(customDomain.status).toBe(200);
  expect(customDomain.body).toContain(
    "Blinds, Shades, Shutters and Draperies",
  );
  expect(customDomain.body).toContain('href="/about-us.php"');
  expect(customDomain.body).not.toContain(
    'href="/pasadena-shades-and-shutters/about-us.php"',
  );

  await page.goto("/pasadena-shades-and-shutters/gallery/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "local homes",
  );
  await page.screenshot({
    path: evidence + "/" + info.project.name + "-gallery.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("routes preserve legacy URLs and return real 404s", async ({
  page,
  request,
}, info) => {
  for (const route of [
    "/services/shutters/",
    "/services/shades/",
    "/services/blinds/",
    "/services/drapery/",
    "/services/motorized/",
    "/faqs.php/",
    "/about-us.php/",
    "/contact-us.php/",
    "/privacy.php/",
    "/terms.php/",
  ]) {
    const response = await page.goto("/pasadena-shades-and-shutters" + route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    if(route === '/privacy.php/') await page.screenshot({path:`${evidence}/${info.project.name}-privacy-preview.png`,fullPage:true});
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/pasadena-shades-and-shutters/services/shutters/");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-service.png`,
    fullPage: true,
  });
  await page.goto("/pasadena-shades-and-shutters/consultation/");
  await expect(
    page.getByRole("heading", { name: "Talk with Pasadena Shades & Shutters" }),
  ).toBeVisible();
  await expect(
    page.locator("main section").getByRole("link", { name: "818-618-5288" }),
  ).toHaveAttribute("href", "tel:+18186185288");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation.png`,
    fullPage: true,
  });
  expect((await request.get("/definitely-not-a-real-page/")).status()).toBe(
    404,
  );
  expect((await request.get("/services/unknown/")).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "/send-photos",
  );
});
test("photo validation and honest unconfigured server failure", async ({
  page,
}, info) => {
  await page.goto("/pasadena-shades-and-shutters/send-photos/");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-empty.png`,
    fullPage: true,
  });
  const submit = page.getByRole("button", {
    name: "Send photos to request a quote",
  });
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "between 1 and 3",
  );
  await page.locator("#photos").setInputFiles({
    name: "invalid.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "JPG or PNG",
  );
  await page
    .locator("#photos")
    .setInputFiles("public/818aaed5-2de2-408a-9918-b48936405ebb.jpg");
  await page.getByLabel("Phone or email").fill("qa@example.invalid");
  await page.getByRole("checkbox").check();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-selected.png`,
    fullPage: true,
  });
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-unavailable.png`,
    fullPage: true,
  });
  await expect(page.getByText("Your photo request is saved")).toHaveCount(0);
});
test("photo sending and receipt states with isolated API fixture", async ({
  page,
}, info) => {
  // Browser-only contract fixture. This never creates a lead or sends a notification.
  await page.route("**/api/photo-requests/", async (route) => {
    await new Promise((r) => setTimeout(r, 900));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ reference: "synthetic-qa-reference" }),
    });
  });
  await page.goto("/pasadena-shades-and-shutters/send-photos/");
  await page
    .locator("#photos")
    .setInputFiles("public/818aaed5-2de2-408a-9918-b48936405ebb.jpg");
  await page.getByLabel("Phone or email").fill("qa@example.invalid");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Send photos to request a quote" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sending your request…" }),
  ).toBeDisabled();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-sending.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Your photo request is saved" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-receipt-fixture.png`,
    fullPage: true,
  });
});
