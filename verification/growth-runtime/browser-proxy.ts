import http, { type IncomingHttpHeaders } from "node:http";
import { endpoints, localUrl } from "./boundary";

export type ProxyFault =
  | "origin-denied"
  | "attestation"
  | "redirect-denied"
  | "connect-denied"
  | "upgrade-denied"
  | "upstream-timeout"
  | "upstream-transport";

export type ProxyLocation = {
  route: "api" | "analytics" | "static" | "app";
  stage: "waiting-for-headers" | "reading-response";
  elapsedMs: number;
  reusedSocket: boolean;
  transportCode?: "ECONNRESET" | "EPIPE" | "ECONNREFUSED";
};
function forwardedHeaders(headers: IncomingHttpHeaders) {
  const copy = { ...headers };
  for (const name of headers.connection?.split(",") ?? [])
    delete copy[name.trim().toLowerCase()];
  for (const name of [
    "connection",
    "proxy-connection",
    "proxy-authorization",
    "proxy-authenticate",
    "keep-alive",
    "transfer-encoding",
    "upgrade",
    "trailer",
    "te",
  ])
    delete copy[name];
  return copy;
}

/** A per-run HTTP-only proxy that also sees redirected browser requests. */
export async function openBrowserProxy(
  attest: () => Promise<void>,
  fault: (kind: ProxyFault, location?: ProxyLocation) => void,
) {
  const origins = [endpoints.app, endpoints.api];
  // Each new upstream socket starts a Docker exec relay process. Keep a small,
  // reusable pool for concurrent page assets and stop it with the browser proxy.
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 6,
    maxFreeSockets: 2,
  });
  const server = http.createServer(async (request, response) => {
    let url: URL;
    try {
      url = localUrl(request.url ?? "", origins);
    } catch {
      fault("origin-denied");
      response.writeHead(403).end();
      return;
    }
    try {
      await attest();
    } catch {
      fault("attestation");
      response.writeHead(503).end();
      return;
    }
    // The scripted browser follows explicit user actions. Drop only speculative
    // reads before they can occupy an isolated relay connection.
    if (
      request.method === "GET" &&
      (request.headers["next-router-prefetch"] === "1" ||
        Boolean(request.headers["next-router-segment-prefetch"]) ||
        request.headers.purpose === "prefetch" ||
        request.headers["sec-purpose"] === "prefetch")
    ) {
      response.writeHead(503, { "cache-control": "no-store" }).end();
      return;
    }
    const headers = forwardedHeaders(request.headers);
    headers.host = url.host;
    // Dynamic pages and form submissions may read several isolated services.
    // Keep the per-request idle timeout below the Docker relay deadline.
    const analytics =
      url.origin === endpoints.app &&
      request.method === "GET" &&
      /^\/[a-z0-9-]+\/admin\/analytics\/?$/.test(url.pathname);
    const started = performance.now();
    const route =
      url.origin === endpoints.api
        ? "api"
        : analytics
          ? "analytics"
          : url.pathname.startsWith("/_next/static/")
            ? "static"
            : "app";
    let stage: ProxyLocation["stage"] = "waiting-for-headers";
    const failure = (kind: ProxyFault, error?: NodeJS.ErrnoException) => {
      const code = error?.code;
      fault(kind, {
        route,
        stage,
        elapsedMs: Math.round(performance.now() - started),
        reusedSocket: upstream.reusedSocket,
        ...(code === "ECONNRESET" || code === "EPIPE" || code === "ECONNREFUSED"
          ? { transportCode: code }
          : {}),
      });
    };
    const upstream = http.request(
      url,
      {
        method: request.method,
        headers,
        timeout: route === "analytics" || route === "app" ? 22_000 : 10_000,
        agent: route === "static" ? agent : false,
      },
      (reply) => {
        stage = "reading-response";
        const location = reply.headers.location;
        if (location) {
          try {
            if (/[\\\x00-\x20\x7f]/.test(location) || location.startsWith("//"))
              throw new Error("Invalid redirect");
            const absolute = /^[a-z][a-z0-9+.-]*:/i.test(location)
              ? location
              : new URL(location, url).href;
            localUrl(absolute, origins);
          } catch {
            fault("redirect-denied");
            reply.destroy();
            response.writeHead(403).end();
            return;
          }
        }
        response.writeHead(
          reply.statusCode ?? 502,
          forwardedHeaders(reply.headers),
        );
        reply.on("error", () => {
          if (response.destroyed || response.writableEnded) return;
          failure("upstream-transport");
          response.destroy();
        });
        reply.pipe(response);
      },
    );
    let cancelled = false;
    let timedOut = false;
    upstream.on("timeout", () => {
      timedOut = true;
      upstream.destroy(new Error("Local upstream timed out"));
    });
    upstream.on("error", (error) => {
      if (cancelled || response.destroyed || response.writableEnded) return;
      failure(timedOut ? "upstream-timeout" : "upstream-transport", error);
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    const cancel = () => {
      if (response.writableFinished) return;
      cancelled = true;
      upstream.destroy();
    };
    request.on("aborted", cancel);
    response.on("close", cancel);
    request.pipe(upstream);
  });
  server.on("connect", (_request, socket) => {
    fault("connect-denied");
    socket.destroy();
  });
  server.on("upgrade", (_request, socket) => {
    fault("upgrade-denied");
    socket.destroy();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Proxy binding failed");
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        agent.destroy();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
