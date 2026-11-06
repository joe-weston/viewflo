import { expect } from "@playwright/test";
import { chromium, type Page } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  captureAdmin,
  capturedCallback,
  cleanBrowserEnv,
  endpoints,
  fenceContext,
  localFetch,
} from "./boundary";
import {
  openBrowserProxy,
  type ProxyFault,
  type ProxyLocation,
} from "./browser-proxy";
import { verifyGrowthWorkspaces } from "./growth-cases";
import { runCustomerJourney, type CustomerJourney } from "./customer-journey";

const roles = ["owner", "member", "billing", "foreign", "staff"] as const;
type Role = (typeof roles)[number];
export type Fixtures = {
  status: "seeded";
  run: "growth-mvp-20261106e";
  slugA: "pasadena-shades-and-shutters";
  slugB: "review-b-growth-mvp-20261106e";
  tenantA: string;
  tenantB: string;
  leadA: string;
  leadB: string;
  operatorLead: string;
  analyticsSource: "synthetic-seeded-attribution";
  users: Record<Role | "operator", string>;
};
type BrowserInputs = {
  customer?: CustomerJourney;
  executablePath: string;
  attest: () => Promise<void>;
  fixtures: Fixtures;
  secrets: {
    anon: string;
    service: string;
    users: Record<Role, { email: string }>;
  };
  saveMaskedImage: (caseName: string, png: Buffer) => Promise<void>;
};
type Phase =
  | "auth"
  | "crm"
  | "authorization"
  | "website"
  | "growth"
  | "revocation"
  | "customer-journey";

type MailReceipt = { ID: string; To: { Address: string }[] };
async function localEmailSignIn(
  page: Page,
  attest: BrowserInputs["attest"],
  email: string,
  tenant: string,
  step: (value: AuthStep) => void,
) {
  if (!/^[a-z0-9.+-]+@example\.invalid$/.test(email))
    throw new Error("Synthetic recipient required");
  const request = localFetch(attest, endpoints.mail);
  const messages = async () => {
    const response = await request(endpoints.mail + "/api/v1/messages");
    if (!response.ok) throw new Error("Local mail unavailable");
    const body = (await response.json()) as { messages: MailReceipt[] };
    if (!Array.isArray(body.messages))
      throw new Error("Missing mail inventory");
    return body.messages;
  };
  step("mail-inventory");
  const previous = new Set((await messages()).map((message) => message.ID));
  step("sign-in-form");
  await page.goto(endpoints.app + "/auth?tenant=" + tenant);
  await page.getByLabel("Manager email", { exact: true }).fill(email);
  await attest();
  await page
    .getByRole("button", { name: "Send sign-in link", exact: true })
    .click();
  await page.waitForURL(
    (url) =>
      url.origin === endpoints.app &&
      url.pathname.replace(/\/$/, "") === "/auth" &&
      url.searchParams.get("message") === "check-email",
  );
  step("mail-receipt");
  let receipt: MailReceipt | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidates = (await messages()).filter(
      (message) =>
        !previous.has(message.ID) &&
        message.To?.some((to) => to.Address === email),
    );
    if (candidates.length > 1) throw new Error("Ambiguous mail receipt");
    if (candidates[0]) {
      receipt = candidates[0];
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!receipt || !/^[a-zA-Z0-9-]+$/.test(receipt.ID))
    throw new Error("Missing mail receipt");
  const response = await request(
    endpoints.mail + "/api/v1/message/" + receipt.ID,
  );
  if (!response.ok) throw new Error("Local mail unavailable");
  const body = (await response.json()) as { HTML?: string; Text?: string };
  step("callback");
  const callback = capturedCallback(body.HTML || body.Text || "", tenant);
  await attest();
  await page.goto(callback.href);
  await page.waitForURL(
    (url) =>
      url.origin === endpoints.app &&
      !url.search &&
      [`/${tenant}/admin`, `/${tenant}/admin/billing`].includes(
        url.pathname.replace(/\/$/, ""),
      ),
  );
}

type AuthStep =
  | "launch"
  | "mail-inventory"
  | "sign-in-form"
  | "mail-receipt"
  | "callback"
  | "session"
  | "landing"
  | "desktop-capture"
  | "mobile-capture";

