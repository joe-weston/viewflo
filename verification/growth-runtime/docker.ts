import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { candidate } from "./candidate";
import { cleanBrowserEnv } from "./boundary";
import { expiredStopTargets, type RuntimeLease } from "./lease";

export const context = "desktop-linux";
let expectedDaemon: string | undefined;
export function reviewedDaemonId() {
  if (expectedDaemon) return expectedDaemon;
  const reviewed = JSON.parse(
    fs.readFileSync(
      "tmp/growth-runtime-plan-20261105/read-only-docker.json",
      "utf8",
    ),
  );
  if (
    typeof reviewed.daemonId !== "string" ||
    !/^[a-zA-Z0-9-]{12,80}$/.test(reviewed.daemonId)
  )
    throw Error("Missing reviewed Docker daemon identity");
  expectedDaemon = reviewed.daemonId;
  return reviewed.daemonId as string;
}
export const socket = "npipe:////./pipe/dockerDesktopLinuxEngine";
const env = {
  ...cleanBrowserEnv(),
  USERPROFILE: process.env.USERPROFILE,
  COMPOSE_DISABLE_ENV_FILE: "1",
  NODE_ENV: "test" as const,
};

export function command(
  binary: string,
  args: string[],
  input?: string,
  timeout = 15_000,
) {
  const result = spawnSync(binary, args, {
    input,
    timeout,
    env,
    windowsHide: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024,
  });
  if (result.status !== 0 || result.error)
    throw new Error("Local command failed");
  return result.stdout.trim();
}

export function docker(args: string[], input?: string, timeout?: number) {
  return command("docker", ["--context", context, ...args], input, timeout);
}

export function attestDaemon() {
  if (
    command("docker", [
      "context",
      "inspect",
      context,
      "--format",
      "{{.Endpoints.docker.Host}}",
    ]) !== socket ||
    docker(["info", "--format", "{{.ID}} {{.OSType}}"]) !==
      `${reviewedDaemonId()} linux`
  )
    throw new Error("Docker daemon binding failed");
}

type Observation = {
  id: string;
  name: string;
  imageId: string;
  created: string;
  running: boolean;
  project: string;
  event: string;
  owner: string;
  networks: Record<string, { NetworkID: string }>;
  ports: Record<string, { HostIp: string; HostPort: string }[] | null> | null;
  mounts: { Type: string; Name?: string; Destination: string }[];
};

export function inspectContainers(ids: readonly string[]) {
  if (!ids.length) return [];
  if (ids.some((id) => !/^[0-9a-f]{64}$/.test(id)))
    throw new Error("Invalid container ID");
  const template =
    '{"id":{{json .Id}},"name":{{json .Name}},"imageId":{{json .Image}},"created":{{json .Created}},"running":{{json .State.Running}},' +
    '"project":{{json (index .Config.Labels "com.docker.compose.project")}},"event":{{json (index .Config.Labels "viewflo.verification.event")}},"owner":{{json (index .Config.Labels "viewflo.verification.owner")}},' +
    '"networks":{{json .NetworkSettings.Networks}},"ports":{{json .NetworkSettings.Ports}},"mounts":{{json .Mounts}}}';
  return docker(["container", "inspect", "--format", template, ...ids])
    .split(/\r?\n/)
    .map((line) => {
      const row = JSON.parse(line) as Observation;
      return { ...row, name: row.name.replace(/^\//, "") };
    });
}

export function stopOwned(lease: RuntimeLease) {
  attestDaemon();
  const ids = Object.values(lease.containers).map((c) => c.id);
  const targets = expiredStopTargets(
    lease,
    { daemonId: reviewedDaemonId(), containers: inspectContainers(ids) },
    Date.now(),
    true,
  );
  for (const id of targets) {
    attestDaemon();
    const row = inspectContainers([id])[0];
    const role = Object.entries(lease.containers).find(
      ([, binding]) => binding.id === id,
    )?.[0];
    if (
      !role ||
      row.id !== id ||
      row.imageId !==
        lease.containers[role as keyof RuntimeLease["containers"]]?.imageId ||
      row.owner !== lease.owner ||
      row.event !== lease.event ||
      row.project !== lease.project ||
      row.name !== `${candidate.project}-${role}-1`
    )
      throw new Error("Stop target drift");
    if (row.running) docker(["stop", "--time", "30", id], undefined, 40_000);
  }
  if (inspectContainers(ids).some((c) => c.running))
    throw new Error("Shutdown incomplete");
}
