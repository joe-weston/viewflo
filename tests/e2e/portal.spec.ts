import { test, expect } from "@playwright/test";
import fs from "node:fs";
const evidence = "tmp/ui-verification/tenant-billing";
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("platform entry, disabled unconfigured auth and protected workspace", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [route, title, state] of [
    ["/", "A place for your business.", "platform"],
    ["/auth/", "Welcome back.", "signin"],
    ["/pasadena-shades-and-shutters/admin/", "Workspace unavailable", "denied"],
    [
      "/another-business/admin/billing/",
      "Workspace unavailable",
      "other-tenant",
    ],
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/${info.project.name}-${state}.png`,
      fullPage: true,
    });
  }
  await page.goto("/auth/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Create an account" }),
  ).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).focus();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
test("authenticated agreement and billing flow requires configured canonical account", async ({
  page,
}, info) => {
  test.skip(
    !process.env.PLAYWRIGHT_TEST_USER || !process.env.PLAYWRIGHT_TEST_PASS,
    "BLOCKED: canonical authenticated test credentials unavailable",
  );
  await page.goto("/auth/?tenant=pasadena-shades-and-shutters");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.PLAYWRIGHT_TEST_USER!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.PLAYWRIGHT_TEST_PASS!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pasadena",
  );
  await page.screenshot({
    path: `${evidence}/${info.project.name}-authenticated.png`,
    fullPage: true,
  });
  // No acceptance or payment without an explicitly approved nonproduction legal fixture and plan.
});
