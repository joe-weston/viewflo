import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const prefix = "/pasadena-shades-and-shutters";

test("consultation phone field is distinct and guides correction before submitting", async ({
  page,
}, info) => {
  const phoneEvidence = path.resolve("tmp/ui-verification/consultation-phone");
  fs.mkdirSync(phoneEvidence, { recursive: true });
  let submissions = 0;
  await page.route("**/api/leads/", async (route) => {
    submissions++;
    const body = route.request().postDataBuffer()?.toString() || "";
    expect(body).toContain('name="phone"\r\n\r\n818-555-0100');
    expect(body).toContain('name="name"\r\n\r\nSynthetic Visitor');
    await route.fulfill({
      status: 201,
      json: { reference: "synthetic-phone-reference", emailStatus: "queued" },
    });
  });
  await page.goto(`${prefix}/consultation/`);
  await page.getByRole("checkbox", { name: "Shutters", exact: true }).check();
  await page.getByRole("radio", { name: "1–2 windows", exact: true }).check();
  await page
    .getByRole("radio", { name: "As soon as possible", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Pasadena", exact: true }).check();
  await page
    .getByRole("radio", { name: "$4,000 – $8,000", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  const name = page.getByLabel("Your full name");
  const phone = page.getByLabel("Phone number", { exact: true });
  await expect(phone).toBeVisible();
  await expect(phone).toHaveAttribute("autocomplete", "tel");
  await expect(phone).toHaveAttribute("name", "phone");
  const nameBox = await name.boundingBox();
  const phoneBox = await phone.boundingBox();
  expect(phoneBox!.y).toBeGreaterThan(nameBox!.y + nameBox!.height);
  await name.fill("Synthetic Visitor");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.invalid");
  await page.locator("#lead-consent").check();
  await phone.evaluate((input) =>
    input.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.screenshot({
    path: `${phoneEvidence}/${info.project.name}-contact.png`,
  });
  const submit = page.getByRole("button", { name: "Request my consultation" });
  await submit.click();
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toHaveClass(/border-red-500/);
  await expect(page.locator("#lead-phone-error")).toContainText(
    "including area code",
  );
  expect(submissions).toBe(0);
  await phone.fill("Visitor");
  await submit.click();
  await expect(phone).toBeFocused();
  await expect(page.locator("#lead-phone-error")).toBeVisible();
  await page.screenshot({
    path: `${phoneEvidence}/${info.project.name}-invalid-phone.png`,
  });
  expect(submissions).toBe(0);
  await phone.fill("818-555-0100");
  await expect(page.locator("#lead-phone-error")).toHaveCount(0);
  await expect(phone).not.toHaveAttribute("aria-invalid", "true");
  await expect(phone).not.toHaveClass(/border-red-500/);
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved" }),
  ).toBeVisible();
  expect(submissions).toBe(1);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `${phoneEvidence}/${info.project.name}-receipt.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
