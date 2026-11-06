import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { endpoints, localFetch } from "./boundary";
import type { Fixtures } from "./browser";

const seedRoles = [
  "owner",
  "member",
  "billing",
  "foreign",
  "staff",
  "operator",
] as const;
type SeedRole = (typeof seedRoles)[number];
type SeedInputs = {
  attest: () => Promise<void>;
  attestEmptyMigratedBaseline: () => Promise<void>;
  secrets: {
    service: string;
    users: Record<SeedRole, { email: string; password: string }>;
  };
  journal: {
    claim: (fixture: unknown) => Promise<void>;
    record: (fixture: unknown) => Promise<void>;
  };
};

/** The future controller supplies the exclusive private journal and exact-ID attestations. */
export async function seedGrowthCohort({
  attest,
  attestEmptyMigratedBaseline,
  secrets,
  journal,
}: SeedInputs) {
  await attest();
  await attestEmptyMigratedBaseline();
  const emails = seedRoles.map((role) => secrets.users[role].email);
  if (
    new Set(emails).size !== emails.length ||
    emails.some((email) => !/^[a-z0-9.+-]+@example\.invalid$/.test(email)) ||
    seedRoles.some((role) => secrets.users[role].password.length < 20)
  )
    throw new Error("Invalid synthetic cohort");
  const scopedFetch = localFetch(attest, endpoints.api);
  const service = createClient(endpoints.api, secrets.service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: scopedFetch },
  });
  const fixture = {
    run: "growth-mvp-20261106e",
    tenantA: randomUUID(),
    tenantB: randomUUID(),
    slugA: "pasadena-shades-and-shutters",
    slugB: "review-b-growth-mvp-20261106e",
    leadA: randomUUID(),
    leadB: randomUUID(),
    operatorLead: randomUUID(),
    analyticsSource: "synthetic-seeded-attribution",
    trackedLink: randomUUID(),
    recentVisit: randomUUID(),
    task: randomUUID(),
    operatorTask: randomUUID(),
    users: {} as Record<SeedRole, string>,
    status: "started",
  } as Omit<Fixtures, "status"> & {
    status: string;
    trackedLink: string;
    recentVisit: string;
    task: string;
    operatorTask: string;
  };
  await journal.claim(structuredClone(fixture));
  const save = () => journal.record(structuredClone(fixture));
  const check = (result: { error: unknown }) => {
    if (result.error)
      throw new Error("Local fixture mutation failed; reconcile recorded IDs");
  };
  try {
    for (const role of seedRoles) {
      // Identity provisioning only. Browser acceptance must request and consume a real SMTP magic link.
      const created = await service.auth.admin.createUser({
        ...secrets.users[role],
        email_confirm: true,
      });
      check(created);
      if (!created.data.user)
        throw new Error("Synthetic local identity missing");
      fixture.users[role] = created.data.user.id;
      await save();
    }
    check(
      await service.from("vf_tenants").insert([
        {
          id: fixture.tenantA,
          slug: fixture.slugA,
          name: "Synthetic review business A",
        },
        {
          id: fixture.tenantB,
          slug: fixture.slugB,
          name: "Synthetic review business B",
        },
      ]),
    );
    check(
      await service.from("vf_memberships").insert([
        ...(["owner", "member", "billing", "staff", "operator"] as const).map(
          (role) => ({
            tenant_id: fixture.tenantA,
            user_id: fixture.users[role as keyof typeof fixture.users],
            role:
              role === "staff"
                ? "member"
                : role === "operator"
                  ? "owner"
                  : role,
          }),
        ),
        {
          tenant_id: fixture.tenantB,
          user_id: fixture.users.foreign,
          role: "owner",
        },
      ]),
    );
    const leadRows = [
      [fixture.tenantA, fixture.leadA, "Synthetic CRM review inquiry"],
      [
        fixture.tenantA,
        fixture.operatorLead,
        "Synthetic operator review inquiry",
      ],
      [fixture.tenantB, fixture.leadB, "Synthetic second-tenant inquiry"],
    ].map(([tenant, id, name]) => ({
      id,
      tenant_id: tenant,
      kind: "manual",
      name,
      email: "review-recipient@example.invalid",
      phone: "555-555-0100",
      notes: "Synthetic local-only inquiry",
      details: {},
      source_path: "Isolated review fixture",
      consent_at: null,
      fingerprint: id.replaceAll("-", "").repeat(2),
    }));
    check(await service.from("vf_leads").insert(leadRows));
    check(
      await service.from("vf_growth_links").insert({
        id: fixture.trackedLink,
        tenant_id: fixture.tenantA,
        label: "Synthetic seeded attribution",
        destination: "/",
        channel: "referral",
        source: fixture.analyticsSource,
        created_by: fixture.users.owner,
      }),
    );
    check(
      await service.from("vf_growth_visits").insert({
        id: fixture.recentVisit,
        tenant_id: fixture.tenantA,
        link_id: fixture.trackedLink,
        channel: "referral",
        source: fixture.analyticsSource,
        campaign: "",
        landing_path: "/",
      }),
    );
    check(
      await service.from("vf_growth_attribution").insert({
        tenant_id: fixture.tenantA,
        lead_id: fixture.leadA,
        first_visit: fixture.recentVisit,
        conversion_visit: fixture.recentVisit,
      }),
    );
    check(
      await service.from("vf_crm_notes").insert({
        id: randomUUID(),
        tenant_id: fixture.tenantA,
        lead_id: fixture.leadA,
        body: "Synthetic staff note for local review",
        created_by: fixture.users.owner,
      }),
    );
    check(
      await service.from("vf_crm_tasks").insert([
        {
          id: fixture.task,
          tenant_id: fixture.tenantA,
          lead_id: fixture.leadA,
          title: "Review synthetic window inquiry",
          created_by: fixture.users.owner,
          assignee: fixture.users.owner,
          due_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: fixture.operatorTask,
          tenant_id: fixture.tenantA,
          lead_id: fixture.operatorLead,
          title: "Review untouched operator inquiry",
          created_by: fixture.users.owner,
          assignee: fixture.users.owner,
          due_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]),
    );
    check(
      await service.from("vf_crm_drafts").insert({
        id: randomUUID(),
        tenant_id: fixture.tenantA,
        lead_id: fixture.leadA,
        subject: "Synthetic unsent local draft",
        body: "Synthetic review content. Do not send.",
        created_by: fixture.users.owner,
      }),
    );
    const photo = await sharp({
      create: { width: 640, height: 480, channels: 3, background: "#dce8e0" },
    })
      .jpeg()
      .toBuffer();
    for (const [tenant, lead] of [
      [fixture.tenantA, fixture.leadA],
      [fixture.tenantA, fixture.operatorLead],
      [fixture.tenantB, fixture.leadB],
    ]) {
      const storagePath = `${tenant}/${lead}/local/1.jpg`;
      check(
        await service.storage
          .from("vf-lead-photos")
          .upload(storagePath, photo, {
            contentType: "image/jpeg",
            upsert: false,
          }),
      );
      check(
        await service.from("vf_lead_photos").insert({
          tenant_id: tenant,
          lead_id: lead,
          sequence: 1,
          storage_path: storagePath,
          size_bytes: photo.length,
        }),
      );
    }
    const config = {
      businessName: "Synthetic review business A",
      email: "",
      testimonials: [],
      gallery: [],
      headline: "Synthetic window-treatment website preview",
      about: "Synthetic local review; not a real business.",
      phone: "555-555-0100",
      services: [
        {
          id: "roller-shades",
          name: "Roller shades",
          description: "Synthetic service description",
        },
      ],
      serviceAreas: ["Synthetic review area"],
    };
    check(
      await service.from("vf_site_drafts").insert({
        tenant_id: fixture.tenantA,
        config,
        version: 1,
        updated_by: fixture.users.owner,
      }),
    );
    fixture.status = "seeded";
    await save();
    return { ...fixture, status: "seeded" } as const;
  } catch {
    fixture.status = "reconciliation_required";
    await save();
    throw new Error(
      "Local fixture preparation stopped; no automatic retry/reset",
    );
  }
}
