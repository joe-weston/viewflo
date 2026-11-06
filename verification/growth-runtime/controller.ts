import fs from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  localAuthTables,
  localRoles,
  type LocalRole,
} from "../../lib/local-review-policy";
import { candidate, candidateConfig } from "./candidate";
import { cleanBrowserEnv, endpoints } from "./boundary";
import { openLoopbackRelay, relayPorts } from "./relay";
import { createRestRouteProbe } from "./route-probe";
import { runGrowthBrowser } from "./browser";
import { customerContract } from "./customer-image";
import {
  openCustomerMail,
  rehearsalCustomerMail,
  startCustomerDelivery,
  type CustomerDelivery,
} from "./customer-mail";
import { customerAppEnv } from "./customer-profile.mjs";
import { seedGrowthCohort } from "./seed";
import {
  attestDaemon,
  command,
  reviewedDaemonId,
  docker,
  inspectContainers,
  stopOwned,
} from "./docker";
import { leasePath, privateRunFolder, readBoundLease } from "./guard";
import type { RuntimeLease } from "./lease";
import {
  assertFiles,
  freshSecrets,
  hash,
  linuxKernelRoutes,
  preflight,
  readContract,
} from "./runtime-contract";

const save = (name: string, data: unknown) =>
  fs.writeFileSync(leasePath(name), JSON.stringify(data, null, 2) + "\n", {
    flag: "wx",
  });
const now = () => new Date();
const tcp = (port: number) =>
  new Promise<boolean>((resolve) => {
    const connection = net.connect({ host: "127.0.0.1", port, timeout: 750 });
    const finish = (ok: boolean) => {
      connection.destroy();
      resolve(ok);
    };
    connection.once("connect", () => finish(true));
    connection.once("timeout", () => finish(false));
    connection.once("error", () => finish(false));
  });

