import http from "node:http";
import { timingSafeEqual } from "node:crypto";
const kinds = ["intake", "quote", "feedback"];
const mailbox = "jocduplbot@gmail.com";
const hex = /^[a-f0-9]{64}$/;
function authorized(header, token) {
  if (typeof header !== "string") return false;
  const a = Buffer.from(header),
    b = Buffer.from("Bearer " + token);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function body(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 80000) throw Error("Body limit");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function startCustomerBroker(mailToken, controlToken, port = 65175) {
  if (
    !hex.test(mailToken) ||
    !hex.test(controlToken) ||
    mailToken === controlToken
  )
    throw Error("Customer broker requires distinct local tokens");
  const jobs = new Map();
  let armed;
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => {
      if (!res.destroyed)
        res
          .writeHead(status, {
            "content-type": "application/json",
            "cache-control": "no-store",
          })
          .end(JSON.stringify(value));
    };
    try {
      if (req.method === "POST" && req.url === "/emails") {
        if (!authorized(req.headers.authorization, mailToken))
          return json(403, {});
        const payload = await body(req);
        const to = Array.isArray(payload?.to) ? payload.to : [payload?.to];
        const key = req.headers["idempotency-key"];
        if (
          to.length !== 1 ||
          to[0] !== mailbox ||
          !armed ||
          typeof key !== "string" ||
          !new RegExp(
            armed === "intake"
              ? "^lead-email/[a-f0-9-]+$"
              : "^crm-followup/[a-f0-9-]+$",
          ).test(key)
        )
          return json(403, {});
        const snapshot = JSON.stringify(payload);
        let job = jobs.get(armed);
        if (job && (job.key !== key || job.snapshot !== snapshot))
          return json(409, {});
        if (!job) {
          let finish;
          const result = new Promise((resolve) => {
            finish = resolve;
          });
          job = {
            kind: armed,
            key,
            payload,
            snapshot,
            result,
            finish,
            state: "pending",
          };
          jobs.set(armed, job);
        }
        let timer;
        try {
          const result = await Promise.race([
            job.result,
            new Promise((resolve) => {
              timer = setTimeout(() => resolve({ status: 503 }), 8500);
            }),
          ]);
          return json(result.status, result.id ? { id: result.id } : {});
        } finally {
          clearTimeout(timer);
        }
      }
      if (!authorized(req.headers.authorization, controlToken))
        return json(403, {});
      if (req.method === "POST" && req.url === "/arm") {
        const { kind } = await body(req);
        if (
          !kinds.includes(kind) ||
          kind !== kinds[jobs.size] ||
          (armed && jobs.get(armed)?.state !== "accepted")
        )
          return json(409, {});
        armed = kind;
        return json(200, { armed: true });
      }
      if (req.method === "GET" && req.url === "/next") {
        const job = jobs.get(armed);
        if (job?.state !== "pending") return json(200, null);
        job.state = "claimed";
        return json(200, {
          kind: job.kind,
          key: job.key,
          payload: job.payload,
        });
      }
      if (req.method === "POST" && req.url === "/finish") {
        const { kind, key, status, id } = await body(req);
        const job = jobs.get(kind);
        if (
          !job ||
          job.state !== "claimed" ||
          job.key !== key ||
          ![200, 400, 503].includes(status) ||
          (status === 200 && !/^[a-z0-9-]{1,128}$/i.test(id ?? ""))
        )
          return json(409, {});
        job.state = status === 200 ? "accepted" : "stopped";
        job.finish({ status, id: status === 200 ? id : undefined });
        return json(200, { recorded: true });
      }
      return json(404, {});
    } catch {
      return json(400, {});
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