/** For the future receipt-bound controller. No CLI entry, credentials or runner artifacts. */
export async function runGrowthBrowser({
  customer,
  executablePath,
  attest,
  fixtures: f,
  secrets,
  saveMaskedImage,
}: BrowserInputs) {
  let phase: Phase = "auth";
  let authStep: AuthStep = "launch";
  let networkFault: ProxyFault | "browser-policy" | undefined;
  let networkLocation: ProxyLocation | undefined;
  let transportWarning: ProxyLocation | undefined;
  const deny = (
    fault: ProxyFault | "browser-policy" = "browser-policy",
    location?: ProxyLocation,
  ) => {
    if (fault === "upstream-timeout" || fault === "upstream-transport") {
      transportWarning ??= location;
      return;
    }
    if (networkFault) return;
    networkFault = fault;
    networkLocation = location;
  };
  const verify = async () => {
    if (networkFault) throw new Error("Browser boundary denied a request");
    await attest();
  };
  try {
    await verify();
    const ids = [
      f.tenantA,
      f.tenantB,
      f.leadA,
      f.leadB,
      f.operatorLead,
      ...Object.values(f.users),
    ];
    if (
      f.status !== "seeded" ||
      f.run !== "growth-mvp-20261106e" ||
      f.slugA !== "pasadena-shades-and-shutters" ||
      f.slugB !== "review-b-growth-mvp-20261106e" ||
      f.analyticsSource !== "synthetic-seeded-attribution" ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) =>
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id),
      )
    )
      throw new Error("Synthetic fixture mismatch");
    const proxy = await openBrowserProxy(verify, deny);
    try {
      const browser = await chromium.launch({
        executablePath,
        env: cleanBrowserEnv(),
        proxy: { server: proxy.origin, bypass: "<-loopback>" },
        args: [
          "--disable-quic",
          "--disable-background-networking",
          "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
          "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
        ],
        timeout: 15_000,
      });
      try {
        await runCases(
          browser,
          {
            customer,
            executablePath,
            attest: verify,
            fixtures: f,
            secrets,
            saveMaskedImage,
          },
          deny,
          (next) => {
            phase = next;
          },
          (step) => {
            authStep = step;
          },
        );
        await verify();
        return {
          phase,
          result: "pass",
          ...(transportWarning ? { transportWarning } : {}),
        } as const;
      } finally {
        await browser.close();
      }
    } finally {
      await proxy.close();
    }
  } catch {
    return {
      phase,
      result: "fail",
      category: networkFault ? "network" : "assertion-or-setup",
      ...(networkFault ? { networkFault } : {}),
      ...(networkLocation ? { networkLocation } : {}),
      ...(transportWarning ? { transportWarning } : {}),
      ...(phase === "auth" ? { authStep } : {}),
    } as const;
  }
}

