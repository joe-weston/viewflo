import { expect } from "@playwright/test";
import type { Browser, Page } from "playwright";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { captureAdmin, endpoints, fenceContext, localUrl } from "./boundary";
import type { Fixtures } from "./browser";
import type { CustomerDelivery } from "./customer-mail";
import { customerMailbox, validateCustomerRun } from "./customer-mail-policy";

export type CustomerJourney = {
  run: string;
  challenge: string;
  delivery: CustomerDelivery;
  checkpoint: (name: string, data?: object) => void;
};
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const challengeScript =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

async function photo(sequence: number) {
  const color = sequence === 1 ? "#94c5de" : "#c6d3ad";
  const drawing =
    '<svg width="480" height="320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" fill="#e6d9c6"/><rect x="95" y="32" width="290" height="255" fill="' +
    color +
    '" stroke="#5b4631" stroke-width="12"/><path d="M240 32v255M95 156h290" stroke="#5b4631" stroke-width="8"/></svg>';
  return {
    name: "synthetic-window-" + sequence + ".jpg",
    mimeType: "image/jpeg",
    buffer: await sharp(Buffer.from(drawing)).jpeg().toBuffer(),
  };
}

export async function runCustomerJourney(input: {
  browser: Browser;
  admin: Page;
  fixtures: Fixtures;
  db: SupabaseClient;
  customer: CustomerJourney;
  deny: () => void;
  capture: (name: string, png: Buffer) => Promise<void>;
}) {
  const { browser, admin, fixtures: f, db, customer, deny, capture } = input;
  const { run, challenge, delivery, checkpoint } = customer;
  validateCustomerRun(run);
  if (!/^[a-f0-9]{64}$/.test(challenge))
    throw Error("Invalid test security challenge");
  const base = endpoints.app + "/" + f.slugA + "/admin";
  const customerName = "Synthetic " + run;
  const title = "Window estimate " + run;
  const reviewSubject = "Project feedback " + run;
  const analyticsRoute = "/analytics/?days=7&campaign=" + run;
  const feedbackCopy = "Synthetic feedback request " + run + " for ";
  const reviewUrl = "https://review.example.invalid/";
  const sourceRow = () =>
    admin
      .getByRole("region", { name: "Sources and campaigns table" })
      .getByRole("row")
      .filter({ has: admin.getByRole("link", { name: run, exact: true }) });
  const analytics = async (
    visits: number,
    inquiries: number,
    quotes: number,
    won: number,
    completed: number,
  ) => {
    const page = await admin.goto(base + analyticsRoute, {
      waitUntil: "domcontentloaded",
      timeout: 24_000,
    });
    if (!page?.ok()) throw Error("Analytics navigation failed");
    const funnel = admin.locator(".growth-funnel");
    await expect(funnel).toBeVisible();
    const completion = funnel
      .getByText("Completed", { exact: true })
      .locator("..");
    await expect(completion.locator("strong")).toHaveText(String(completed));
    const source = sourceRow();
    if (!visits && !inquiries) await expect(source).toHaveCount(0);
    else {
      await expect(source).toHaveCount(1);
      const cells = source.getByRole("cell");
      for (const [i, value] of [visits, inquiries, quotes, won].entries())
        await expect(cells.nth(i + 1)).toHaveText(String(value));
    }
    const result = await db.rpc("vf_growth_analytics", {
      p_tenant: f.tenantA,
      p_from: new Date(Date.now() - 7 * 86400000).toISOString(),
      p_channel: "",
      p_campaign: run,
    });
    if (result.error || result.data?.totals?.completed !== completed)
      throw Error("Campaign completion count mismatch");
  };
  const pictures = async (
    name: "lead" | "quote" | "analytics" | "feedback",
    route: string,
  ) => {
    const navigation = await admin.goto(base + route, {
      waitUntil: "domcontentloaded",
    });
    if (!navigation?.ok()) throw Error("Capture navigation failed");
    const rendered = {
      lead: admin.getByRole("heading", { name: customerName, exact: true }),
      quote: admin.getByRole("row").filter({ hasText: title }),
      analytics: sourceRow(),
      feedback: admin.locator("article").filter({ hasText: reviewSubject }),
    }[name];
    await expect(rendered).toBeVisible({ timeout: 20_000 });
    if (name === "quote" || name === "feedback")
      await expect(rendered).toContainText("Accepted by provider");
    if (name === "feedback") {
      await rendered.locator(".growth-text").evaluate((paragraph, url) => {
        if (paragraph.textContent)
          paragraph.textContent = paragraph.textContent.replace(
            url,
            "[masked link]",
          );
      }, reviewUrl);
    }
    try {
      for (const [viewport, width, height] of [
        ["desktop", 1440, 1000],
        ["mobile", 390, 844],
      ] as const) {
        await admin.setViewportSize({ width, height });
        if (name === "lead") {
          // Only the generated-photo capture strips the invisible link target.
          // The actual image request and natural dimensions remain under test.
          const photos = admin.locator(".growth-photos img");
          await expect(photos).toHaveCount(2);
          for (const photo of await photos.all()) {
            await expect
              .poll(() =>
                photo.evaluate(
                  (img: HTMLImageElement) =>
                    img.complete && img.naturalWidth === 480,
                ),
              )
              .toBe(true);
            await photo.evaluate((img) =>
              img.closest("a")?.removeAttribute("href"),
            );
          }
        }
        await capture(
          name + "-" + viewport,
          await captureAdmin(admin, f.slugA, "synthetic-only"),
        );
      }
    } finally {
      await admin.setViewportSize({ width: 1440, height: 1000 });
    }
  };
  const visitor = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  try {
    await fenceContext(visitor, deny);
    await visitor.route(challengeScript, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body:
          "window.turnstile={render(_target,options){queueMicrotask(()=>options.callback(" +
          JSON.stringify(challenge) +
          '));return "vf-test"},reset(){},remove(){}};',
      }),
    );
    const page = await visitor.newPage();
    checkpoint("analytics-baseline");
    await analytics(0, 0, 0, 0, 0);
    checkpoint("tracked-link-form");
    await admin.goto(base + "/links/?edit=new");
    await expect(
      admin.getByRole("heading", { name: "Create tracked link", exact: true }),
    ).toBeVisible();
    await admin.getByLabel("Link name", { exact: true }).fill(run);
    await admin
      .locator('select[name="destination"]')
      .selectOption("/send-photos");
    await admin.getByLabel("Source", { exact: true }).fill(run);
    await admin.getByLabel("Campaign", { exact: true }).fill(run);
    checkpoint("tracked-link-save");
    await admin
      .getByRole("button", { name: "Save tracked link", exact: true })
      .click();
    await admin
      .getByRole("link", { name: "Open saved record", exact: true })
      .click();
    checkpoint("tracked-link-record");
    const card = admin
      .locator("article")
      .filter({ has: admin.getByRole("heading", { name: run, exact: true }) });
    await expect(card).toBeVisible();
    const track = localUrl(
      (await card.locator("code").textContent())?.trim() ?? "",
      [endpoints.app],
    );
    const linkId = track.pathname.split("/").filter(Boolean).at(-1);
    if (
      !linkId ||
      !uuid.test(linkId) ||
      !track.pathname.startsWith("/" + f.slugA + "/go/")
    )
      throw Error("Tracked link is not bound to the synthetic tenant");
    checkpoint("tracked-visit", { linkId });
    await page.goto(track.href, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      (url) =>
        url.origin === endpoints.app &&
        url.pathname.replace(/\/$/, "") === "/" + f.slugA + "/photo-intake",
    );
    checkpoint("visit-analytics", { linkId });
    await analytics(1, 0, 0, 0, 0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await analytics(1, 0, 0, 0, 0);
    checkpoint("photo-intake", { linkId });
    await delivery.arm("intake");
    await page
      .locator("#photos")
      .setInputFiles(await Promise.all([photo(1), photo(2)]));
    await page.getByLabel("Your full name").fill(customerName);
    await page.getByLabel("Email", { exact: true }).fill(customerMailbox);
    await page.locator("#lead-consent").check();
    const saved = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.replace(/\/$/, "") === "/api/leads" &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Send photos to request a quote" })
      .click();
    const response = await saved;
    if (response.status() !== 201) throw Error("Public intake did not save");
    const result = (await response.json()) as {
      reference?: string;
      emailStatus?: string;
    };
    const leadId = result.reference;
    if (!leadId || !uuid.test(leadId) || result.emailStatus !== "sent")
      throw Error("Intake delivery was not confirmed by the provider");
    await expect(
      page.getByRole("heading", { name: "Your request is saved" }),
    ).toBeVisible();
    await delivery.verify("intake", leadId);
    checkpoint("attributed-lead", { leadId, linkId });
    const leadRoute = "/leads/" + leadId + "/";
    await admin.goto(base + leadRoute);
    await expect(
      admin.getByRole("heading", { name: customerName, exact: true }),
    ).toBeVisible();
    for (const index of [1, 2]) {
      const image = admin.getByRole("img", {
        name: "Window photo " + index,
        exact: true,
      });
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    const attribution = await db
      .from("vf_growth_attribution")
      .select("first_visit,conversion_visit")
      .eq("tenant_id", f.tenantA)
      .eq("lead_id", leadId)
      .single();
    if (attribution.error) throw Error("Missing lead attribution");
    const visits = await db
      .from("vf_growth_visits")
      .select("id,link_id,source,campaign")
      .eq("tenant_id", f.tenantA)
      .in("id", [
        attribution.data.first_visit,
        attribution.data.conversion_visit,
      ]);
    if (
      visits.error ||
      visits.data.length !== 1 ||
      visits.data.some(
        (v) => v.link_id !== linkId || v.source !== run || v.campaign !== run,
      )
    )
      throw Error("Lead attribution does not match the original click");
    await expect(
      admin.getByRole("heading", { name: "Lead source", exact: true }),
    ).toBeVisible();
    await expect(
      admin.getByText(run + " · " + run, { exact: true }),
    ).toHaveCount(2);
    checkpoint("lead-attribution-verified", {
      leadId,
      linkId,
      visitId: visits.data[0].id,
    });
    await pictures("lead", leadRoute);
    await analytics(1, 1, 0, 0, 0);
    checkpoint("quote-draft", { leadId });
    await admin.goto(base + "/quotes/?edit=new&lead=" + leadId);
    await admin.getByLabel("Quote title", { exact: true }).fill(title);
    await admin.getByLabel("Room", { exact: true }).fill("Living room");
    await admin.getByLabel("Product", { exact: true }).fill("Synthetic shade");
    await admin.getByLabel("Unit price (USD)", { exact: true }).fill("99.00");
    await admin
      .getByRole("button", { name: "Save quote", exact: true })
      .click();
    await admin
      .getByRole("link", { name: "Open saved record", exact: true })
      .click();
    const quoteUrl = localUrl(admin.url(), [endpoints.app]);
    const quoteId = quoteUrl.searchParams.get("edit");
    if (!quoteId || !uuid.test(quoteId)) throw Error("Saved quote ID missing");
    await analytics(1, 1, 0, 0, 0);
    checkpoint("quote-send", { leadId, quoteId });
    await admin.goto(quoteUrl.href);
    await admin
      .getByRole("button", { name: "Approve current version", exact: true })
      .click();
    await delivery.arm("quote");
    await admin
      .getByRole("button", { name: "Approve & send quote", exact: true })
      .click();
    await delivery.verify("quote", "Living room — Synthetic shade: 1 × $99.00");
    checkpoint("quote-receipt-verified", { leadId, quoteId });
    await analytics(1, 1, 1, 0, 0);
    await pictures("quote", "/quotes/");
    checkpoint("customer-acceptance", { leadId, quoteId });
    await admin.goto(quoteUrl.href);
    await admin.locator('select[name="state"]').selectOption("accepted");
    await admin
      .getByRole("button", { name: "Record customer decision", exact: true })
      .click();
    await expect
      .poll(async () => {
        const q = await db
          .from("vf_growth_quotes")
          .select("state")
          .eq("id", quoteId)
          .single();
        return q.data?.state;
      })
      .toBe("accepted");
    await analytics(1, 1, 1, 1, 0);
    checkpoint("work-completion", { leadId });
    await admin.goto(base + leadRoute);
    await admin
      .getByLabel("Completion date", { exact: true })
      .fill(new Date().toISOString().slice(0, 10));
    await admin
      .getByLabel("Work summary", { exact: true })
      .fill("Synthetic installation complete");
    await admin
      .getByRole("button", { name: "Mark work completed", exact: true })
      .click();
    await expect(
      admin.getByRole("link", {
        name: "Prepare feedback request",
        exact: true,
      }),
    ).toBeVisible();
    await analytics(1, 1, 1, 1, 1);
    await pictures("analytics", "/analytics/");
    checkpoint("feedback-send", { leadId });
    await admin.goto(base + leadRoute);
    await admin
      .getByRole("link", { name: "Prepare feedback request", exact: true })
      .click();
    await expect(admin.locator('select[name="lead_id"]')).toHaveValue(leadId);
    await admin
      .getByLabel("Email subject", { exact: true })
      .fill(reviewSubject);
    await admin
      .getByLabel("Email content", { exact: true })
      .fill(feedbackCopy + "{{name}}. {{review_url}}");
    await admin.getByLabel("Review link", { exact: true }).fill(reviewUrl);
    await admin
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await admin
      .getByRole("link", { name: "Open saved record", exact: true })
      .click();
    const feedback = admin
      .locator("article")
      .filter({ has: admin.getByText(reviewSubject, { exact: true }) });
    await expect(feedback).toContainText(feedbackCopy + customerName + ".");
    const recipient = await db
      .from("vf_leads")
      .select("email")
      .eq("tenant_id", f.tenantA)
      .eq("id", leadId)
      .single();
    if (recipient.error || recipient.data.email !== customerMailbox)
      throw Error("Feedback recipient mismatch");
    await delivery.arm("feedback");
    await feedback
      .getByRole("button", {
        name: "Approve & send feedback request",
        exact: true,
      })
      .click();
    await delivery.verify(
      "feedback",
      feedbackCopy + customerName + ". " + reviewUrl,
    );
    checkpoint("feedback-receipt-verified", { leadId });
    await admin.goto(base + "/reviews/");
    await expect(feedback).toContainText("Accepted by provider");
    const record = await db
      .from("vf_growth_reviews")
      .select("id,draft_id")
      .eq("tenant_id", f.tenantA)
      .eq("lead_id", leadId)
      .single();
    if (record.error || !record.data.draft_id)
      throw Error("Feedback delivery record missing");
    await pictures("feedback", "/reviews/");
    checkpoint("reconciliation", {
      leadId,
      linkId,
      quoteId,
      feedbackId: record.data.id,
    });
    await admin.goto(base + leadRoute);
    await admin.reload();
    await analytics(1, 1, 1, 1, 1);
    const leads = await db
      .from("vf_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", f.tenantA)
      .eq("name", customerName);
    if (leads.error || leads.count !== 1)
      throw Error("Duplicate lead for this run");
    await delivery.exactlyThree();
    checkpoint("complete", {
      leadId,
      linkId,
      quoteId,
      feedbackId: record.data.id,
    });
  } finally {
    await visitor.close();
  }
}