function privateFolder() {
  fs.mkdirSync(privateRunFolder);
  const sid = command("whoami.exe", ["/user", "/fo", "csv", "/nh"]).match(
    /S-1-(?:\d+-)*\d+/,
  )?.[0];
  if (!sid) throw new Error("Current Windows SID missing");
  command("icacls.exe", [
    privateRunFolder,
    "/inheritance:r",
    "/grant:r",
    `*${sid}:(OI)(CI)F`,
  ]);
  const acl = command("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `$a = Get-Acl -LiteralPath '${privateRunFolder.replaceAll("'", "''")}'; ` +
      `$r = $a.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]); ` +
      `if ($a.AreAccessRulesProtected -and $r.Count -eq 1 -and $r[0].IdentityReference.Value -eq '${sid}' -and $r[0].AccessControlType -eq 'Allow' -and $r[0].FileSystemRights -eq 'FullControl') { 'verified' } else { exit 8 }`,
  ]);
  if (acl !== "verified")
    throw new Error("Private receipt directory ACL failed");
}

async function waitFor(
  check: () => boolean | Promise<boolean>,
  heartbeat: () => void,
  duration = 40_000,
) {
  const until = Date.now() + duration;
  do {
    heartbeat();
    if (await check()) return;
    await delay(500);
  } while (Date.now() < until);
  throw new Error("Local readiness timed out");
}

function postgres(id: string, sql: string, transaction = false) {
  return docker(
    [
      "exec",
      "-i",
      id,
      "psql",
      "-X",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-Aqt",
      "-v",
      "ON_ERROR_STOP=1",
      ...(transaction ? ["--single-transaction"] : []),
      "-f",
      "-",
    ],
    sql,
    60_000,
  );
}

function baseline(id: string, migrated: boolean) {
  const tables = JSON.parse(
    postgres(
      id,
      "select coalesce(json_agg(tablename order by tablename),'[]'::json) from pg_tables where schemaname='public';",
    ),
  ) as string[];
  if (
    tables.some((t) => !/^vf_[a-z_]+$|^pasadena_photo_requests$/.test(t)) ||
    (migrated
      ? ![
          "vf_growth_attribution",
          "vf_growth_quotes",
          "vf_growth_reviews",
          "vf_tenants",
          "vf_leads",
        ].every((t) => tables.includes(t))
      : tables.length !== 0)
  )
    throw new Error("Unexpected schema baseline");
  const targets = [...localAuthTables, ...tables.map((t) => `public.${t}`)];
  const counts = postgres(
    id,
    targets.map((t) => `select count(*) from ${t};`).join("\n"),
  ).split(/\r?\n/);
  if (counts.length !== targets.length || counts.some((count) => count !== "0"))
    throw new Error("Database baseline was not empty");
  return targets.length;
}

const expectedMounts: Partial<Record<LocalRole, Record<string, string>>> = {
  db: {
    "/var/lib/postgresql/data": "database",
    "/etc/postgresql-custom": "dbconfig",
  },
  storage: { "/var/lib/storage": "storage" },
};

async function main() {
  const args = process.argv
    .slice(2)
    .filter((arg) => arg !== candidate.eventArg && arg !== "--fixture-mail");
  let phase = "source-binding";
  let lease: RuntimeLease | undefined;
  let ownsFolder = false;
  let testStatus: Awaited<ReturnType<typeof runGrowthBrowser>> | undefined;
  let result = "fail";
  let shutdown = "not-started";
  let closeRelay: (() => Promise<void>) | undefined;
  let customerDelivery: CustomerDelivery | undefined;
  try {
    const customerMode = ["--review-customer", "--customer-e2e"].includes(
      args[0],
    );
    if (customerMode !== Boolean(candidate.eventArg))
      throw Error("Customer verification requires an explicit isolated event");
    const daemonId = reviewedDaemonId();
    const baseContract = readContract();
    const contract = customerMode
      ? customerContract(baseContract)
      : baseContract;
    const ports = customerMode ? [...relayPorts, 65176] : relayPorts;
    const harnessHash = hash(JSON.stringify(contract));
    const bundleHash = customerMode
      ? hash(
          JSON.stringify({
            harnessHash,
            event: candidate.run,
            project: candidate.project,
            rehearsal: candidate.rehearsal,
          }),
        )
      : harnessHash;
    if (
      args.length === 1 &&
      ["--review", "--review-customer"].includes(args[0])
    ) {
      phase = "preflight";
      preflight(contract);
      if ((await Promise.all(ports.map(tcp))).some(Boolean))
        throw new Error("Candidate TCP port occupied");
      console.log(
        JSON.stringify({
          phase,
          result: "pass",
          bundleHash,
          daemonId,
          project: candidate.project,
          imageId: contract.imageId,
          buildId: contract.buildId,
        }),
      );
      return;
    }
    const expiry = Date.parse(args[3] ?? "");
    if (
      args.length !== 4 ||
      !["--phase-a", "--customer-e2e"].includes(args[0]) ||
      args[1] !== bundleHash ||
      args[2] !== "--isolated-loopback-relay" ||
      !Number.isFinite(expiry) ||
      expiry <= Date.now() ||
      expiry > Date.now() + 90 * 60_000 ||
      fs.existsSync(privateRunFolder)
    )
      throw new Error("Exact unexpired execution grant required");
    phase = "preflight";
    preflight(contract);
    if ((await Promise.all(ports.map(tcp))).some(Boolean))
      throw new Error("Candidate TCP port occupied");
    phase = "customer-mail-preflight";
    const mail = customerMode
      ? candidate.rehearsal
        ? rehearsalCustomerMail()
        : await openCustomerMail()
      : undefined;
    const test = mail
      ? {
          run:
            "vfcrm-" +
            new Date().toISOString().replace(/\D/g, "").slice(0, 14) +
            "-" +
            randomBytes(4).toString("hex"),
          mailToken: randomBytes(32).toString("hex"),
          control: randomBytes(32).toString("hex"),
          challenge: randomBytes(32).toString("hex"),
        }
      : undefined;
    if (mail && test && (await mail.receipts(test.run)).length)
      throw Error("Customer run marker already exists");
    phase = "private-receipt";
    privateFolder();
    ownsFolder = true;
    lease = {
      project: candidate.project,
      event: candidate.run,
      owner: randomUUID(),
      daemonId,
      issuedAtMs: Date.now(),
      expiresAtMs: expiry,
      containers: {},
    };
    save("lease.json", lease);
    save("execution.json", {
      bundleHash,
      image: contract.imageId,
      build: contract.buildId,
      migrations: contract.migrations,
      access: "isolated-loopback-relay",
      attempt: candidate.attempt,
      harnessHash,
      ...(test
        ? { customerRun: test.run, deliveryTransport: mail?.transport }
        : {}),
    });
    fs.writeFileSync(leasePath("heartbeat"), "", { flag: "wx" });
    let guardActive = true;
    const heartbeat = () => {
      if (
        !guardActive ||
        Date.now() >= expiry ||
        fs.existsSync(leasePath("guard-stopped"))
      )
        throw new Error("Runtime lease expired");
      fs.utimesSync(leasePath("heartbeat"), now(), now());
    };
    const guard = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        "verification/growth-runtime/guard-entry.ts",
        ...(candidate.eventArg ? [candidate.eventArg] : []),
        ...(candidate.rehearsal ? ["--fixture-mail"] : []),
      ],
      {
        windowsHide: true,
        detached: true,
        stdio: "ignore",
        env: {
          ...cleanBrowserEnv(),
          USERPROFILE: process.env.USERPROFILE,
          NODE_ENV: "test",
        },
      },
    );
    guard.once("error", () => {
      guardActive = false;
    });
    guard.once("exit", () => {
      guardActive = false;
    });
    guard.unref();
    await waitFor(
      () => fs.existsSync(leasePath("guard-ready")),
      heartbeat,
      10_000,
    );
    const beat = setInterval(() => {
      try {
        heartbeat();
      } catch {
        clearInterval(beat);
      }
    }, 1000);
    beat.unref();

    phase = "create";
    const secrets = freshSecrets();
    const rendered = candidateConfig(
      contract.images,
      contract.imageId,
      contract.source,
      lease.owner,
      secrets,
    );
    if (test)
      Object.assign(rendered.services.gateway.environment, {
        LOCAL_E2E_MAIL_TOKEN: test.mailToken,
        LOCAL_E2E_CONTROL_TOKEN: test.control,
        LOCAL_E2E_CHALLENGE: test.challenge,
      });
    const config = JSON.stringify(rendered);
    save("configuration-binding.json", { sha256: hash(config) });
    assertFiles(contract.approvedFiles);
    attestDaemon();
    heartbeat();
    // The credential-bearing configuration is transmitted only over stdin.
    docker(
      [
        "compose",
        "-p",
        candidate.project,
        "-f",
        "-",
        "create",
        "--pull",
        "never",
        "--no-build",
      ],
      config,
      60_000,
    );
    const ids = docker([
      "container",
      "ls",
      "--all",
      "--no-trunc",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${candidate.project}`,
    ]).split(/\r?\n/);
    const containers = inspectContainers(ids);
    if (containers.length !== localRoles.length)
      throw new Error("Incomplete create receipt");
    const networkName = `${candidate.project}_private`;
    const template =
      '{{.Id}} {{.Driver}} {{.Internal}} {{.EnableIPv6}} {{index .Options "com.docker.network.bridge.gateway_mode_ipv4"}} {{index .Options "com.docker.network.bridge.host_binding_ipv4"}} {{range .IPAM.Config}}{{.Subnet}} {{.Gateway}}{{end}} {{index .Labels "viewflo.verification.owner"}}';
    const network = () =>
      docker(["network", "inspect", "--format", template, networkName]);
    const networkId = network().split(" ")[0];
    const networkBinding = `${networkId} bridge true false isolated 127.0.0.1 ${candidate.subnet} ${candidate.gateway} ${lease.owner}`;
    if (!/^[0-9a-f]{64}$/.test(networkId) || network() !== networkBinding)
      throw new Error("Network binding failed");
    for (const name of ["database", "dbconfig", "storage"]) {
      const volume = docker([
        "volume",
        "inspect",
        "--format",
        '{{.Driver}} {{index .Labels "viewflo.verification.owner"}} {{index .Labels "viewflo.verification.event"}}',
        `${candidate.project}_${name}`,
      ]);
      if (volume !== `local ${lease.owner} ${candidate.run}`)
        throw new Error("Volume ownership failed");
    }
    for (const role of localRoles) {
      const row = containers.find(
        (c) => c.name === `${candidate.project}-${role}-1`,
      );
      const imageId =
        role === "gateway" ? contract.imageId : contract.images[role].id;
      const mounts = Object.entries(expectedMounts[role] ?? {});
      if (
        !row ||
        row.running ||
        row.owner !== lease.owner ||
        row.project !== candidate.project ||
        row.event !== candidate.run ||
        row.imageId !== imageId ||
        Date.parse(row.created) < lease.issuedAtMs - 1000 ||
        row.mounts.length !== mounts.length ||
        mounts.some(
          ([destination, volume]) =>
            !row.mounts.some(
              (m) =>
                m.Type === "volume" &&
                m.Name === `${candidate.project}_${volume}` &&
                m.Destination === destination,
            ),
        )
      )
        throw new Error("Container create provenance failed");
      lease.containers[role] = { id: row.id, imageId };
    }
    save("bound.json", lease);
    save("resources.json", {
      networkId,
      volumes: ["database", "dbconfig", "storage"].map(
        (v) => `${candidate.project}_${v}`,
      ),
    });
    const idFor = (role: LocalRole) => lease!.containers[role]!.id;
    const rows = () => inspectContainers(localRoles.map(idFor));
    const checkRunning = () => {
      attestDaemon();
      if (network() !== networkBinding) throw new Error("Network drift");
      const peers = docker([
        "network",
        "inspect",
        "--format",
        "{{range $id, $_ := .Containers}}{{println $id}}{{end}}",
        networkId,
      ])
        .split(/\r?\n/)
        .sort();
      if (peers.join() !== localRoles.map(idFor).sort().join())
        throw new Error("Unexpected network peer");
      rows().forEach((row, i) => {
        const role = localRoles[i];
        const ports = Object.entries(row.ports ?? {}).filter(
          ([, bindings]) => bindings?.length,
        );
        if (
          !row.running ||
          row.id !== idFor(role) ||
          row.imageId !== lease!.containers[role]!.imageId ||
          row.owner !== lease!.owner ||
          row.event !== candidate.run ||
          row.project !== candidate.project ||
          row.name !== `${candidate.project}-${role}-1` ||
          Object.keys(row.networks).length !== 1 ||
          row.networks[networkName]?.NetworkID !== networkId ||
          ports.length !== 0
        )
          throw new Error("Actual running bind or ownership drift");
      });
    };
    let restProbe: ReturnType<typeof createRestRouteProbe> | undefined;
    const attestRoutes = () => {
      for (const role of localRoles) {
        const id = idFor(role);
        if (role === "rest") {
          if (!restProbe) {
            restProbe = createRestRouteProbe({
              target: id,
              targetImage: contract.images.rest.id,
              network: networkName,
              networkId,
              image: `node@${contract.images.node.digest}`,
              imageId: contract.images.node.id,
              name: `${candidate.project}-route-probe`,
              owner: lease!.owner,
            });
            save("rest-route-probe.json", {
              id: restProbe.id,
              target: id,
              networkId,
            });
          }
          restProbe.check();
          continue;
        }
        if (
          linuxKernelRoutes(
            docker(["exec", id, "/bin/cat", "/proc/net/route"]),
          ).includes("0.0.0.0/0")
        )
          throw new Error("Unexpected IPv4 default route");
        const ipv6 = docker([
          "exec",
          id,
          "/bin/sh",
          "-c",
          "if test -f /proc/net/ipv6_route; then cat /proc/net/ipv6_route; fi",
        ]);
        if (
          ipv6
            .split(/\r?\n/)
            .some((line) => /^0{32}\s+00\s/.test(line) && !/\slo$/.test(line))
        )
          throw new Error("Unexpected IPv6 default route");
      }
    };

    phase = "bootstrap";
    heartbeat();
    attestDaemon();
    const db = idFor("db");
    docker(["start", db]);
    await waitFor(() => {
      try {
        return docker([
          "exec",
          db,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-U",
          "supabase_admin",
          "-d",
          "postgres",
        ]).includes("accepting connections");
      } catch {
        return false;
      }
    }, heartbeat);
    postgres(
      db,
      ["authenticator", "supabase_auth_admin", "supabase_storage_admin"]
        .map(
          (role) => `alter role ${role} with password '${secrets.password}';`,
        )
        .join("\n"),
      true,
    );
    heartbeat();
    phase = "gateway-dependencies";
    docker(["start", idFor("gateway"), idFor("mail")]);
    const probeFromGateway = (script: string) => {
      try {
        return (
          docker(
            ["exec", idFor("gateway"), "node", "-e", script],
            undefined,
            7000,
          ) === "ready"
        );
      } catch {
        return false;
      }
    };
    await waitFor(
      () =>
        probeFromGateway(`
      const net=require('node:net');
      const tcp=(host,port)=>new Promise((resolve,reject)=>{const s=net.connect({host,port,timeout:2000});s.once('connect',()=>{s.destroy();resolve()});s.once('error',reject);s.once('timeout',()=>{s.destroy();reject(Error())})});
      Promise.all([tcp('db',5432),tcp('mail',1025),fetch('http://127.0.0.1:65173/magic.html',{signal:AbortSignal.timeout(2000)}).then(async r=>{if(!r.ok||!(await r.text()).includes('TokenHash'))throw Error()})]).then(()=>console.log('ready'),()=>{process.exitCode=1});
    `),
      heartbeat,
    );
    phase = "auth-startup";
    docker(["start", idFor("auth")]);
    await waitFor(() => {
      if (!inspectContainers([idFor("auth")])[0].running)
        throw new Error("Auth service exited before readiness");
      return probeFromGateway(
        `fetch('http://auth:9999/health',{signal:AbortSignal.timeout(2000)}).then(r=>{if(r.ok)console.log('ready');else process.exitCode=1},()=>{process.exitCode=1});`,
      );
    }, heartbeat);
    docker(["start", idFor("rest"), idFor("storage")]);
    phase = "native-isolation";
    checkRunning();
    phase = "namespace-routes";
    attestRoutes();
    checkRunning();
    phase = "relay-verification";
    closeRelay = await openLoopbackRelay(idFor("gateway"), heartbeat, !!test);
    const routes = [
      endpoints.app + "/auth/?tenant=pasadena-shades-and-shutters",
      endpoints.api + "/auth/v1/health",
      endpoints.mail + "/api/v1/messages",
    ];
    let relayStatuses: (number | null)[] = [];
    try {
      await waitFor(async () => {
        try {
          const outcomes = await Promise.allSettled(
            routes.map((url) =>
              fetch(url, {
                redirect: "error",
                signal: AbortSignal.timeout(5000),
                headers: { connection: "close" },
              }),
            ),
          );
          relayStatuses = outcomes.map((outcome) =>
            outcome.status === "fulfilled" ? outcome.value.status : null,
          );
          const responses = outcomes.flatMap((outcome) =>
            outcome.status === "fulfilled" ? [outcome.value] : [],
          );
          if (responses.length !== routes.length) return false;
          if (!responses.every((response) => response.ok)) return false;
          const [app, auth, mail] = await Promise.all(
            responses.map((response) => response.text()),
          );
          return (
            app.includes("Welcome back") &&
            !!auth &&
            Array.isArray(JSON.parse(mail).messages)
          );
        } catch {
          return false;
        }
      }, heartbeat);
    } catch (error) {
      save("relay-probe-status.json", { statuses: relayStatuses });
      throw error;
    }
    checkRunning();
    save("relay-verified.json", {
      ports,
      host: "127.0.0.1",
      services: ["app", "auth", "mail"],
      backend: "isolated",
      nativePublishedPorts: 0,
    });
    const expectedEnv = hash(
      JSON.stringify({
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: "/tmp",
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:65171",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secrets.anon,
        SUPABASE_SERVICE_ROLE_KEY: secrets.service,
        CRM_EMAIL_DELIVERY_ENABLED: "false",
        VIEWFLOW_APP_URL: "http://127.0.0.1:65170",
        LEAD_INTAKE_TENANTS: "local-intake-disabled",
        ...(test ? customerAppEnv(test.mailToken, test.challenge) : {}),
      }),
    );
    const binding = JSON.parse(
      docker([
        "exec",
        idFor("gateway"),
        "node",
        "-e",
        "const f=require('node:fs');const b=JSON.parse(f.readFileSync('/tmp/viewflo-app-binding.json','utf8'));process.kill(b.pid,0);const pairs=f.readFileSync('/proc/'+b.pid+'/environ','utf8').split('\\0').filter(Boolean).map(p=>[p.slice(0,p.indexOf('=')),p.slice(p.indexOf('=')+1)]);const env=require('node:crypto').createHash('sha256').update(JSON.stringify(Object.fromEntries(pairs))).digest('hex');console.log(JSON.stringify({source:b.sourceHash,build:b.buildId,environmentMatches:env===b.envHash&&env===process.argv[1]}));",
        expectedEnv,
      ]),
    ) as { source: string; build: string; environmentMatches: boolean };
    if (
      binding.source !== contract.source ||
      binding.build !== contract.buildId ||
      !binding.environmentMatches
    )
      throw new Error("Runtime app binding failed");

    phase = "migrations";
    await waitFor(() => {
      try {
        return (
          postgres(
            db,
            "select to_regclass('auth.users') is not null and to_regclass('storage.objects') is not null;",
          ) === "t"
        );
      } catch {
        return false;
      }
    }, heartbeat);
    const before = baseline(db, false);
    assertFiles(contract.migrations);
    for (const [i, file] of contract.migrations.entries()) {
      heartbeat();
      checkRunning();
      const bytes = fs.readFileSync(file.path);
      if (hash(bytes) !== file.sha256) throw new Error("Migration drift");
      postgres(db, bytes.toString("utf8"), true);
      save(`migration-${i + 1}.json`, file);
    }
    postgres(db, "NOTIFY pgrst, 'reload schema';");
    save("empty-baseline.json", { before, migrated: baseline(db, true) });
    let lastCheck = 0;
    const attest = async () => {
      heartbeat();
      if (Date.now() - lastCheck > 2_000) {
        checkRunning();
        lastCheck = Date.now();
      }
    };

    phase = "seed";
    const fixtures = await seedGrowthCohort({
      attest,
      attestEmptyMigratedBaseline: async () => {
        baseline(db, true);
      },
      secrets,
      journal: {
        claim: async (data) => save("cohort-claim.json", data),
        record: async (data) =>
          fs.writeFileSync(
            leasePath("cohort-current.json"),
            JSON.stringify(data),
          ),
      },
    });
    if (mail && test) {
      phase = "test-sender-settings";
      if (!/^[a-f0-9-]{36}$/.test(fixtures.tenantA))
        throw Error("Invalid synthetic tenant");
      postgres(
        db,
        "insert into public.vf_tenant_email_settings (tenant_id,sender_name,sender_email,reply_to,manager_recipients,enabled) values ('" +
          fixtures.tenantA +
          "','Viewflo Synthetic Review','" +
          mail.sender +
          "','" +
          mail.sender +
          "',array['suppressed@example.invalid'],true);",
        true,
      );
      customerDelivery = startCustomerDelivery({
        run: test.run,
        token: test.control,
        mail,
        attest,
        record: (name, value) => save("customer-" + name + ".json", value),
      });
    }
    phase = "browser";
    if (hash(fs.readFileSync(contract.browserPath)) !== contract.browserSha256)
      throw new Error("Browser executable drift");
    // Use the standard variable names for this run's fresh synthetic owner only.
    process.env.PLAYWRIGHT_TEST_USER = secrets.users.owner.email;
    process.env.PLAYWRIGHT_TEST_PASS = secrets.users.owner.password;
    fs.mkdirSync(leasePath("screenshots"));
    testStatus = await runGrowthBrowser({
      executablePath: contract.browserPath,
      ...(test && customerDelivery
        ? {
            customer: {
              run: test.run,
              challenge: test.challenge,
              delivery: customerDelivery,
              checkpoint: (name: string, data?: object) =>
                save("checkpoint-" + name + ".json", data ?? {}),
            },
          }
        : {}),
      attest,
      fixtures,
      secrets,
      saveMaskedImage: async (name, png) => {
        if (!/^[a-z-]+$/.test(name) || png.length > 8_388_608)
          throw new Error("Capture evidence rejected");
        fs.writeFileSync(leasePath(`screenshots/${name}.png`), png, {
          flag: "wx",
        });
      },
    });
    delete process.env.PLAYWRIGHT_TEST_USER;
    delete process.env.PLAYWRIGHT_TEST_PASS;
    save("browser-status.json", testStatus);
    if (testStatus.result !== "pass")
      throw new Error("Browser assertion stopped");
    checkRunning();
    attestRoutes();
    result = "pass";
  } catch {
    process.exitCode = 1;
  } finally {
    if (customerDelivery) await customerDelivery.close();
    if (closeRelay) await closeRelay();
    if (ownsFolder && lease) {
      try {
        stopOwned(readBoundLease({ ...lease, containers: {} }));
        save("shutdown-complete", { stopped: true });
        shutdown = "verified";
      } catch {
        shutdown = "reconciliation-required";
        process.exitCode = 1;
      }
      save("result.json", { phase, result, shutdown, browser: testStatus });
    }
    if (
      !["--review", "--review-customer"].includes(args[0]) ||
      process.exitCode
    )
      console.log(
        JSON.stringify({ phase, result, shutdown, browser: testStatus }),
      );
  }
}

main().catch(() => {
  process.exitCode = 1;
});
