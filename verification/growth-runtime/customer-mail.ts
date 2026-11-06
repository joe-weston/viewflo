import fs from "node:fs";
import { parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import {
  customerMailbox,
  customerMailKinds,
  customerPrefix,
  providerPayload,
  validateCustomerRun,
  validateTestSender,
  type CustomerMailKind,
} from "./customer-mail-policy";

const gmail = "https://gmail.googleapis.com/gmail/v1/users/me";
const sendScope = "https://www.googleapis.com/auth/gmail.";
const jsonFile = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, "utf8"));
type GoogleClient = { client_id: string; client_secret: string };
type Part = {
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: Part[];
};
const address = (header: string) =>
  (/<([^<>]+)>\s*$/.exec(header)?.[1] ?? header).trim().toLowerCase();
const content = (part: Part): string =>
  [
    part.body?.data
      ? Buffer.from(part.body.data, "base64url").toString("utf8")
      : "",
    ...(part.parts ?? []).map(content),
  ].join("\n");

async function openSharedMailbox(env = process.env) {
  if (!env.GMAIL_E2E_CREDENTIALS || !env.GMAIL_E2E_TOKEN)
    throw Error("Configure the reviewed private Gmail grant paths");
  const credential = jsonFile<{ installed?: GoogleClient; web?: GoogleClient }>(
    env.GMAIL_E2E_CREDENTIALS,
  );
  const client = credential.installed ?? credential.web;
  const grant = jsonFile<{ refresh_token?: string }>(env.GMAIL_E2E_TOKEN);
  if (!client?.client_id || !client.client_secret || !grant.refresh_token)
    throw Error("Shared Gmail grant is incomplete");
  const refresh = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: grant.refresh_token,
    }),
  });
  if (!refresh.ok) throw Error("Shared Gmail grant refresh failed");
  const { access_token: access } = (await refresh.json()) as {
    access_token?: string;
  };
  if (!access) throw Error("Missing Gmail access token");
  const infoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  infoUrl.searchParams.set("access_token", access);
  const info = await fetch(infoUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!info.ok) throw Error("Gmail grant scope verification failed");
  const { scope } = (await info.json()) as { scope?: string };
  if (
    !scope
      ?.split(/\s+/)
      .some((s) => s === sendScope + "readonly" || s === sendScope + "modify")
  )
    throw Error("Gmail grant cannot read messages");
  const readGmail = async (path: string, query?: URLSearchParams) => {
    const response = await fetch(
      gmail + "/" + path + (query ? "?" + query : ""),
      {
        headers: { authorization: "Bearer " + access },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw Error("Gmail read failed");
    return response.json();
  };
  const profile = (await readGmail("profile")) as { emailAddress?: string };
  if (profile.emailAddress !== customerMailbox)
    throw Error("Shared mailbox identity mismatch");
  return readGmail;
}

export async function openCustomerMail(env = process.env) {
  if (!env.VIEWFLO_E2E_FROM) throw Error("A verified test sender is required");
  const sender = validateTestSender(env.VIEWFLO_E2E_FROM);
  const keyFile = env.VIEWFLO_E2E_RESEND_KEY_FILE;
  const usePasadenaDotenv = env.VIEWFLO_E2E_RESEND_DOTENV === "1";
  if (Boolean(keyFile) === usePasadenaDotenv)
    throw Error("Select exactly one test key source");
  if (
    usePasadenaDotenv &&
    sender !== "no-reply@mail.pasadenashadesandshutters.com"
  )
    throw Error("The Pasadena key requires the approved Pasadena sender");
  const key = keyFile
    ? fs.readFileSync(keyFile, "utf8").trim()
    : parseEnv(fs.readFileSync(".env", "utf8")).PASADENA_RESEND_KEY?.trim();
  if (!key || !/^re_[a-zA-Z0-9_-]+$/.test(key)) throw Error("Invalid test key");
  const readGmail = await openSharedMailbox(env);
  return {
    sender,
    transport: "gmail" as const,
    async send(run: string, kind: CustomerMailKind, payload: unknown) {
      const body = providerPayload(run, kind, sender, payload);
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(6000),
          headers: {
            authorization: "Bearer " + key,
            "content-type": "application/json",
            "idempotency-key": run + "/" + kind,
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) return { status: response.status >= 500 ? 503 : 400 };
        const { id } = (await response.json()) as { id?: string };
        return typeof id === "string" && /^[a-z0-9-]{1,128}$/i.test(id)
          ? { status: 200, id }
          : { status: 503 };
      } catch {
        return { status: 503 };
      }
    },
    async receipts(run: string) {
      validateCustomerRun(run);
      const list = (await readGmail(
        "messages",
        new URLSearchParams({
          q: "from:" + sender + " to:" + customerMailbox + " subject:" + run,
          labelIds: "INBOX",
          maxResults: "20",
        }),
      )) as { messages?: { id: string }[]; nextPageToken?: string };
      if (list.nextPageToken) throw Error("Unexpected volume for test run");
      return Promise.all(
        (list.messages ?? []).map(async ({ id }) => {
          if (!/^[a-z0-9_-]{1,128}$/i.test(id)) throw Error("Invalid Gmail ID");
          const m = (await readGmail(
            "messages/" + id,
            new URLSearchParams({ format: "full" }),
          )) as {
            id: string;
            threadId: string;
            labelIds: string[];
            payload: Part;
          };
          const header = (name: string) =>
            m.payload.headers?.find((h) => h.name.toLowerCase() === name)
              ?.value ?? "";
          const kind = customerMailKinds.find((k) =>
            header("subject").startsWith(customerPrefix(run, k)),
          );
          if (
            !kind ||
            !m.labelIds.includes("INBOX") ||
            address(header("from")) !== sender ||
            address(header("to")) !== customerMailbox
          )
            throw Error("Gmail receipt identity mismatch");
          return {
            kind,
            id: m.id,
            threadId: m.threadId,
            text: content(m.payload),
          };
        }),
      );
    },
  };
}
export type CustomerMail = Omit<
  Awaited<ReturnType<typeof openCustomerMail>>,
  "transport"
