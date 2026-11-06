import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { stopOwned } from "./docker";
import { candidate } from "./candidate";
import type { RuntimeLease } from "./lease";
import { readJson } from "./runtime-contract";
import { localRoles } from "../../lib/local-review-policy";

export const privateRunFolder = path.resolve(
  "tmp",
  `${candidate.run}-execution`,
);
export const leasePath = (name: string) => path.join(privateRunFolder, name);

export function readBoundLease(initial: RuntimeLease) {
  const file = leasePath("bound.json");
  if (!fs.existsSync(file)) return initial;
  const bound = readJson<RuntimeLease>(file);
  const { containers, ...metadata } = bound;
  const { containers: unused, ...expected } = initial;
  void unused;
  if (
    JSON.stringify(metadata) !== JSON.stringify(expected) ||
    Object.keys(containers).length !== localRoles.length ||
    !localRoles.every((role) => Object.hasOwn(containers, role))
  )
    throw new Error("Lease update rejected");
  return bound;
}

export async function watchLease() {
  const initial = readJson<RuntimeLease>(leasePath("lease.json"));
  if (
    initial.project !== candidate.project ||
    initial.event !== candidate.run ||
    Object.keys(initial.containers).length ||
    Date.now() >= initial.expiresAtMs
  )
    throw new Error("Guard lease rejected");
  fs.writeFileSync(leasePath("guard-ready"), "ready\n", { flag: "wx" });
  while (true) {
    if (fs.existsSync(leasePath("shutdown-complete"))) return;
    const now = Date.now();
    const heartbeat = fs.statSync(leasePath("heartbeat")).mtimeMs;
    if (now >= initial.expiresAtMs || now - heartbeat > 90_000) {
      const lease = readBoundLease(initial);
      stopOwned(lease);
      fs.writeFileSync(leasePath("guard-stopped"), "stopped\n", { flag: "wx" });
      return;
    }
    await delay(1000);
  }
}
