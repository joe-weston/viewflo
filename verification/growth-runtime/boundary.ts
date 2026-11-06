import { spawn } from "node:child_process";
import type { BrowserContext, Page } from "playwright";

export const endpoints = {
  app: "http://127.0.0.1:65170",
  api: "http://127.0.0.1:65171",
  mail: "http://127.0.0.1:65174",
} as const;

export function localUrl(raw: string, origins: readonly string[]) {
  if (/[\\\x00-\x20\x7f]/.test(raw)) throw new Error("Invalid local URL");
  const authority = /^http:\/\/127\.0\.0\.1:[0-9]+(?=\/|\?|#|$)/.exec(raw)?.[0];
  if (!authority || !origins.includes(authority))
    throw new Error("Origin denied");
  const url = new URL(raw);
  if (url.origin !== authority || url.hash || url.username || url.password)
    throw new Error("Invalid local URL");
  return url;
}

export function localFetch(
  attest: () => Promise<void>,
  origin: string,
): typeof fetch {
  return async (input, init) => {
    const url = localUrl(input instanceof Request ? input.url : String(input), [
      origin,
    ]);
    await attest();
    return fetch(input instanceof Request ? input : url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  };
}

export function capturedCallback(message: string, tenant: string) {
  const links =
    message
      .replaceAll("&amp;", "&")
      .match(/http:\/\/127\.0\.0\.1:65170\/auth\/callback\/?\?[^\s<>"']+/g) ??
    [];
  const unique = [...new Set(links)];
  if (unique.length !== 1) throw new Error("Ambiguous or missing callback");
  const url = localUrl(unique[0], [endpoints.app]);
  if (
    url.pathname.replace(/\/$/, "") !== "/auth/callback" ||
    [...url.searchParams.keys()].sort().join() !== "tenant,token_hash,type" ||
    url.searchParams.get("tenant") !== tenant ||
    url.searchParams.get("type") !== "email" ||
    !url.searchParams.get("token_hash")
  )
    throw new Error("Invalid callback");
  return url;
}

export function cleanBrowserEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const names = [
    "PATH",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "LOCALAPPDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
  ];
  return Object.fromEntries(
    names.flatMap((name) => (source[name] ? [[name, source[name]]] : [])),
  );
}

/** The mandatory proxy must fence every hop, including redirects Playwright does not re-route. */
export async function fenceContext(
  context: BrowserContext,
  denied: () => void,
) {
  await context.route("**/*", (route) => {
    try {
      localUrl(route.request().url(), [endpoints.app, endpoints.api]);
    } catch {
      denied();
      return route.abort();
    }
    return route.continue();
  });
  await context.routeWebSocket("**/*", (socket) => {
    denied();
    return socket.close();
  });
}

const masks = [
  "input[type=password]",
  "input[autocomplete=one-time-code]",
  "input[name*=token i]",
  "input[name*=password i]",
  "input[type=url]",
  "input[name*=url i]",
  "input[name*=destination i]",
  "input[value^='http:']",
  "input[value^='https:']",
  "textarea[name*=token i]",
  "textarea[name*=url i]",
  "[data-private]",
  "[data-sensitive]",
  "a[href*='token' i]",
  "a[href*='signature' i]",
  "a[href*='/auth/callback' i]",
  "a[href*='access_token' i]",
];
const sensitiveText =
  /(?:https?:\/\/|\bwww\.|(?:access_token|refresh_token|token_hash|signature|code)=|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;

export async function captureAdmin(
  page: Page,
  slug: string,
  scope?: "synthetic-only",
) {
  const url = localUrl(page.url(), [endpoints.app]);
  const admin = `/${slug}/admin`;
  if (
    url.search ||
    (url.pathname !== admin && !url.pathname.startsWith(`${admin}/`))
  )
    throw new Error("Capture requires clean admin URL");
  const suffix = url.pathname.slice(admin.length).replace(/\/$/, "");
  if (
    suffix !== "" &&
    suffix !== "/website" &&
    suffix !== "/billing" &&
    !["/analytics", "/quotes", "/reviews"].includes(suffix) &&
    !/^\/leads\/[a-f0-9-]{36}$/.test(suffix)
  )
    throw new Error("No approved capture route");
  if (scope !== "synthetic-only")
    throw new Error("Synthetic capture scope required");
  if (
    !(await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ))
  )
    throw new Error("Viewport overflow");
  return page.screenshot({
    fullPage: true,
    mask: [
      ...masks.map((selector) => page.locator(selector)),
      page.getByText(sensitiveText),
    ],
    maskColor: "#667085",
  });
}

/** Never stream or persist child output. Only the caller can report fixed status. */
export async function boundedChild(
  executable: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  budget: { remaining: number },
  timeoutMs: number,
) {
  const cap = 256 * 1024;
  const child = spawn(executable, args, {
    env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise<"pass" | "child-failed" | "output-limit" | "timeout">(
    (resolve) => {
      const output: Buffer[] = [];
      let size = 0;
      let failure: "output-limit" | "timeout" | undefined;
      const receive = (chunk: Buffer) => {
        budget.remaining = Math.max(-1, budget.remaining - chunk.length);
        if (failure) return;
        size += chunk.length;
        if (size > cap || budget.remaining < 0) {
          output.length = 0;
          failure = "output-limit";
          child.kill();
          return;
        }
        output.push(chunk);
      };
      child.stdout.on("data", receive);
      child.stderr.on("data", receive);
      const timer = setTimeout(() => {
        failure ??= "timeout";
        child.kill();
      }, timeoutMs);
      child.once("error", () => {
        clearTimeout(timer);
        output.length = 0;
        resolve(failure ?? "child-failed");
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        output.length = 0;
        resolve(failure ?? (code === 0 ? "pass" : "child-failed"));
      });
    },
  );
}
