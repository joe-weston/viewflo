import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { attestDaemon, context, docker } from "./docker";
import { cleanBrowserEnv } from "./boundary";
import {
  hash,
  readContract,
  readJson,
  type Contract,
} from "./runtime-contract";

const baseTag = "viewflo-growth-mvp-review:20261106-prepared";
const directory = "verification/growth-runtime";
const inputs = [
  "Dockerfile.customer",
  "supervisor.mjs",
  "customer-broker.mjs",
  "customer-preload.mjs",
  "customer-profile.mjs",
];
const receipt = "tmp/growth-runtime-customer-image.json";
const profile = () =>
  hash(
    JSON.stringify(
      inputs.map((name) => [
        name,
        hash(fs.readFileSync(path.join(directory, name))),
      ]),
    ),
  );
type Receipt = {
  baseId: string;
  imageId: string;
  buildId: string;
  profileHash: string;
};
export function customerContract(base: Contract) {
  const bound = readJson<Receipt>(receipt);
  if (
    bound.baseId !== base.imageId ||
    bound.profileHash !== profile() ||
    !/^sha256:[a-f0-9]{64}$/.test(bound.imageId) ||
    !/^[a-zA-Z0-9_-]{10,80}$/.test(bound.buildId)
  )
    throw Error("Customer image binding drift");
  const label = docker([
    "image",
    "inspect",
    "--format",
    '{{index .Config.Labels "viewflo.verification.customer-profile"}}',
    bound.imageId,
  ]);
  if (label !== bound.profileHash)
    throw Error("Customer image profile label drift");
  return {
    ...base,
    imageId: bound.imageId,
    buildId: bound.buildId,
    customerProfile: bound.profileHash,
  };
}

function build() {
  attestDaemon();
  const base = readContract();
  if (
    docker(["image", "inspect", "--format", "{{.Id}}", baseTag]) !==
    base.imageId
  )
    throw Error("Local immutable image tag drift");
  const profileHash = profile();
  const parent = fs.realpathSync(os.tmpdir());
  const folder = fs.mkdtempSync(path.join(parent, "viewflo-customer-image-"));
  if (
    path.dirname(fs.realpathSync(folder)).toLowerCase() !== parent.toLowerCase()
  )
    throw Error("Unexpected build context root");
  const iid = path.join(folder, "image.iid");
  try {
    for (const input of inputs)
      fs.copyFileSync(path.join(directory, input), path.join(folder, input));
    const child = spawnSync(
      "docker",
      [
        "--context",
        context,
        "build",
        "--network=none",
        "--pull=false",
        "--progress=plain",
        "--platform=linux/amd64",
        "--build-arg",
        "BASE_IMAGE=" + baseTag,
        "--build-arg",
        "CUSTOMER_PROFILE_HASH=" + profileHash,
        "--iidfile",
        iid,
        "-f",
        path.join(folder, "Dockerfile.customer"),
        "-t",
        "viewflo-growth-customer-e2e:" + profileHash.slice(0, 12),
        folder,
      ],
      {
        env: {
          ...cleanBrowserEnv(),
          USERPROFILE: process.env.USERPROFILE,
          DOCKER_BUILDKIT: "1",
          NODE_ENV: "test",
        },
        encoding: "utf8",
        windowsHide: true,
        timeout: 720000,
        maxBuffer: 262144,
      },
    );
    if (child.status !== 0 || child.error)
      throw Error("Offline customer image build failed");
    const buildIds = [
      ...new Set(
        ((child.stdout ?? "") + "\n" + (child.stderr ?? ""))
          .split(/\r?\n/)
          .map(
            (line) =>
              line.match(
                /VIEWFLO_CUSTOMER_BUILD_ID=([a-zA-Z0-9_-]{10,80})\s*$/,
              )?.[1],
          )
          .filter(Boolean),
      ),
    ];
    const imageId = fs.readFileSync(iid, "utf8").trim();
    if (buildIds.length !== 1 || !/^sha256:[a-f0-9]{64}$/.test(imageId))
      throw Error("Customer image evidence incomplete");
    fs.writeFileSync(
      receipt,
      JSON.stringify(
        { baseId: base.imageId, imageId, buildId: buildIds[0], profileHash },
        null,
        2,
      ) + "\n",
    );
    customerContract(base);
    console.log(
      JSON.stringify({ status: "built", imageId, buildId: buildIds[0] }),
    );
  } finally {
    for (const file of [...inputs, "image.iid"]) {
      const target = path.join(folder, file);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    fs.rmdirSync(folder);
  }
}

if (process.argv[2] === "--build-customer-image") {
  try {
    build();
  } catch {
    console.error("Customer image preparation failed");
    process.exitCode = 1;
  }
}
