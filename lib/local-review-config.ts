import { LOCAL_REVIEW, type LocalRole } from "./local-review-policy";
export type LocalSecrets = {
  password: string;
  jwt: string;
  anon: string;
  service: string;
  users: Record<
    "owner" | "member" | "billing" | "foreign",
    { email: string; password: string }
  >;
};
export type ImageLock = Record<
  "node" | "db" | "auth" | "rest" | "storage" | "mail",
  { reference: string; digest: string; id: string }
>;
export function localCompose(
  images: ImageLock,
  appImage: string,
  sourceHash: string,
  secrets: LocalSecrets,
  subnet: string,
) {
  if (
    !/^sha256:[a-f0-9]{64}$/.test(appImage) ||
    !/^[a-f0-9]{64}$/.test(sourceHash) ||
    !/^[a-f0-9]{64}$/.test(secrets.password) ||
    !/^[a-f0-9]{64}$/.test(secrets.jwt)
  )
    throw new Error("Pinned images/source and private local secrets required");
  const labels = { "viewflo.verification.owner": LOCAL_REVIEW.owner };
  const base = (role: LocalRole) => ({
    image:
      role === "gateway"
        ? appImage
        : images[role].reference.split(":")[0] + "@" + images[role].digest,
    restart: "no",
    labels,
    networks: ["isolated"],
    security_opt: ["no-new-privileges:true"],
    logging: { driver: "none" },
    stop_grace_period: "10s",
  });
  const pg = `postgres://supabase_auth_admin:${secrets.password}@db:5432/postgres`;
  return {
    name: LOCAL_REVIEW.project,
    services: {
      db: {
        ...base("db"),
        environment: {
          POSTGRES_PASSWORD: secrets.password,
          PGPASSWORD: secrets.password,
          POSTGRES_DB: "postgres",
          JWT_EXP: "3600",
        },
        volumes: [
          "database:/var/lib/postgresql/data",
          "dbconfig:/etc/postgresql-custom",
        ],
        ports: ["127.0.0.1:64812:5432"],
      },
      gateway: {
        ...base("gateway"),
        image: appImage,
        user: "1000:1000",
        cap_drop: ["ALL"],
        read_only: true,
        tmpfs: [
          "/tmp:rw,noexec,nosuid,size=16m,uid=1000,gid=1000",
          "/app/.next/cache:rw,noexec,nosuid,size=16m,uid=1000,gid=1000",
        ],
        environment: {
          LOCAL_SOURCE_HASH: sourceHash,
          LOCAL_ANON_KEY: secrets.anon,
          LOCAL_SERVICE_KEY: secrets.service,
        },
        ports: ["127.0.0.1:64810:64810", "127.0.0.1:64811:64811"],
      },
      auth: {
        ...base("auth"),
        environment: {
          GOTRUE_API_HOST: "0.0.0.0",
          GOTRUE_API_PORT: "9999",
          API_EXTERNAL_URL: LOCAL_REVIEW.api,
          GOTRUE_DB_DRIVER: "postgres",
          GOTRUE_DB_DATABASE_URL: pg,
          GOTRUE_SITE_URL: LOCAL_REVIEW.app,
          GOTRUE_URI_ALLOW_LIST: LOCAL_REVIEW.app + "/**",
          GOTRUE_DISABLE_SIGNUP: "true",
          GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
          GOTRUE_EXTERNAL_PHONE_ENABLED: "false",
          GOTRUE_JWT_SECRET: secrets.jwt,
          GOTRUE_JWT_AUD: "authenticated",
          GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
          GOTRUE_JWT_ADMIN_ROLES: "service_role",
          GOTRUE_JWT_EXP: "3600",
          GOTRUE_MAILER_AUTOCONFIRM: "false",
          GOTRUE_SMTP_HOST: "mail",
          GOTRUE_SMTP_PORT: "1025",
          GOTRUE_SMTP_ADMIN_EMAIL: "local-review@example.invalid",
          GOTRUE_SMTP_SENDER_NAME: "Viewflo local verification",
          GOTRUE_SMTP_MAX_FREQUENCY: "1s",
          GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: "http://gateway:64813/magic.html",
        },
      },
      rest: {
        ...base("rest"),
        environment: {
          PGRST_DB_URI: `postgres://authenticator:${secrets.password}@db:5432/postgres`,
          PGRST_DB_SCHEMAS: "public",
          PGRST_DB_ANON_ROLE: "anon",
          PGRST_JWT_SECRET: secrets.jwt,
          PGRST_DB_EXTRA_SEARCH_PATH: "public,extensions",
        },
      },
      storage: {
        ...base("storage"),
        environment: {
          ANON_KEY: secrets.anon,
          SERVICE_KEY: secrets.service,
          POSTGREST_URL: "http://rest:3000",
          AUTH_JWT_SECRET: secrets.jwt,
          DATABASE_URL: `postgres://supabase_storage_admin:${secrets.password}@db:5432/postgres`,
          STORAGE_PUBLIC_URL: LOCAL_REVIEW.api,
          STORAGE_BACKEND: "file",
          FILE_STORAGE_BACKEND_PATH: "/var/lib/storage",
          FILE_SIZE_LIMIT: "4194304",
          TENANT_ID: LOCAL_REVIEW.project,
          REGION: "local",
          GLOBAL_S3_BUCKET: "local",
          ENABLE_IMAGE_TRANSFORMATION: "false",
        },
        volumes: ["storage:/var/lib/storage"],
      },
      mail: {
        ...base("mail"),
        environment: {
          MP_SMTP_BIND_ADDR: "0.0.0.0:1025",
          MP_UI_BIND_ADDR: "0.0.0.0:8025",
          MP_SMTP_AUTH_ACCEPT_ANY: "true",
          MP_SMTP_AUTH_ALLOW_INSECURE: "true",
          MP_MAX_MESSAGES: "100",
          MP_ALLOWED_HOSTS: "127.0.0.1,mail",
        },
        ports: ["127.0.0.1:64814:8025"],
      },
    },
    networks: {
      isolated: {
        name: LOCAL_REVIEW.project + "_isolated",
        internal: true,
        enable_ipv6: false,
        labels,
        driver_opts: {
          "com.docker.network.bridge.gateway_mode_ipv4": "isolated",
          "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1",
        },
        ipam: { config: [{ subnet }] },
      },
    },
    volumes: Object.fromEntries(
      ["database", "dbconfig", "storage"].map((name) => [
        name,
        { name: `${LOCAL_REVIEW.project}_${name}`, labels },
      ]),
    ),
  };
}
