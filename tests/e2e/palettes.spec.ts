import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const evidence = path.resolve("tmp/ui-verification/pasadena-palette-preview");
test.beforeEach(({}, info) => {
  const productionOnly = process.env.PALETTE_TEST_PRODUCTION_ONLY === "true";
  test.skip(productionOnly !== info.title.startsWith("production"));
});
const palettes = [
  ["coastal", "rgb(40, 107, 115)"],
  ["sage", "rgb(80, 108, 89)"],
  ["pacific", "rgb(44, 100, 130)"],
  ["clay", "rgb(163, 79, 57)"],
];

test("production keeps Coastal teal and excludes the overlay", async ({
  page,
}, info) => {
  fs.mkdirSync(evidence, { recursive: true });
  for (const route of [
    "/pasadena-shades-and-shutters/",
    "/pasadena-shades-and-shutters/consultation/",
  ]) {
    await page.goto(route);
    await expect(page.locator(".pasadena-site")).toHaveAttribute(
      "data-palette",
      "coastal",
    );
    await expect(page.locator(".palette-preview")).toHaveCount(0);
    await page.evaluate(() =>
      sessionStorage.setItem("pasadena-staging-palette", "clay"),
    );
    await page.reload();
    await expect(page.locator(".pasadena-site")).toHaveAttribute(
      "data-palette",
      "coastal",
    );
  }
  await page.screenshot({
    path: `${evidence}/${info.project.name}-production.png`,
    fullPage: true,
  });
});

test("staging palettes recolor home and consultation and persist across navigation", async ({
  page,
}, info) => {
  fs.mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/pasadena-shades-and-shutters/consultation/");
  await expect(page.locator(".pasadena-site")).toHaveAttribute(
    "data-palette",
    "coastal",
  );
  await page
    .getByRole("button", { name: "Preview palettes", exact: true })
    .click();
  const picker = page.getByLabel("Website color scheme");
  for (const [id, color] of palettes) {
    await picker.selectOption(id);
    await expect(page.locator(".pasadena-site")).toHaveAttribute(
      "data-palette",
      id,
    );
    await expect(page.locator(".preview-banner")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(page.locator(".preview-banner")).toHaveCSS(
      "color",
      "rgb(37, 44, 48)",
    );
    await expect(page.locator(".preview-banner")).toHaveCSS(
      "border-bottom-width",
      "0px",
    );
    await expect(page.locator(".pasadena-site .bg-brass").first()).toHaveCSS(
      "background-color",
      color,
    );
    await expect(page.locator(".pasadena-site")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/${info.project.name}-${id}-modern.png`,
      fullPage: true,
    });
  }
  await picker.press("Escape");
  await expect(
    page.getByRole("button", { name: "Preview palettes", exact: true }),
  ).toBeFocused();
  await expect(picker).toBeHidden();
  await page.reload();
  await expect(page.locator(".pasadena-site")).toHaveAttribute(
    "data-palette",
    "clay",
  );
  await page.goto("/pasadena-shades-and-shutters/");
  await expect(page.locator(".pasadena-site")).toHaveAttribute(
    "data-palette",
    "clay",
  );
  await page
    .getByRole("button", { name: "Preview palettes", exact: true })
    .click();
  for (const [id, color] of palettes) {
    await picker.selectOption(id);
    await expect(page.locator(".pasadena-site .bg-brass").first()).toHaveCSS(
      "background-color",
      color,
    );
    await expect(page.locator(".preview-banner")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(page.locator(".preview-banner")).toHaveCSS(
      "color",
      "rgb(37, 44, 48)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/${info.project.name}-${id}-home.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Reset to recommended" }).click();
  await expect(picker).toHaveValue("coastal");
  await expect(page.locator(".pasadena-site")).toHaveAttribute(
    "data-palette",
    "coastal",
  );
  await page.goto("/");
  await expect(page.locator(".palette-preview")).toHaveCount(0);
  await page.goto("/pasadena-shades-and-shutters/admin");
  await expect(page.locator(".palette-preview")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("invalid stored palette falls back safely", async ({ page }) => {
  await page.goto("/pasadena-shades-and-shutters/consultation/");
  await page.evaluate(() =>
    sessionStorage.setItem("pasadena-staging-palette", "unknown"),
  );
  await page.reload();
  await expect(page.locator(".pasadena-site")).toHaveAttribute(
    "data-palette",
    "coastal",
  );
});
