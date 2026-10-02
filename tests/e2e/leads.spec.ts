import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const evidence = path.resolve(
  "tmp/ui-verification/pasadena-staging-corrections",
);
const prefix = "/pasadena-shades-and-shutters";
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("legacy photo URL redirects once to the canonical form", async ({
  request,
  page,
}) => {
  const redirect = await request.get(`${prefix}/send-photos/`, {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe(`${prefix}/photo-intake/`);
  await page.goto(`${prefix}/send-photos/`);
  await expect(page).toHaveURL(new RegExp(`${prefix}/photo-intake/$`));
  await expect(
    page.getByRole("heading", {
      name: "Send photos of your windows",
      exact: true,
    }),
  ).toBeVisible();
});
test("consultation validates all steps, preserves answers, and shows queued receipt", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/leads/", async (route) => {
    const body = route.request().postDataBuffer()?.toString() || "";
    expect(body).toContain("consultation");
    expect(body).toContain("qa@example.invalid");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 201,
      json: {
        reference: "synthetic-consultation-reference",
        emailStatus: "queued",
      },
    });
  });
  await page.goto(`${prefix}/consultation/`);
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-project.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Choose a project type",
  );
  await expect(page.locator("form").getByRole("alert")).toBeFocused();
  await page.getByRole("checkbox", { name: "Shutters", exact: true }).check();
  await page.getByRole("radio", { name: "1–2 windows", exact: true }).check();
  await page
    .getByRole("radio", { name: "Just gathering ideas", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "The details", exact: true }),
  ).toBeFocused();
  await page.getByRole("radio", { name: "Pasadena", exact: true }).check();
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-details.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your full name").fill("Synthetic QA");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.invalid");
  await page.getByLabel("Email", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-contact-viewport.png`,
  });
  await page.getByLabel("Phone number", { exact: true }).fill("818-555-0100");
  await page.locator("#lead-consent").check();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Pasadena", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "qa@example.invalid",
  );
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-contact.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Request my consultation" }).click();
  await expect(
    page.getByRole("button", { name: "Sending your request…" }),
  ).toBeDisabled();
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-sending.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "do not need to submit it again",
  );
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-consultation-queued.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("photo intake requires email, supports remove and retry with the same identity", async ({
  page,
}, info) => {
  const identities: string[] = [];
  let attempt = 0;
  await page.route("**/api/leads/", async (route) => {
    const body = route.request().postDataBuffer()?.toString() || "";
    identities.push(body.match(/name="requestId"\r\n\r\n([^\r]+)/)?.[1] || "");
    if (++attempt === 1)
      await route.fulfill({
        status: 503,
        json: { error: "Please retry with the same form." },
      });
    else
      await route.fulfill({
        status: 201,
        json: { reference: "synthetic-photo-reference", emailStatus: "sent" },
      });
  });
  await page.goto(`${prefix}/photo-intake/`);
  await expect(page).toHaveURL(`${prefix}/photo-intake/`);
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-empty.png`,
    fullPage: true,
  });
  const submit = page.getByRole("button", {
    name: "Send photos",
  });
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "between 1 and 3",
  );
  await page
    .locator("#photos")
    .setInputFiles("public/818aaed5-2de2-408a-9918-b48936405ebb.jpg");
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(page.locator('img[alt="Selected window photo 1"]')).toHaveCount(
    0,
  );
  await page
    .locator("#photos")
    .setInputFiles("public/818aaed5-2de2-408a-9918-b48936405ebb.jpg");
  await page.getByLabel("Your full name").fill("Synthetic QA");
  await page.locator("#lead-consent").check();
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "valid email",
  );
  await page.getByLabel("Email", { exact: true }).fill("qa@example.invalid");
  await page.getByLabel("Email", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "qa@example.invalid",
  );
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-contact-viewport.png`,
  });
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-selected.png`,
    fullPage: true,
  });
  await submit.click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "same form",
  );
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-error-viewport.png`,
  });
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-error.png`,
    fullPage: true,
  });
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "confirmation email has been sent",
  );
  expect(identities[0]).not.toBe("");
  expect(identities[0]).toBe(identities[1]);
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${evidence}/${info.project.name}-photo-sent.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("public endpoints fail closed, cron is protected, legacy clients cannot bypass notifications", async ({
  request,
}) => {
  expect((await request.get("/api/leads/retry/")).status()).toBe(401);
  expect(
    (
      await request.get("/api/leads/retry/", {
        headers: { authorization: "Bearer bogus" },
      })
    ).status(),
  ).toBe(401);
  expect((await request.post("/api/photo-requests/")).status()).toBe(410);
  expect(
    (
      await request.post("/api/leads/", {
        headers: { origin: "https://attacker.invalid" },
      })
    ).status(),
  ).toBe(403);
});
