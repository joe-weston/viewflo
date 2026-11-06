// Image-owned API gateway and app supervisor. Candidate A requires an attested internal NAT network.
import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const appEnv = {
  PATH: "/usr/local/bin:/usr/bin:/bin",
  HOME: "/tmp",
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:65171",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.LOCAL_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.LOCAL_SERVICE_KEY,
  CRM_EMAIL_DELIVERY_ENABLED: "false",
  VIEWFLOW_APP_URL: "http://127.0.0.1:65170",
  LEAD_INTAKE_TENANTS: "local-intake-disabled",
};
if (
  !/^[a-f0-9]{64}$/.test(process.env.LOCAL_SOURCE_HASH || "") ||
  !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
    appEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  ) ||
  !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
    appEnv.SUPABASE_SERVICE_ROLE_KEY || "",
  ) ||
  appEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
    appEnv.SUPABASE_SERVICE_ROLE_KEY
)
  throw new Error("Local app configuration incomplete");
let customerBroker;
const testProfile = [
  process.env.LOCAL_E2E_MAIL_TOKEN,
  process.env.LOCAL_E2E_CONTROL_TOKEN,
  process.env.LOCAL_E2E_CHALLENGE,
];
if (testProfile.some(Boolean)) {
  const [mailToken, controlToken, challenge] = testProfile;
  const { customerAppEnv } = await import("./customer-profile.mjs");
  Object.assign(appEnv, customerAppEnv(mailToken, challenge));
  const { startCustomerBroker } = await import("./customer-broker.mjs");
  customerBroker = await startCustomerBroker(mailToken, controlToken);
}
const upstreams = {
  "/auth/v1/": { hostname: "auth", port: 9999 },
  "/rest/v1/": { hostname: "rest", port: 3000 },
  "/storage/v1/": { hostname: "storage", port: 5000 },
};
const gateway = http.createServer((request, response) => {
  const prefix = Object.keys(upstreams).find((p) => request.url?.startsWith(p));
  if (!prefix) {
    response.writeHead(404);
    response.end();
    return;
  }
  const origin = request.headers.origin;
  if (origin && origin !== "http://127.0.0.1:65170") {
    response.writeHead(403);
    response.end();
    return;
  }
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:65170");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-upsert",
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  const headers = { ...request.headers };
  delete headers.host;
  delete headers.connection;
  const proxy = http.request(
    {
      ...upstreams[prefix],
      path: "/" + request.url.slice(prefix.length),
      method: request.method,
      headers,
      timeout: 10000,
    },
    (upstream) => {
      response.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(response);
    },
  );
  proxy.on("timeout", () => proxy.destroy());
  proxy.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end("Local upstream unavailable");
  });
  request.pipe(proxy);
});
gateway.listen(65171, "0.0.0.0");
const mailTemplate =
  '<html><body><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Sign in to your local review workspace</a></body></html>';
const templates = http.createServer((request, response) => {
  if (request.url !== "/magic.html") {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(mailTemplate);
});
templates.listen(65173, "0.0.0.0");
const args = [
  "node_modules/next/dist/bin/next",
  "start",
  "--hostname",
  "0.0.0.0",
  "-p",
  "65170",
];
// The replacement environment deliberately never spreads process.env or reads host .env files.
const child = spawn(process.execPath, args, {
  cwd: "/app",
  env: appEnv,
  stdio: ["ignore", "ignore", "ignore"],
});
fs.writeFileSync(
  "/tmp/viewflo-app-binding.json",
  JSON.stringify({
    pid: child.pid,
    sourceHash: process.env.LOCAL_SOURCE_HASH,
    envHash: hash(JSON.stringify(appEnv)),
    buildId: fs.readFileSync("/app/.next/BUILD_ID", "utf8").trim(),
    args,
  }),
  { mode: 0o600, flag: "wx" },
);
const stop = () => {
  child.kill("SIGTERM");
  gateway.close();
  templates.close();
  customerBroker?.close();
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
child.once("exit", (code) => {
  gateway.close();
  templates.close();
  customerBroker?.close();
  process.exitCode = code ?? 1;
});
