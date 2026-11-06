import { docker, inspectContainers } from "./docker";

const code = `const f=require('node:fs');
const rows=(file)=>f.readFileSync(file,'utf8').trim().split(/\\r?\\n/);
const v4=rows('/proc/net/route');
if(!v4.shift()?.startsWith('Iface')||v4.some(r=>!/^\\S+\\s+[0-9A-F]{8}\\s/i.test(r)))process.exit(2);
const v6=f.existsSync('/proc/net/ipv6_route')?rows('/proc/net/ipv6_route').filter(Boolean):[];
if(v6.some(r=>!(/^[a-f0-9]{32}\\s+[a-f0-9]{2}\\s/i.test(r))))process.exit(2);
console.log(JSON.stringify({ipv4Default:v4.some(r=>r.trim().split(/\\s+/)[1]==='00000000'),ipv6Default:v6.some(r=>/^0{32}\\s+00\\s/.test(r)&&!/\\slo$/.test(r))}));`;

/** Run a short-lived reader in the exact REST network namespace. Docker creates
 * no extra bridge endpoint in container network mode. The reader never opens sockets. */
export function createRestRouteProbe(input: {
  target: string;
  targetImage: string;
  network: string;
  networkId: string;
  image: string;
  imageId: string;
  name: string;
  owner: string;
}) {
  const {
    target,
    targetImage,
    network,
    networkId,
    image,
    imageId,
    name,
    owner,
  } = input;
  if (
    !/^[0-9a-f]{64}$/.test(target) ||
    !/^[0-9a-f]{64}$/.test(networkId) ||
    !/^node@sha256:[0-9a-f]{64}$/.test(image) ||
    !/^sha256:[0-9a-f]{64}$/.test(imageId) ||
    !/^[a-z0-9-]+$/.test(name) ||
    !/^[a-z0-9-]+$/.test(owner)
  )
    throw new Error("REST route probe binding rejected");
  const verifyTarget = () => {
    const row = inspectContainers([target])[0];
    if (
      !row.running ||
      row.id !== target ||
      row.imageId !== targetImage ||
      row.owner !== owner ||
      Object.keys(row.networks).length !== 1 ||
      row.networks[network]?.NetworkID !== networkId ||
      Object.values(row.ports ?? {}).some((ports) => ports?.length)
    )
      throw new Error("REST route target drift");
  };
  verifyTarget();
  if (docker(["container", "ls", "-aq", "--filter", `name=^/${name}$`]))
    throw new Error("Route probe identity occupied");
  const id = docker([
    "create",
    "--pull",
    "never",
    "--name",
    name,
    "--label",
    `viewflo.verification.owner=${owner}`,
    "--network",
    `container:${target}`,
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
    code,
  ]);
  if (!/^[0-9a-f]{64}$/.test(id)) throw new Error("Route probe ID missing");
  const verifyProbe = () => {
    const format =
      '{{.Id}} {{.Image}} {{.HostConfig.NetworkMode}} {{.HostConfig.ReadonlyRootfs}} {{.Config.User}} {{len .Mounts}} {{index .Config.Labels "viewflo.verification.owner"}} {{.State.Running}}';
    if (
      docker(["container", "inspect", "--format", format, id]) !==
      `${id} ${imageId} container:${target} true node 0 ${owner} false`
    )
      throw new Error("Route probe ownership or lifecycle drift");
  };
  verifyProbe();
  return {
    id,
    check: () => {
      verifyTarget();
      verifyProbe();
      const raw = docker(["start", "--attach", id], undefined, 10_000);
      verifyProbe();
      verifyTarget();
      if (raw !== '{"ipv4Default":false,"ipv6Default":false}')
        throw new Error("Unexpected REST default route");
    },
  };
}