async function runCases(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  { attest, fixtures: f, secrets, saveMaskedImage, customer }: BrowserInputs,
  deny: () => void,
  setPhase: (phase: Phase) => void,
  authStep: (step: AuthStep) => void,
) {
  const safeFetch = localFetch(attest, endpoints.api);
  const contexts = [];
  const pages = {} as Record<Role, Page>;
  const clientFor = async (page: Page) => {
    const cookies = await page.context().cookies(endpoints.app);
    // Observe the legitimate session created by the UI flow; never inject/forge browser cookies or login tokens.
    return createServerClient(endpoints.api, secrets.anon, {
      cookies: {
        getAll: () => cookies.map((c) => ({ name: c.name, value: c.value })),
        setAll: () => {},
      },
      global: { fetch: safeFetch },
    });
  };
  const capture = async (page: Page, name: string) => {
    await attest();
    const slug = [f.slugA, f.slugB].find((candidate) =>
      new URL(page.url()).pathname.startsWith(`/${candidate}/admin`),
    );
    if (!slug || !/^[a-z-]+$/.test(name))
      throw new Error("Unknown capture route");
    const image = await captureAdmin(page, slug, "synthetic-only");
    await saveMaskedImage(name, image);
  };
  try {
    for (const role of roles) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        serviceWorkers: "block",
      });
      contexts.push(context);
      context.setDefaultTimeout(10_000);
      context.setDefaultNavigationTimeout(customer ? 25_000 : 15_000);
      await fenceContext(context, deny);
      const page = await context.newPage();
      pages[role] = page;
      await localEmailSignIn(
        page,
        attest,
        secrets.users[role].email,
        role === "foreign" ? f.slugB : f.slugA,
        authStep,
      );
      authStep("session");
      const client = await clientFor(page);
      const user = await client.auth.getUser();
      expect(!user.error && user.data.user?.id === f.users[role]).toBe(true);
      authStep("landing");
      if (role === "billing")
        await expect(
          page.getByRole("heading", { name: "Billing", exact: true }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("heading", { name: "Leads", exact: true }),
        ).toBeVisible();
      if (customer && role === "owner") {
        setPhase("customer-journey");
        await runCustomerJourney({
          browser,
          admin: page,
          fixtures: f,
          db: client,
          customer,
          deny,
          capture: saveMaskedImage,
        });
        return;
      }
      authStep("desktop-capture");
      await capture(page, `${role}-desktop`);
      await page.setViewportSize({ width: 390, height: 844 });
      authStep("mobile-capture");
      await capture(page, `${role}-mobile`);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    setPhase("crm");
    const owner = pages.owner,
      member = pages.member,
      billing = pages.billing,
      base = `/${f.slugA}/admin`,
      lead = `${base}/leads/${f.leadA}`;
    await owner.goto(endpoints.app + lead);
    await member.goto(endpoints.app + lead);
    await expect(
      owner.getByRole("heading", {
        name: "Synthetic CRM review inquiry",
        exact: true,
      }),
    ).toBeVisible();
    const photo = owner.getByRole("img", {
      name: "Window photo 1",
      exact: true,
    });
    await expect
      .poll(() =>
        photo.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    await owner.getByLabel("Stage", { exact: true }).selectOption("qualified");
    await owner.getByRole("button", { name: "Save lead", exact: true }).click();
    await expect(
      owner
        .locator("form")
        .filter({ has: owner.getByLabel("Stage", { exact: true }) })
        .getByRole("status"),
    ).toHaveText("Saved");
    await member.getByLabel("Stage", { exact: true }).selectOption("won");
    await member
      .getByRole("button", { name: "Save lead", exact: true })
      .click();
    await expect(member.getByRole("alert")).toContainText(
      "changed since you opened it",
    );
    await owner.reload();
    await expect(owner.getByLabel("Stage", { exact: true })).toHaveValue(
      "qualified",
    );
    const notes = owner.locator("section").filter({
      has: owner.getByRole("heading", {
        name: "Internal notes",
        exact: true,
      }),
    });
    const note = `Synthetic local acceptance ${f.run}`;
    await notes.getByLabel("Internal note", { exact: true }).fill(note);
    await notes.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(notes.getByRole("status")).toHaveText("Saved");
    await owner.reload();
    await expect(
      notes.locator("article").getByText(note, { exact: true }),
    ).toBeVisible();
    const draft = owner.locator("form").filter({
      has: owner.getByRole("button", {
        name: "Save email draft",
        exact: true,
      }),
    });
    await draft
      .getByLabel("Subject", { exact: true })
      .fill(`Unsent local review ${f.run}`);
    await draft
      .getByLabel("Message", { exact: true })
      .fill("Synthetic draft. Do not send.");
    await draft
      .getByRole("button", { name: "Save email draft", exact: true })
      .click();
    await expect(draft.getByRole("status")).toHaveText(
      "Draft saved · not sent",
    );
    await owner.reload();
    const savedDraft = owner.locator("article").filter({
      has: owner.getByRole("heading", {
        name: `Unsent local review ${f.run}`,
        exact: true,
      }),
    });
    await expect(
      savedDraft.getByText("Synthetic draft. Do not send.", { exact: true }),
    ).toBeVisible();
    const task = owner.locator("li").filter({
      has: owner.getByText("Review synthetic window inquiry", {
        exact: true,
      }),
    });
    await task
      .getByRole("button", { name: "Complete task", exact: true })
      .click();
    await expect(task.getByText("Completed", { exact: true })).toBeVisible();
    await owner.reload();
    await expect(task.getByText("Completed", { exact: true })).toBeVisible();
    await capture(owner, "crm-saved-desktop");
    await owner.setViewportSize({ width: 390, height: 844 });
    await capture(owner, "crm-saved-mobile");
    setPhase("authorization");
    const ownerClient = await clientFor(owner),
      memberClient = await clientFor(member),
      billingClient = await clientFor(billing),
      anonymous = createClient(endpoints.api, secrets.anon, {
        auth: { persistSession: false },
        global: { fetch: safeFetch },
      });
    const foreign = await ownerClient
      .from("vf_leads")
      .select("id")
      .eq("tenant_id", f.tenantB);
    expect(!foreign.error && foreign.data.length === 0).toBe(true);
    const billingLeads = await billingClient.from("vf_leads").select("id");
    expect(!!billingLeads.error || billingLeads.data.length === 0).toBe(true);
    const foreignClient = await clientFor(pages.foreign);
    for (const client of [billingClient, foreignClient, anonymous]) {
      const id = randomUUID();
      const denied = await client.rpc("vf_crm_mutate", {
        p_tenant: f.tenantA,
        p_lead: f.leadA,
        p_action: "note",
        p_input: {
          id,
          requestId: id,
          body: "Forbidden synthetic role attempt",
        },
      });
      expect(!!denied.error).toBe(true);
    }
    const ownPhotoPath = `${f.tenantA}/${f.leadA}/local/1.jpg`,
      foreignPhotoPath = `${f.tenantB}/${f.leadB}/local/1.jpg`;
    for (const client of [ownerClient, memberClient]) {
      const signed = await client.storage
        .from("vf-lead-photos")
        .createSignedUrl(ownPhotoPath, 10);
      expect(!signed.error && !!signed.data?.signedUrl).toBe(true);
      const url = new URL(signed.data!.signedUrl);
      expect(url.origin === endpoints.api).toBe(true);
      // Both reads retain the exact-origin and ownership fences.
      expect((await safeFetch(signed.data!.signedUrl)).ok).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 11000));
      expect((await safeFetch(signed.data!.signedUrl)).ok).toBe(false);
    }
    for (const client of [anonymous, billingClient])
      expect(
        !!(
          await client.storage
            .from("vf-lead-photos")
            .createSignedUrl(ownPhotoPath, 30)
        ).error,
      ).toBe(true);
    expect(
      !!(
        await ownerClient.storage
          .from("vf-lead-photos")
          .createSignedUrl(foreignPhotoPath, 30)
      ).error,
    ).toBe(true);
    setPhase("website");
    await owner.goto(`${endpoints.app}${base}/website`);
    await owner
      .getByLabel("Headline", { exact: true })
      .fill(`Synthetic persisted website ${f.run}`);
    await owner
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await expect(
      owner.getByText("Draft saved", { exact: false }).first(),
    ).toBeVisible();
    await owner.reload();
    await expect(owner.getByLabel("Headline", { exact: true })).toHaveValue(
      `Synthetic persisted website ${f.run}`,
    );
    await capture(owner, "website-draft-mobile");
    const events = await ownerClient
      .from("vf_site_events")
      .select("actor,action")
      .eq("tenant_id", f.tenantA);
    expect(
      !events.error && events.data.some((e) => e.actor === f.users.owner),
    ).toBe(true);
    const publication = await ownerClient
      .from("vf_site_publications")
      .select("tenant_id")
      .eq("tenant_id", f.tenantA);
    expect(!publication.error && publication.data.length === 0).toBe(true);
    for (const [role, page] of [
      ["member", member],
      ["billing", billing],
    ] as const) {
      await page.goto(`${endpoints.app}${base}/website`);
      await expect(
        page.getByRole("heading", {
          name: "Website owner access required",
          exact: true,
        }),
      ).toBeVisible();
      await capture(page, `${role}-website-denied`);
    }
    await owner.goto(`${endpoints.app}/${f.slugB}/admin/leads/${f.leadB}`);
    await expect(owner.getByRole("heading", { level: 1 })).toHaveText(
      /Workspace unavailable|CRM access required/,
    );
    await capture(owner, "foreign-tenant-denied");
    setPhase("growth");
    await verifyGrowthWorkspaces(owner, f, ownerClient);
    setPhase("revocation");
    // Only the fresh local member is revoked; real customers/provider/hosted targets are unreachable.
    const service = createClient(endpoints.api, secrets.service, {
      auth: { persistSession: false },
      global: { fetch: safeFetch },
    });
    const session = await memberClient.auth.getSession();
    expect(!session.error && !!session.data.session).toBe(true);
    const revoked = await service
      .from("vf_memberships")
      .delete()
      .eq("tenant_id", f.tenantA)
      .eq("user_id", f.users.member);
    expect(!revoked.error).toBe(true);
    await member.goto(endpoints.app + lead);
    await expect(member.getByRole("heading", { level: 1 })).toHaveText(
      /Workspace unavailable|CRM access required/,
    );
    await capture(member, "membership-revoked");
    expect(
      !(
        await service.auth.admin.signOut(
          session.data.session!.access_token,
          "global",
        )
      ).error,
    ).toBe(true);
    expect(!!(await memberClient.auth.refreshSession()).error).toBe(true);
    await pages.foreign
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await expect(
      pages.foreign.getByRole("heading", {
        name: "Welcome back.",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
}
