import { test, expect } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
const tenant = "pasadena-shades-and-shutters";
const evidence = "tmp/ui-verification/admin-billing-magic-link";
// Token-bearing callback URLs must not enter browser traces.
test.use({ trace: "off" });
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
function withHost(path: string, host: string) {
  return new Promise<{
    status: number;
    body: string;
    location: string | undefined;
  }>((resolve, reject) => {
    const request = http.get(
      { hostname: "127.0.0.1", port: 3188, path, headers: { host } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body,
            location: response.headers.location,
          }),
        );
      },
    );
    request.on("error", reject);
  });
}
test("email-only login, confirmation, expired link and unavailable workspace", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [route, title, state] of [
    ["/", "A place for your business.", "platform"],
    [`/auth?tenant=${tenant}`, "Welcome back.", "signin"],
    [
      `/auth?tenant=${tenant}&message=check-email`,
      "Welcome back.",
      "email-sent",
    ],
    [`/auth?tenant=${tenant}&error=expired`, "Welcome back.", "expired"],
    [`/${tenant}/admin/billing`, "Workspace unavailable", "denied"],
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
  await page.goto(`/auth?tenant=${tenant}`);
  await expect(
    page.getByRole("button", { name: "Send sign-in link" }),
  ).toBeDisabled();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create an account" }),
  ).toHaveCount(0);
  await page.getByLabel("Manager email").focus();
  await expect(page.getByLabel("Manager email")).toBeFocused();
  expect(errors).toEqual([]);
});
test("custom domains retain clean auth paths and reject cross-tenant callbacks", async () => {
  for (const host of [
    "pasadenashadesandshutters.com",
    "www.pasadenashadesandshutters.com",
  ]) {
    const login = await withHost("/auth/", host);
    expect(login.status).toBe(200);
    expect(login.body).toContain('name="tenant" value="' + tenant + '"');
    const denied = await withHost("/admin/billing/", host);
    expect(denied.body).toContain(`/auth?tenant=${tenant}`);
    const expired = await withHost(
      `/auth/callback/?tenant=${tenant}&next=https://evil.test`,
      host,
    );
    expect(expired.location).toBe(
      `https://${host}/auth?tenant=${tenant}&error=expired`,
    );
    const other = await withHost(
      "/auth/callback/?tenant=another-business",
      host,
    );
    expect(other.status).toBe(400);
  }
});
test("configured manager magic-link journey", async ({ page }, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Single-use link is consumed once; mobile is inspected in the same session.",
  );
  test.skip(
    !process.env.PLAYWRIGHT_TEST_USER ||
      !process.env.PLAYWRIGHT_TEST_PASS ||
      !process.env.PLAYWRIGHT_MAGIC_LINK_URL,
    "BLOCKED: canonical credentials and an approved synthetic test-mailbox magic link required",
  );

  const link = new URL(process.env.PLAYWRIGHT_MAGIC_LINK_URL!);
  expect(link.origin).toBe("http://127.0.0.1:3188");
  expect(link.pathname.replace(/\/$/, "")).toBe("/auth/callback");
  try {
    await page.goto(link.toString());
    await page.waitForURL(url => url.pathname.replace(/\/$/, "") === `/${tenant}/admin/billing`);
  } catch {
    // Avoid including the bearer link in Playwright's navigation error output.
    throw new Error("Approved magic-link navigation did not reach tenant billing");
  }
  await expect(
    page.getByRole("heading", { name: "Billing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Terms & Conditions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Privacy Policy", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/${info.project.name}-authenticated.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${evidence}/mobile-authenticated.png`,
    fullPage: true,
  });
});