> & { transport: "gmail" | "fixture" };
export function rehearsalCustomerMail(): CustomerMail {
  const sender = "viewflo-synthetic@example.invalid";
  const receipts: Awaited<ReturnType<CustomerMail["receipts"]>> = [];
  return {
    sender,
    transport: "fixture",
    async send(run, kind, payload) {
      const body = providerPayload(run, kind, sender, payload);
      if (receipts.some((receipt) => receipt.kind === kind))
        throw Error("Duplicate fixture delivery");
      const id = "fixture-" + kind;
      receipts.push({
        kind,
        id,
        threadId: id,
        text: [body.text, body.html].filter(Boolean).join("\n"),
      });
      return { status: 200, id };
    },
    async receipts() {
      return [...receipts];
    },
  };
}
export function startCustomerDelivery({
  run,
  token,
  mail,
  attest,
  record,
}: {
  run: string;
  token: string;
  mail: CustomerMail;
  attest: () => Promise<void>;
  record: (name: string, value: object) => void;
}) {
  validateCustomerRun(run);
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error("Invalid local control token");
  let stopped = false,
    failed = false;
  let armed: CustomerMailKind | undefined;
  const seen = new Set<CustomerMailKind>();
  const accepted = new Set<CustomerMailKind>();
  const local = async (path: "/arm" | "/next" | "/finish", body?: object) => {
    const response = await fetch("http://127.0.0.1:65176" + path, {
      method: body ? "POST" : "GET",
      redirect: "error",
      signal: AbortSignal.timeout(6500),
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw Error("Local broker rejected operation");
    return response.json();
  };
  const worker = (async () => {
    while (!stopped) {
      if (!armed) {
        await delay(350);
        continue;
      }
      try {
        const job = (await local("/next")) as {
          kind: CustomerMailKind;
          key: string;
          payload: unknown;
        } | null;
        if (stopped) break;
        if (job) {
          if (
            job.kind !== armed ||
            !customerMailKinds.includes(job.kind) ||
            seen.has(job.kind) ||
            !/^[a-z0-9/_-]{1,160}$/i.test(job.key)
          )
            throw Error("Unexpected broker job");
          seen.add(job.kind);
          await attest();
          record("provider-" + job.kind + "-started", {
            kind: job.kind,
            idempotencyKey: run + "/" + job.kind,
          });
          const result = await mail.send(run, job.kind, job.payload);
          record("provider-" + job.kind + "-result", result);
          await local("/finish", { kind: job.kind, key: job.key, ...result });
          if (result.status !== 200)
            throw Error("Provider delivery needs reconciliation");
          accepted.add(job.kind);
          armed = undefined;
        }
      } catch {
        failed = true;
        break;
      }
      await delay(350);
    }
  })();
  const check = () => {
    if (stopped || failed) throw Error("Customer delivery stopped");
  };
  return {
    async arm(kind: CustomerMailKind) {
      check();
      await attest();
      if (armed) throw Error("Another customer delivery is armed");
      await local("/arm", { kind });
      armed = kind;
    },
    async verify(kind: CustomerMailKind, expected: string) {
      const expiry = Date.now() + 90000;
      while (Date.now() < expiry) {
        check();
        const entries = (await mail.receipts(run)).filter(
          (r) => r.kind === kind,
        );
        if (entries.length > 1) throw Error("Duplicate Gmail receipt");
        if (entries.length === 1 && accepted.has(kind)) {
          const [{ id, threadId, text }] = entries;
          if (!text.includes(expected)) throw Error("Gmail content mismatch");
          record(mail.transport + "-" + kind, { id, threadId, kind });
          return;
        }
        await delay(2000);
      }
      throw Error("Gmail receipt timed out");
    },
    async exactlyThree() {
      check();
      const receipts = await mail.receipts(run);
      if (
        receipts.length !== 3 ||
        !customerMailKinds.every(
          (k) =>
            accepted.has(k) &&
            receipts.filter((r) => r.kind === k).length === 1,
        )
      )
        throw Error("Run delivery totals did not reconcile");
    },
    async close() {
      stopped = true;
      await worker;
    },
  };
}
export type CustomerDelivery = ReturnType<typeof startCustomerDelivery>;

if (process.argv[2] === "--verify-customer-mailbox") {
  openSharedMailbox()
    .then(() =>
      console.log("Shared Gmail bot identity and read scope verified"),
    )
    .catch(() => {
      console.error("Shared Gmail verification failed");
      process.exitCode = 1;
    });
}
