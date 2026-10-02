import { test, expect } from "@playwright/test";
test("production analytics queues one event per action with sanitized URLs, and excludes auth", async ({
  page,
}) => {
  test.skip(
    process.env.ANALYTICS_VERIFICATION !== "true",
    "Run against the local production-configured preview with collection intercepted.",
  );
  const requests: string[] = [];
  await page.route(/google-analytics\.com\/.*collect/, (route) => {
    requests.push(
      route.request().url() + " " + (route.request().postData() || ""),
    );
    return route.fulfill({ status: 204 });
  });
  // Inspect application queue before the library consumes it; never release collection to Google.
  await page.route("**/googletagmanager.com/gtag/js?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* intercepted verification: no collection */",
    }),
  );
  await page.goto(
    "/pasadena-shades-and-shutters/?email=private@example.invalid&utm_source=qa",
  );
  await expect
    .poll(() => page.evaluate(() => window.dataLayer?.length || 0))
    .toBeGreaterThan(0);
  await page.locator('a[href^="tel:"]:visible').first().click();
  const events = await page.evaluate(() => window.dataLayer);
  const serialized = JSON.stringify(events);
  expect(serialized).toContain("G-XHKPP6CVFR");
  expect(serialized).not.toContain("private@example.invalid");
  expect(serialized).not.toContain("utm_source");
  expect(
    (events as unknown[][]).filter(
      (e) => e[0] === "event" && e[1] === "page_view",
    ),
  ).toHaveLength(1);
  expect(
    (events as unknown[][]).filter(
      (e) => e[0] === "event" && e[1] === "phone_click",
    ),
  ).toHaveLength(1);
  await page
    .getByRole("link", { name: "Request a Consultation", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.dataLayer?.filter(
            (e) => Array.isArray(e) && e[1] === "page_view",
          ).length,
      ),
    )
    .toBe(2);
  await page.route("**/api/leads/", (route) =>
    route.fulfill({
      status: 201,
      json: { reference: "synthetic-reference", emailStatus: "queued" },
    }),
  );
  await page.getByRole("checkbox", { name: "Shutters", exact: true }).check();
  await page.getByRole("radio", { name: "1–2 windows", exact: true }).check();
  await page
    .getByRole("radio", { name: "Just gathering ideas", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Pasadena", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your name").fill("Synthetic QA");
  await page
    .getByLabel("Email", { exact: true })
    .fill("private@example.invalid");
  await page.getByLabel("Phone", { exact: true }).fill("8185550100");
  await page.locator("#lead-consent").check();
  await page
    .getByRole("button", { name: "Request my consultation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    window.dataLayer?.filter(
      (e) => Array.isArray(e) && e[1] === "consultation_submitted",
    ),
  );
  expect(saved).toHaveLength(1);
  expect(JSON.stringify(saved)).not.toContain("private@example.invalid");
  await page.goto("/pasadena-shades-and-shutters/photo-intake/");
  await page
    .locator("#photos")
    .setInputFiles({
      name: "window.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP2sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByLabel("Your name").fill("Synthetic QA");
  await page
    .getByLabel("Email", { exact: true })
    .fill("private@example.invalid");
  await page.locator("#lead-consent").check();
  await page.getByRole("button", { name: "Send photos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.dataLayer?.filter(
        (e) => Array.isArray(e) && e[1] === "photo_submitted",
      ),
    ),
  ).toHaveLength(1);
  await page.goto("/auth/");
  expect(await page.evaluate(() => window.gtag)).toBeUndefined();
  expect(requests).toEqual([]);
});
