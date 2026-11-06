import { attestDaemon, docker, inspectContainers } from "./docker";
import { openLoopbackRelay, relayPorts } from "./relay";
import { linuxKernelRoutes, readContract } from "./runtime-contract";

const name = "viewflo-growth-relay-probe-20261106";
const label = `viewflo.verification.probe=${name}`;
const fixture = `const h=require('node:http');const servers=process.argv.slice(1).map(v=>{const [p,n]=v.split(':');return h.createServer((q,s)=>{s.end(n)}).listen(Number(p),'0.0.0.0')});setTimeout(()=>{for(const s of servers)s.close();},90000);`;

async function main() {
  const contract = readContract();
  // Candidate resources already exist. This distinct data-free transport probe
  // checks its own identities and uses only the previously pinned Node image.
  attestDaemon();
  for (const type of ["network", "container"])
    if (
      docker([
        type,
        "ls",
        ...(type === "container" ? ["--all"] : []),
        "--filter",
        `name=${name}`,
        "--quiet",
      ])
    )
      throw new Error("Probe identity occupied");
  const expected = contract.images.node;
  const image = `node@${expected.digest}`;
  if (
    docker(["image", "inspect", "--format", "{{.Id}}", image]) !== expected.id
  )
    throw new Error("Probe image drift");
  const ids: string[] = [];
  let close: (() => Promise<void>) | undefined;
  try {
    const network = docker([
      "network",
      "create",
      "--internal",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.gateway_mode_ipv4=isolated",
      "--label",
      label,
      name,
    ]);
    const binding =
      '{{.Id}} {{.Internal}} {{.EnableIPv6}} {{index .Options "com.docker.network.bridge.gateway_mode_ipv4"}}';
    const verifyNetwork = () => {
      if (
        docker(["network", "inspect", "--format", binding, network]) !==
        `${network} true false isolated`
      )
        throw new Error("Probe network drift");
    };
    verifyNetwork();
    for (const [role, args] of [
      ["gateway", ["65170:app", "65171:api"]],
      ["mail", ["8025:mail"]],
    ] as const) {
      const id = docker([
        "create",
        "--pull",
        "never",
        "--name",
        `${name}-${role}`,
        "--label",
        label,
        "--network",
        name,
        "--network-alias",
        role,
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--log-driver",
        "none",
        "--user",
        "node",
        "--entrypoint",
        "node",
        image,
        "-e",
        fixture,
        ...args,
      ]);
      if (!/^[a-f0-9]{64}$/.test(id))
        throw new Error("Probe container ID missing");
      ids.push(id);
    }
    docker(["start", ...ids]);
    const verify = () => {
      attestDaemon();
      verifyNetwork();
      for (const row of inspectContainers(ids)) {
        if (
          !row.running ||
          row.imageId !== expected.id ||
          Object.keys(row.networks).length !== 1 ||
          row.networks[name]?.NetworkID !== network ||
          Object.values(row.ports ?? {}).some((port) => port?.length)
        )
          throw new Error("Probe resource drift");
        if (
          linuxKernelRoutes(
            docker(["exec", row.id, "/bin/cat", "/proc/net/route"]),
          ).includes("0.0.0.0/0")
        )
          throw new Error("Probe gained a default route");
      }
    };
    verify();
    close = await openLoopbackRelay(ids[0], () => undefined);
    const replies = await Promise.all(
      relayPorts.map(async (port) => {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          redirect: "error",
          headers: { connection: "close" },
          signal: AbortSignal.timeout(10_000),
        });
        return response.ok ? await response.text() : "";
      }),
    );
    if (replies.join() !== "app,api,mail")
      throw new Error("Relay probe response mismatch");
    verify();
    console.log(
      JSON.stringify({
        probe: "pass",
        numericLoopbackPorts: relayPorts,
        nativePublishedPorts: 0,
        backend: "internal-isolated",
      }),
    );
  } finally {
    if (close) await close();
    attestDaemon();
    for (const id of ids) {
      const actual = docker([
        "container",
        "inspect",
        "--format",
        '{{.Id}} {{index .Config.Labels "viewflo.verification.probe"}} {{.State.Running}}',
        id,
      ]);
      if (actual === `${id} ${name} true`) docker(["stop", "--time", "5", id]);
      else if (actual !== `${id} ${name} false`)
        throw new Error("Probe shutdown ownership mismatch");
    }
    if (inspectContainers(ids).some((row) => row.running))
      throw new Error("Probe still running");
    console.log(
      JSON.stringify({ probeShutdown: "verified", containers: ids.length }),
    );
  }
}

main().catch(() => {
  console.log(JSON.stringify({ probe: "fail" }));
  process.exitCode = 1;
});
