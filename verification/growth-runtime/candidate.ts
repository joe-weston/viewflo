import {
  localCompose,
  type ImageLock,
  type LocalSecrets,
} from "../../lib/local-review-config";
import { canonicalLocalMigrations } from "../../lib/local-review-policy";
import { endpoints } from "./boundary";

const args = process.argv.slice(2);
const eventArgs = args.filter((arg) => arg.startsWith("--event="));
const eventMatch = /^--event=(growth-crm-[0-9]{8}-([0-9]{2}))$/.exec(
  eventArgs[0] ?? "",
);
if (
  eventArgs.length &&
  (eventArgs.length !== 1 || !eventMatch || eventMatch[2] === "00")
)
  throw Error("Use one explicit growth-crm-YYYYMMDD-NN event");
const event = eventMatch?.[1];
const rehearsal = args.includes("--fixture-mail");
if (rehearsal && !event) throw Error("Fixture mail requires an explicit event");
const prefix = eventMatch ? "10.253." + Number(eventMatch[2]) : "10.252.238";
export const candidate = {
  eventArg: eventArgs[0],
  rehearsal,
  run: event ?? "growth-mvp-20261106e",
  project: event ? "viewflo-" + event : "viewflo-growth-mvp-customer-20261106e",
  subnet: prefix + ".0/24",
  gateway: prefix + ".1",
  attempt: 1,
  templatePort: 65173,
  migrations: [
    ...canonicalLocalMigrations,
    "202611040001_growth_workspace.sql",
  ],
} as const;

/** Pure renderer. Output contains local credentials and belongs only in the private execution area. */
export function candidateConfig(
  images: ImageLock,
  imageId: string,
  sourceHash: string,
  owner: string,
  secrets: LocalSecrets,
) {
  if (!/^[a-z0-9-]{16,80}$/.test(owner))
    throw new Error("Exact owner ID required");
  for (const image of Object.values(images)) {
    if (
      !/^sha256:[a-f0-9]{64}$/.test(image.id) ||
      !/^sha256:[a-f0-9]{64}$/.test(image.digest)
    )
      throw new Error("Immutable image binding required");
  }
  const prior = localCompose(
    images,
    imageId,
    sourceHash,
    secrets,
    candidate.subnet,
  );
  const labels = {
    "viewflo.verification.owner": owner,
    "viewflo.verification.event": candidate.run,
  };
  const resources = {
    db: { mem_limit: "2g", cpus: 1.5 },
    gateway: { mem_limit: "1536m", cpus: 1.5 },
    auth: { mem_limit: "512m", cpus: 0.5 },
    rest: { mem_limit: "512m", cpus: 0.5 },
    storage: { mem_limit: "1024m", cpus: 0.75 },
    mail: { mem_limit: "256m", cpus: 0.25 },
  };
  const service = <Role extends keyof typeof prior.services>(role: Role) => ({
    ...prior.services[role],
    ...resources[role],
    labels,
    networks: ["private"],
    pull_policy: "never",
    stop_grace_period: "30s",
  });
  const services = {
    db: service("db"),
    auth: service("auth"),
    rest: service("rest"),
    storage: service("storage"),
    gateway: service("gateway"),
    mail: service("mail"),
  };
  services.db.ports = [];
  services.gateway.ports = [];
  services.mail.ports = [];
  Object.assign(services.auth.environment, {
    API_EXTERNAL_URL: endpoints.api,
    GOTRUE_SITE_URL: endpoints.app,
    GOTRUE_URI_ALLOW_LIST: `${endpoints.app}/**`,
    GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: `http://gateway:${candidate.templatePort}/magic.html`,
  });
  Object.assign(services.storage.environment, {
    STORAGE_PUBLIC_URL: endpoints.api,
    TENANT_ID: candidate.project,
  });
  return {
    name: candidate.project,
    services,
    networks: {
      private: {
        name: `${candidate.project}_private`,
        driver: "bridge",
        internal: true,
        enable_ipv6: false,
        labels,
        driver_opts: {
          "com.docker.network.bridge.gateway_mode_ipv4": "isolated",
          "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1",
        },
        ipam: {
          config: [{ subnet: candidate.subnet, gateway: candidate.gateway }],
        },
      },
    },
    volumes: Object.fromEntries(
      ["database", "dbconfig", "storage"].map((name) => [
        name,
        { name: `${candidate.project}_${name}`, labels },
      ]),
    ),
  };
}
