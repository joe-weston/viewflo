import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "playwright";
import {
  boundedChild,
  captureAdmin,
  capturedCallback,
  cleanBrowserEnv,
  endpoints,
  localUrl,
} from "./boundary";
import { candidate, candidateConfig } from "./candidate";
import { expiredStopTargets, type RuntimeLease } from "./lease";
import { linuxKernelRoutes } from "./runtime-contract";
import type { ImageLock } from "../../lib/local-review-config";

test("Docker VM route attestation decodes the kernel table and refuses ambiguous masks", () => {
  const header =
    "Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT\n";
  assert.deepEqual(
    linuxKernelRoutes(
      header +
        "eth0 00000000 0180A8C0 0003 0 0 0 00000000 0 0 0\neth0 0080A8C0 00000000 0001 0 0 0 00F0FFFF 0 0 0",
    ),
    ["0.0.0.0/0", "192.168.128.0/20"],
  );
  assert.throws(() =>
    linuxKernelRoutes(
      header + "eth0 0080A8C0 00000000 0001 0 0 0 00FF00FF 0 0 0",
    ),
  );
});

test("expiry plans a data-preserving exact-ID stop in gateway-to-database order", () => {
  const gateway = { id: "a".repeat(64), imageId: `sha256:${"b".repeat(64)}` };
  const db = { id: "c".repeat(64), imageId: `sha256:${"d".repeat(64)}` };
  const lease: RuntimeLease = {
    project: candidate.project,
    event: candidate.run,
    owner: "synthetic-owner",
    daemonId: "synthetic-daemon",
    issuedAtMs: 10_000,
    expiresAtMs: 20_000,
    containers: { db, gateway },
  };
  const observations = {
    daemonId: lease.daemonId,
    containers: (["db", "gateway"] as const).map((role) => ({
      ...(role === "db" ? db : gateway),
      name: `${lease.project}-${role}-1`,
      project: lease.project,
      event: lease.event,
      owner: lease.owner,
      running: true,
    })),
  };
  assert.deepEqual(expiredStopTargets(lease, observations, 15_000, false), []);
  assert.deepEqual(expiredStopTargets(lease, observations, 15_000, true), [
    gateway.id,
    db.id,
  ]);
  assert.deepEqual(expiredStopTargets(lease, observations, 20_000, false), [
    gateway.id,
    db.id,
  ]);
  assert.throws(() =>
    expiredStopTargets(
      lease,
      { ...observations, daemonId: "other" },
      20_000,
      false,
    ),
  );
  observations.containers[0].owner = "other";
  assert.throws(() => expiredStopTargets(lease, observations, 20_000, false));
});

test("origin fence requires the raw numeric endpoint, and excludes Mailpit from browser origins", () => {
  const origins = [endpoints.app, endpoints.api];
  assert.equal(localUrl(endpoints.app + "/auth", origins).pathname, "/auth");
  for (const url of [
    "http://localhost:65170",
    "http://127.1:65170",
    "http://127.0.0.1:065170",
    "http://user@127.0.0.1:65170",
    "http://127.0.0.1:65170/#x",
    endpoints.mail,
    "https://127.0.0.1:65170",
  ])
    assert.throws(() => localUrl(url, origins));
});

test("Auth receipt accepts only one local tenant-bound callback with the exact parameters", () => {
  const link =
    endpoints.app +
    "/auth/callback/?tenant=synthetic&token_hash=fake-sentinel&type=email";
  assert.equal(
    capturedCallback(link.replaceAll("&", "&amp;"), "synthetic").href,
    link,
  );
  assert.throws(() => capturedCallback(link, "foreign"));
  assert.throws(() =>
    capturedCallback(link + "&next=https://example.invalid", "synthetic"),
  );
  assert.throws(() =>
    capturedCallback(
      link + " " + link.replace("fake-sentinel", "another"),
      "synthetic",
    ),
  );
});

test("capture rejects callback, query-bearing and unknown routes before touching the page", async () => {
  for (const path of [
    "/auth/callback/?token_hash=fake-sentinel",
    "/synthetic/admin?lead=one",
    "/synthetic/admin/unknown",
  ])
    await assert.rejects(
      captureAdmin({ url: () => endpoints.app + path } as Page, "synthetic"),
    );
});

test("browser launch inherits only the platform environment allowlist", () => {
  assert.deepEqual(
    cleanBrowserEnv({
      PATH: "fixture-path",
      PWDEBUG: "1",
      SUPABASE_SERVICE_ROLE_KEY: "fake-sentinel",
      PLAYWRIGHT_TEST_PASS: "fake-sentinel",
    }),
    { PATH: "fixture-path" },
  );
});

test("process output returns status only and counts the shared cap across children", async () => {
  const budget = { remaining: 70 };
  const args = ["-e", "process.stdout.write('x'.repeat(45))"];
  const env = { ...cleanBrowserEnv(), NODE_ENV: "test" } as const;
  assert.equal(
    await boundedChild(process.execPath, args, env, budget, 10_000),
    "pass",
  );
  assert.equal(budget.remaining, 25);
  assert.equal(
    await boundedChild(process.execPath, args, env, budget, 10_000),
    "output-limit",
  );
  assert.equal(
    await boundedChild(
      process.execPath,
      ["-e", "process.stderr.write('x'.repeat(270000))"],
      env,
      { remaining: 1_000_000 },
      10_000,
    ),
    "output-limit",
  );
});

test("candidate renderer keeps services unpublished on one isolated backend network", () => {
  const digest = `sha256:${"0".repeat(64)}`;
  const images = Object.fromEntries(
    ["node", "db", "auth", "rest", "storage", "mail"].map((role) => [
      role,
      { id: digest, digest, reference: `fixture/${role}:tag` },
    ]),
  ) as ImageLock;
  const credentials = {
    password: "a".repeat(64),
    jwt: "b".repeat(64),
    anon: "anon-sentinel",
    service: "service-sentinel",
    users: Object.fromEntries(
      ["owner", "member", "billing", "foreign"].map((role) => [
        role,
        { email: `${role}@example.invalid`, password: "fake-sentinel" },
      ]),
    ) as Parameters<typeof candidateConfig>[4]["users"],
  };
  const config = candidateConfig(
    images,
    digest,
    "c".repeat(64),
    "synthetic-owner-identity",
    credentials,
  );
  assert.equal(config.name, candidate.project);
  assert.equal(candidate.migrations.length, 10);
  assert.deepEqual(
    Object.values(config.services).flatMap((service) =>
      "ports" in service ? service.ports : [],
    ),
    [],
  );
  for (const service of Object.values(config.services)) {
    assert.equal(service.pull_policy, "never");
    assert.deepEqual(service.networks, ["private"]);
  }
  assert.equal(config.networks.private.internal, true);
  assert.equal(
    config.networks.private.driver_opts[
      "com.docker.network.bridge.gateway_mode_ipv4"
    ],
    "isolated",
  );
  assert.equal(
    config.services.auth.environment.GOTRUE_MAILER_TEMPLATES_MAGIC_LINK,
    "http://gateway:65173/magic.html",
  );
  assert.equal(
    config.services.storage.environment.STORAGE_PUBLIC_URL,
    endpoints.api,
  );
});
