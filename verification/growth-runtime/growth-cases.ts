import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "playwright";
import { endpoints } from "./boundary";
import type { Fixtures } from "./browser";

export async function verifyGrowthWorkspaces(
  page: Page,
  f: Fixtures,
  db: SupabaseClient,
) {
  const base = `${endpoints.app}/${f.slugA}/admin`;
  const title = "Synthetic local content draft";
  await page.goto(`${base}/content?edit=new`);
  await page.getByLabel("Content title", { exact: true }).fill(title);
  await page
    .getByLabel("Content", { exact: true })
    .fill("Synthetic campaign text for the local review cohort.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/content`);
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await card
    .getByRole("link", { name: "Create tracked link", exact: true })
    .click();
  const linkName = "Synthetic local tracked link";
  await page.getByLabel("Link name", { exact: true }).fill(linkName);
  await page.getByLabel("Source", { exact: true }).fill("synthetic-local");
  await page
    .getByRole("button", { name: "Save tracked link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: linkName, exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/links`);
  await expect(
    page.getByRole("heading", { name: linkName, exact: true }),
  ).toBeVisible();
  const link = await db
    .from("vf_growth_links")
    .select("content_id,published_at")
    .eq("tenant_id", f.tenantA)
    .eq("label", linkName)
    .single();
  expect(
    !link.error && !!link.data.content_id && link.data.published_at === null,
  ).toBe(true);

  // This is seeded attribution evidence. Public intake and Turnstile are Phase B.
  await page.goto(`${base}/analytics?days=7`);
  const sourceTable = page
    .getByRole("region", { name: "Sources and campaigns table" })
    .getByRole("table");
  const source = sourceTable
    .getByRole("row")
    .filter({ hasText: f.analyticsSource });
  await expect(source).toBeVisible();
  await source.getByRole("link").click();
  const cohort = new URL(page.url());
  expect(
    cohort.origin === endpoints.app &&
      cohort.searchParams.get("source") === f.analyticsSource &&
      !!cohort.searchParams.get("from"),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Leads", exact: true }),
  ).toBeVisible();

  await page.goto(`${base}/quotes?edit=new&lead=${f.leadA}`);
  const quoteTitle = "Synthetic local quote";
  await page.getByLabel("Quote title", { exact: true }).fill(quoteTitle);
  await page.getByLabel("Room", { exact: true }).fill("Living room");
  await page.getByLabel("Product", { exact: true }).fill("Synthetic shade");
  await page.getByLabel("Unit price (USD)", { exact: true }).fill("99.00");
  await page.getByRole("button", { name: "Save quote", exact: true }).click();
  await page
    .getByRole("link", { name: "Open saved record", exact: true })
    .click();
  await expect(page.getByLabel("Quote title", { exact: true })).toHaveValue(
    quoteTitle,
  );
  await page
    .getByRole("button", { name: "Approve current version", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve & send quote", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Approve & send quote", exact: true }),
  ).toBeDisabled();
  const quote = await db
    .from("vf_growth_quotes")
    .select("state,version,approved_version,draft_id,manual_sent_at")
    .eq("tenant_id", f.tenantA)
    .eq("lead_id", f.leadA)
    .eq("title", quoteTitle)
    .single();
  expect(
    !quote.error &&
      quote.data.state === "approved" &&
      quote.data.version === quote.data.approved_version &&
      quote.data.draft_id === null &&
      quote.data.manual_sent_at === null,
  ).toBe(true);

  await page.goto(`${base}/leads/${f.leadA}`);
  await page
    .getByLabel("Completion date", { exact: true })
    .fill(new Date().toISOString().slice(0, 10));
  await page
    .getByLabel("Work summary", { exact: true })
    .fill("Synthetic local work completed.");
  await page
    .getByRole("button", { name: "Mark work completed", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Prepare feedback request", exact: true })
    .click();
  await expect(
    page.getByLabel("Completed customer", { exact: true }),
  ).toHaveValue(f.leadA);
  await page
    .getByLabel("Email subject", { exact: true })
    .fill("Synthetic local feedback");
  await page
    .getByLabel("Email content", { exact: true })
    .fill("Synthetic feedback for {{name}}.");
  await page
    .getByLabel("Review link", { exact: true })
    .fill("https://review.example.invalid/");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Approve & send feedback request",
      exact: true,
    }),
  ).toBeDisabled();
  await page.goto(`${base}/reviews`);
  await expect(
    page.getByText("Synthetic local feedback", { exact: true }),
  ).toBeVisible();
  const review = await db
    .from("vf_growth_reviews")
    .select("draft_id,manual_sent_at")
    .eq("tenant_id", f.tenantA)
    .eq("lead_id", f.leadA)
    .eq("subject", "Synthetic local feedback")
    .single();
  expect(
    !review.error &&
      review.data.draft_id === null &&
      review.data.manual_sent_at === null,
  ).toBe(true);
}
