/** Separate local verification boundary. The hosted review policy is intentionally unchanged. */
export const LOCAL_REVIEW = {
  project: "viewflo-dw29-crm-local",
  owner: "01a180ce-4764-79e1-bada-31807f4c9afd",
  app: "http://127.0.0.1:64810",
  api: "http://127.0.0.1:64811",
  databasePort: "64812",
  mail: "http://127.0.0.1:64814",
} as const;
export const localRoles = [
  "db",
  "auth",
  "rest",
  "storage",
  "gateway",
  "mail",
] as const;
export const canonicalLocalMigrations = [
  "202609060001_photo_requests.sql",
  "202609060002_tenant_billing.sql",
  "202609060003_commercial_sow.sql",
  "202609060004_contingent_services.sql",
  "202609060005_draft_condition_gate.sql",
  "202609300001_lead_intake.sql",
  "202610280001_growth_crm.sql",
  "202610280002_nurturing_email.sql",
  "202610280003_tenant_websites.sql",
];
export const localBusinessTables = [
  "pasadena_photo_requests",
  "vf_tenants",
  "vf_memberships",
  "vf_documents",
  "vf_acceptances",
  "vf_billing",
  "vf_webhook_events",
  "vf_checkout_attempts",
  "vf_service_orders",
  "vf_service_approvers",
  "vf_service_eligibility_events",
  "vf_tenant_email_settings",
  "vf_leads",
  "vf_lead_photos",
  "vf_lead_email_outbox",
  "vf_crm_notes",
  "vf_crm_tasks",
  "vf_crm_drafts",
  "vf_crm_activity",
  "vf_crm_requests",
  "vf_crm_email_outbox",
  "vf_site_drafts",
  "vf_site_versions",
  "vf_site_publications",
  "vf_site_events",
].sort();
export const localAuthTables = [
  "auth.users",
  "auth.identities",
  "auth.sessions",
  "auth.refresh_tokens",
  "storage.objects",
];
export type LocalRole = (typeof localRoles)[number];
type Labels = Record<string, string>;
export type LocalContainer = {
  id: string;
  imageId: string;
  labels: Labels;
  networks: string[];
  ports: { container: string; hostIp: string; hostPort: string }[];
  mounts: {
    type: string;
    name: string;
    source: string;
    destination?: string;
  }[];
  safeRuntime: boolean;
};
export type LocalIdentity = {
  mode: "local-isolated";
  project: string;
  owner: string;
  run: string;
  context: string;
  endpoint: string;
  daemonId: string;
  app: string;
  api: string;
  mail: string;
  configSha256: string;
  sourceSha256: string;
  migrations: { name: string; sha256: string }[];
  network: { id: string; subnet: string };
  volumes: { name: string; createdAt: string }[];
  containers: Record<LocalRole, { id: string; imageId: string }>;
};
export type LocalObservation = {
  context: string;
  endpoint: string;
  daemonId: string;
  network: {
    id: string;
    subnet: string;
    internal: boolean;
    gatewayMode: string;
    labels: Labels;
    containers: string[];
  };
  volumes: {
    name: string;
    createdAt: string;
    driver: string;
    labels: Labels;
    options: Record<string, unknown> | null;
  }[];
  containers: LocalContainer[];
  volumeConsumers: Record<string, string[]>;
};
function insist(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Local review refused: ${message}`);
}
function labelsMatch(labels: Labels) {
  return (
    labels["com.docker.compose.project"] === LOCAL_REVIEW.project &&
    labels["viewflo.verification.owner"] === LOCAL_REVIEW.owner
  );
}
export function localIdentity(value: unknown): LocalIdentity {
  const i = value as LocalIdentity;
  insist(
    i &&
      i.mode === "local-isolated" &&
      i.project === LOCAL_REVIEW.project &&
      i.owner === LOCAL_REVIEW.owner,
    "explicit local ownership required",
  );
  insist(/^[a-z0-9]{8,24}$/.test(i.run), "invalid local event identity");
  insist(
    i.app === LOCAL_REVIEW.app &&
      i.api === LOCAL_REVIEW.api &&
      i.mail === LOCAL_REVIEW.mail,
    "exact loopback origins required",
  );
  insist(
    i.endpoint === "npipe:////./pipe/dockerDesktopLinuxEngine" ||
      i.endpoint === "unix:///var/run/docker.sock",
    "local Docker endpoint required",
  );
  insist(
    typeof i.context === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(i.context) &&
      typeof i.daemonId === "string" &&
      i.daemonId.length > 8,
    "Docker identity required",
  );
  const sha = /^[a-f0-9]{64}$/i;
  insist(
    sha.test(i.configSha256) && sha.test(i.sourceSha256),
    "pinned source/configuration required",
  );
  insist(
    Array.isArray(i.migrations) &&
      JSON.stringify(i.migrations.map((m) => m.name)) ===
        JSON.stringify(canonicalLocalMigrations) &&
      i.migrations.every((m) => sha.test(m.sha256)),
    "nine pinned canonical migrations in order required",
  );
  insist(
    i.network &&
      sha.test(i.network.id) &&
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.0\/24$/.test(i.network.subnet),
    "exact reserved local network required",
  );
  insist(Number(i.network.subnet.split(".")[2]) <= 255, "invalid local subnet");
  insist(
    Array.isArray(i.volumes) &&
      i.volumes.length >= 1 &&
      new Set(i.volumes.map((v) => v.name)).size === i.volumes.length &&
      i.volumes.every(
        (v) =>
          v.name.startsWith(`${LOCAL_REVIEW.project}_`) &&
          /^[a-z0-9_-]+$/.test(v.name) &&
          !Number.isNaN(Date.parse(v.createdAt)),
      ),
    "fresh exact named volumes required",
  );
  insist(
    i.containers &&
      Object.keys(i.containers).length === localRoles.length &&
      localRoles.every(
        (r) =>
          i.containers[r] &&
          sha.test(i.containers[r].id) &&
          /^sha256:[a-f0-9]{64}$/i.test(i.containers[r].imageId),
      ),
    "exact pinned container/image identities required",
  );
  insist(
    new Set(localRoles.map((r) => i.containers[r].id)).size ===
      localRoles.length,
    "distinct containers required",
  );
  return i;
}
export function verifyLocalResources(
  identity: unknown,
  observed: LocalObservation,
) {
  const i = localIdentity(identity);
  insist(
    observed.context === i.context &&
      observed.endpoint === i.endpoint &&
      observed.daemonId === i.daemonId,
    "Docker context/daemon drift",
  );
  insist(
    observed.network.id === i.network.id &&
      observed.network.subnet === i.network.subnet &&
      observed.network.internal &&
      observed.network.gatewayMode === "isolated" &&
      labelsMatch(observed.network.labels),
    "network isolation/ownership drift",
  );
  const ids = localRoles.map((r) => i.containers[r].id).sort();
  insist(
    JSON.stringify([...observed.network.containers].sort()) ===
      JSON.stringify(ids),
    "unknown network consumer",
  );
  insist(observed.containers.length === ids.length, "container set drift");
  for (const role of localRoles) {
    const expected = i.containers[role];
    const actual = observed.containers.find((c) => c.id === expected.id);
    insist(
      actual &&
        actual.safeRuntime === true &&
        actual.imageId === expected.imageId &&
        labelsMatch(actual.labels) &&
        actual.labels["com.docker.compose.service"] === role,
      "container provenance/runtime drift",
    );
    insist(
      actual.networks.length === 1 && actual.networks[0] === i.network.id,
      "extra container network",
    );
    const expectedPorts =
      role === "gateway"
        ? [
            { container: "64810/tcp", hostIp: "127.0.0.1", hostPort: "64810" },
            { container: "64811/tcp", hostIp: "127.0.0.1", hostPort: "64811" },
          ]
        : role === "db"
          ? [
              {
                container: "5432/tcp",
                hostIp: "127.0.0.1",
                hostPort: LOCAL_REVIEW.databasePort,
              },
            ]
          : role === "mail"
            ? [
                {
                  container: "8025/tcp",
                  hostIp: "127.0.0.1",
                  hostPort: "64814",
                },
              ]
            : [];
    insist(
      JSON.stringify(
        [...actual.ports].sort((a, b) =>
          a.container.localeCompare(b.container),
        ),
      ) === JSON.stringify(expectedPorts),
      "unexpected/non-loopback port binding",
    );
    insist(
      actual.mounts.every(
        (m) =>
          (m.type === "volume" && i.volumes.some((v) => v.name === m.name)) ||
          (role === "gateway" &&
            m.type === "tmpfs" &&
            ["/tmp", "/app/.next/cache"].includes(m.destination ?? "")),
      ),
      "bind/shared/unknown mount",
    );
  }
  insist(observed.volumes.length === i.volumes.length, "volume set drift");
  for (const expected of i.volumes) {
    const actual = observed.volumes.find((v) => v.name === expected.name);
    insist(
      actual &&
        actual.createdAt === expected.createdAt &&
        actual.driver === "local" &&
        labelsMatch(actual.labels) &&
        (!actual.options || Object.keys(actual.options).length === 0),
      "volume provenance/options drift",
    );
    insist(
      observed.containers.some((c) =>
        c.mounts.some((m) => m.name === expected.name),
      ),
      "unattached volume",
    );
    const consumers = observed.volumeConsumers[expected.name];
    const ownedConsumers = observed.containers
      .filter((c) => c.mounts.some((m) => m.name === expected.name))
      .map((c) => c.id)
      .sort();
    insist(
      Array.isArray(consumers) &&
        JSON.stringify([...consumers].sort()) ===
          JSON.stringify(ownedConsumers),
      "shared/unknown volume consumer",
    );
  }
  return i;
}
export function verifyEmptyLocalBaseline(
  counts: Record<string, number>,
  discoveredPublicTables: string[],
  phase: "before-migrations" | "before-seeding",
) {
  const publicTables = phase === "before-migrations" ? [] : localBusinessTables;
  insist(
    JSON.stringify([...discoveredPublicTables].sort()) ===
      JSON.stringify(publicTables),
    "unknown/missing business tables",
  );
  const expectedTables = [
    ...localAuthTables,
    ...publicTables.map((t) => `public.${t}`),
  ];
  insist(
    Object.keys(counts).sort().join() === [...expectedTables].sort().join(),
    "baseline inventory incomplete",
  );
  insist(
    Object.values(counts).every(
      (count) => Number.isSafeInteger(count) && count === 0,
    ),
    "nonempty/unknown business or Auth baseline",
  );
}

export function localCallback(link: string, tenant: string) {
  const url = new URL(link);
  insist(
    url.origin === LOCAL_REVIEW.app &&
      url.pathname.replace(/\/$/, "") === "/auth/callback" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.searchParams.get("tenant") === tenant &&
      url.searchParams.get("type") === "email" &&
      !!url.searchParams.get("token_hash"),
    "captured local callback mismatch",
  );
  insist(
    [...url.searchParams.keys()].sort().join() === "tenant,token_hash,type",
    "unexpected callback parameters",
  );
  return url;
}

export function localBaselineCount(output: string) {
  const value = output.trim();
  insist(/^(0|[1-9]\d*)$/.test(value), "blank/malformed baseline count");
  const count = Number(value);
  insist(Number.isSafeInteger(count), "baseline count exceeds supported range");
  return count;
}
export function localSubnetsOverlap(left: string, right: string) {
  const interval = (cidr: string) => {
    const [ip, bits, ...extra] = cidr.split("/"),
      octets = ip.split(".").map(Number),
      prefix = Number(bits);
    insist(
      !extra.length &&
        bits !== undefined &&
        /^\d+$/.test(bits) &&
        Number.isInteger(prefix) &&
        prefix >= 0 &&
        prefix <= 32 &&
        octets.length === 4 &&
        ip.split(".").every((part) => /^\d{1,3}$/.test(part)) &&
        octets.every((n) => n >= 0 && n <= 255),
      "invalid Docker IPv4 CIDR",
    );
    const address = octets.reduce((value, n) => value * 256 + n, 0),
      size = 2 ** (32 - prefix),
      start = Math.floor(address / size) * size;
    return [start, start + size - 1];
  };
  const a = interval(left),
    b = interval(right);
  return a[0] <= b[1] && b[0] <= a[1];
}
