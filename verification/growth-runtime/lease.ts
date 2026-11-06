import { candidate } from "./candidate";

const stopOrder = ["gateway", "auth", "rest", "storage", "mail", "db"] as const;
type Role = (typeof stopOrder)[number];

type ContainerBinding = {
  id: string;
  imageId: string;
};

export type RuntimeLease = {
  project: typeof candidate.project;
  event: typeof candidate.run;
  owner: string;
  daemonId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  containers: Partial<Record<Role, ContainerBinding>>;
};

type ObservedContainer = ContainerBinding & {
  name: string;
  project: string;
  event: string;
  owner: string;
  running: boolean;
};

/** Pure exact-ID stop planning. The controller must read and reattest each ID before stopping it. */
export function expiredStopTargets(
  lease: RuntimeLease,
  observations: { daemonId: string; containers: readonly ObservedContainer[] },
  nowMs: number,
  controllerLost: boolean,
) {
  if (
    lease.project !== candidate.project ||
    lease.event !== candidate.run ||
    !lease.owner ||
    !lease.daemonId ||
    lease.daemonId !== observations.daemonId ||
    ![nowMs, lease.issuedAtMs, lease.expiresAtMs].every(Number.isSafeInteger) ||
    nowMs < lease.issuedAtMs ||
    lease.expiresAtMs <= lease.issuedAtMs ||
    lease.expiresAtMs - lease.issuedAtMs > 90 * 60_000
  )
    throw new Error("Runtime lease binding failed");
  if (nowMs < lease.expiresAtMs && !controllerLost) return [];
  const seen = new Set<string>();
  const targets: string[] = [];
  for (const role of stopOrder) {
    const binding = lease.containers[role];
    if (!binding) continue;
    const matching = observations.containers.filter(
      (container) => container.id === binding.id,
    );
    const observed = matching[0];
    if (
      seen.has(binding.id) ||
      !/^[0-9a-f]{64}$/.test(binding.id) ||
      !/^sha256:[0-9a-f]{64}$/.test(binding.imageId) ||
      matching.length !== 1 ||
      observed.imageId !== binding.imageId ||
      observed.name !== `${candidate.project}-${role}-1` ||
      observed.project !== lease.project ||
      observed.event !== lease.event ||
      observed.owner !== lease.owner
    )
      throw new Error("Exact resource ownership could not be established");
    seen.add(binding.id);
    if (observed.running) targets.push(binding.id);
  }
  return targets;
}
