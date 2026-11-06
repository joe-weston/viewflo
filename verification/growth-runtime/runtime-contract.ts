import fs from "node:fs";
import path from "node:path";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { localSubnetsOverlap } from "../../lib/local-review-policy";
import type { ImageLock } from "../../lib/local-review-config";
import { candidate } from "./candidate";
import { attestDaemon, command, reviewedDaemonId, docker } from "./docker";

export const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
export const readJson = <T>(file: string) =>
  JSON.parse(fs.readFileSync(file, "utf8")) as T;
type Pin = { path: string; sha256: string; state?: "deleted" };
export type Contract = {
  source: string;
  imageId: string;
  buildId: string;
  imageInputs: string;
  imageHarness: string;
  images: ImageLock;
  migrations: Pin[];
  approvedFiles: Pin[];
  browserPath: string;
  browserSha256: string;
};

export function assertFiles(files: Pin[], root = ".") {
  for (const file of files) {
    const target = path.join(root, file.path);
    if (
      file.state === "deleted"
        ? fs.existsSync(target)
        : hash(fs.readFileSync(target)) !== file.sha256
    )
      throw new Error("Pinned file changed");
  }
}

export function readContract(): Contract {
  const old = "tmp/growth-runtime-plan-20261105/";
  const binding = readJson<{
    app: { sha256: string; files: Pin[] };
    migrations: Pin[];
  }>(old + "source-binding.json");
  const observed = readJson<{
    daemonId: string;
    images: Record<
      string,
      { historicalReference: string; id: string; repoDigests: string[] }
    >;
  }>(old + "read-only-docker.json");
  const prepared = readJson<{
    appSha256: string;
    image: {
      imageId: string;
      buildId: string;
      inputsSha256: string;
      imageHarnessSha256: string;
    };
  }>("tmp/growth-runtime-prepared-bundle-20261106.json");
  if (
    observed.daemonId !== reviewedDaemonId() ||
    prepared.appSha256 !== binding.app.sha256 ||
    binding.migrations.map((m) => path.basename(m.path)).join() !==
      candidate.migrations.join()
  )
    throw new Error("Prepared source binding mismatch");
  assertFiles(binding.app.files);
  const pins = "tmp/admin-mvp-20261104/";
  assertFiles(
    readJson<{ files: Pin[] }>(pins + "protected-tenant-ui.json").files,
  );
  assertFiles(
    readJson<{ files: Pin[] }>(pins + "continuation-held-pins.json").files,
  );
  const reference = readJson<{ root: string; files: Pin[] }>(
    pins + "reference.json",
  );
  assertFiles(reference.files, reference.root);
  const images = Object.fromEntries(
    Object.entries(observed.images).map(([role, image]) => [
      role,
      {
        reference: image.historicalReference,
        id: image.id,
        digest: image.repoDigests[0].split("@")[1],
      },
    ]),
  ) as ImageLock;
  const directory = "verification/growth-runtime";
  const approvedFiles = fs
    .readdirSync(directory)
    .filter((name) => /\.(ts|mjs)$|^Dockerfile(?:\.customer)?$/.test(name))
    .sort()
    .map((name) => {
      const file = `${directory}/${name}`;
      return { path: file, sha256: hash(fs.readFileSync(file)) };
    });
  const browser = readJson<{ browsers: { name: string; revision: string }[] }>(
    "node_modules/playwright-core/browsers.json",
  ).browsers.find((item) => item.name === "chromium-headless-shell");
  if (!browser || !/^\d+$/.test(browser.revision))
    throw new Error("Browser revision not pinned");
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!path.isAbsolute(cache))
    throw Error("An absolute Playwright browser cache is required");
  const browserPath = path.join(
    cache,
    "chromium_headless_shell-" + browser.revision,
    "chrome-headless-shell-win64",
    "chrome-headless-shell.exe",
  );
  return {
    source: prepared.appSha256,
    imageId: prepared.image.imageId,
    buildId: prepared.image.buildId,
    imageInputs: prepared.image.inputsSha256,
    imageHarness: prepared.image.imageHarnessSha256,
    images,
    migrations: binding.migrations,
    approvedFiles,
    browserPath,
    browserSha256: hash(fs.readFileSync(browserPath)),
  };
}

