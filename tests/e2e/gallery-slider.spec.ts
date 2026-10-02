import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const prefix = "/pasadena-shades-and-shutters";
const evidence = path.resolve("tmp/ui-verification/pasadena-before-after");
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("approved gallery pairs reveal independently by keyboard, drag and touch", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(prefix + "/gallery/");
  await page.evaluate(() => document.fonts.ready);
  const sliders = page.getByRole("slider");
  await expect(sliders).toHaveCount(5);
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
  for (const slider of await sliders.all()) {
    await slider.focus();
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "54");
    await slider.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await slider.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    await slider.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "96");
  }
  const first = sliders.first();
  const image = first.locator("..");
  await first.press("Home");
  await image.screenshot({
    path: evidence + "/" + info.project.name + "-after.png",
  });
  await first.press("End");
  await image.screenshot({
    path: evidence + "/" + info.project.name + "-before.png",
  });
  await first.press("Home");
  await first.press("ArrowRight");
  await image.scrollIntoViewIfNeeded();
  const box = (await image.boundingBox())!;
  const start = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.5 };
  const end = { x: box.x + box.width * 0.75, y: start.y };
  if (info.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    for (let n = 1; n <= 5; n++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x + ((end.x - start.x) * n) / 5, y: start.y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await page.mouse.up();
  }
  await expect(first).toHaveAttribute("aria-valuenow", /7[45]/);
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuenow", "96");
  await image.screenshot({
    path: evidence + "/" + info.project.name + "-dragged.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Arcadia", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(1);
  await expect(page.getByRole("slider")).toHaveAccessibleName(
    "Reveal before and after for Family room off the pool",
  );
  await page.screenshot({
    path: evidence + "/" + info.project.name + "-filtered.png",
    fullPage: true,
  });
  await page.goto(prefix + "/");
  const preview = page.locator("#gallery");
  const active = preview.getByRole("slider");
  await active.focus();
  await active.press("End");
  await preview.getByRole("button", { name: /Primary bathroom/ }).click();
  await expect(preview.getByRole("slider")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  await expect(preview.getByRole("slider")).toHaveAccessibleName(
    "Reveal before and after for Primary bathroom",
  );
  await preview.screenshot({
    path: evidence + "/" + info.project.name + "-home-project-switch.png",
    style: "header { visibility: hidden; }",
  });
  expect(errors).toEqual([]);
});