export function preflight(contract: Contract) {
  attestDaemon();
  const imageFormat = "{{.Id}} {{.Os}}/{{.Architecture}}";
  for (const image of Object.values(contract.images)) {
    const pinned = `${image.reference.split(":")[0]}@${image.digest}`;
    if (
      docker(["image", "inspect", "--format", imageFormat, pinned]) !==
      `${image.id} linux/amd64`
    )
      throw new Error("Cached service image drift");
  }
  const labels = ["source", "inputs", "harness"]
    .map((label) => `{{index .Config.Labels "viewflo.verification.${label}"}}`)
    .join(" ");
  if (
    docker([
      "image",
      "inspect",
      "--format",
      `${imageFormat} {{.Config.User}} ${labels}`,
      contract.imageId,
    ]) !==
    `${contract.imageId} linux/amd64 node ${contract.source} ${contract.imageInputs} ${contract.imageHarness}`
  )
    throw new Error("Application image binding drift");
  for (const resource of ["container", "volume", "network"])
    if (
      docker([
        resource,
        "ls",
        ...(resource === "container" ? ["--all"] : []),
        "--filter",
        `name=${candidate.project}`,
        "--quiet",
      ])
    )
      throw new Error("Candidate name is occupied");
  const dockerPorts = docker([
    "container",
    "ls",
    "--all",
    "--format",
    "{{.Ports}}",
  ]);
  if (/:(65170|65171|65172|65174)->/.test(dockerPorts))
    throw new Error("Docker port collision");
  const windows = command("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$ErrorActionPreference='Stop'; if (Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 65170,65171,65172,65174) { exit 7 }; Get-NetRoute -AddressFamily IPv4 | Select-Object -ExpandProperty DestinationPrefix",
  ]);
  const networkIds = docker(["network", "ls", "--quiet"]).split(/\r?\n/);
  const dockerRoutes = docker([
    "network",
    "inspect",
    "--format",
    "{{range .IPAM.Config}}{{println .Subnet}}{{end}}",
    ...networkIds,
  ]);
  const wslRoutes = command("wsl.exe", [
    "-e",
    "ip",
    "-4",
    "route",
    "show",
    "table",
    "all",
  ]);
  const vmRoutes = command("wsl.exe", [
    "-d",
    "docker-desktop",
    "-e",
    "/bin/sh",
    "-c",
    "cat /proc/net/route",
  ]);
  const routes =
    [windows, dockerRoutes, wslRoutes, ...linuxKernelRoutes(vmRoutes)]
      .join("\n")
      .match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) ?? [];
  if (
    !routes.length ||
    routes.some(
      (route) =>
        route !== "0.0.0.0/0" && localSubnetsOverlap(route, candidate.subnet),
    )
  )
    throw new Error("Candidate route overlap");
}

export function linuxKernelRoutes(raw: string) {
  const lines = raw.trim().split(/\r?\n/);
  if (!lines.shift()?.startsWith("Iface"))
    throw new Error("Kernel route table missing");
  return lines.map((line) => {
    const [, address, , , , , , mask] = line.trim().split(/\s+/);
    if (!/^[0-9a-f]{8}$/i.test(address) || !/^[0-9a-f]{8}$/i.test(mask))
      throw new Error("Kernel route malformed");
    const bits = [...Buffer.from(mask, "hex")]
      .reverse()
      .map((x) => x.toString(2).padStart(8, "0"))
      .join("");
    if (!/^1*0*$/.test(bits)) throw new Error("Kernel route mask malformed");
    return `${[...Buffer.from(address, "hex")].reverse().join(".")}/${bits.replaceAll("0", "").length}`;
  });
}

export function freshSecrets() {
  const hex = (bytes: number) => randomBytes(bytes).toString("hex");
  const jwt = hex(32);
  const token = (role: string) => {
    const part = (data: unknown) =>
      Buffer.from(JSON.stringify(data)).toString("base64url");
    const body = `${part({ alg: "HS256", typ: "JWT" })}.${part({ role, iss: "supabase", exp: Math.floor(Date.now() / 1000) + 7200 })}`;
    return `${body}.${createHmac("sha256", jwt).update(body).digest("base64url")}`;
  };
  const user = (role: string) => ({
    email: `${role}-${hex(5)}@example.invalid`,
    password: hex(24),
  });
  return {
    password: hex(32),
    jwt,
    anon: token("anon"),
    service: token("service_role"),
    users: {
      owner: user("owner"),
      member: user("member"),
      billing: user("billing"),
      foreign: user("foreign"),
      staff: user("staff"),
      operator: user("operator"),
    },
  };
}
