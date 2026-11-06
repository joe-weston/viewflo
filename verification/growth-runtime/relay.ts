import net from "node:net";
import { spawn } from "node:child_process";
import { cleanBrowserEnv } from "./boundary";
import { context } from "./docker";

const destinations = [
  { port: 65170, host: "127.0.0.1", target: 65170 },
  { port: 65171, host: "127.0.0.1", target: 65171 },
  { port: 65174, host: "mail", target: 8025 },
] as const;
export const relayPorts = destinations.map(({ port }) => port);

// Docker exec supplies a byte stream to a fixed destination inside the owned
// gateway. No shell, destination supplied by the client, or HTTP data logging.
const forward = `const net=require('node:net');
const socket=net.connect({host:process.argv[1],port:Number(process.argv[2])});
socket.setTimeout(25000,()=>socket.destroy());
socket.on('error',()=>{process.exitCode=1;socket.destroy();});
socket.on('close',()=>process.stdin.destroy());
process.stdout.on('error',()=>socket.destroy());
process.stdin.pipe(socket);
socket.pipe(process.stdout);`;

export async function openLoopbackRelay(
  gatewayId: string,
  attest: () => void,
  customer = false,
) {
  if (!/^[a-f0-9]{64}$/.test(gatewayId))
    throw new Error("Invalid relay gateway");
  const servers: net.Server[] = [];
  const clients = new Set<net.Socket>();
  const close = async () => {
    for (const client of clients) client.destroy();
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
  };
  try {
    for (const { port, host, target } of customer
      ? [...destinations, { port: 65176, host: "127.0.0.1", target: 65175 }]
      : destinations) {
      const server = net.createServer((client) => {
        if (client.remoteAddress !== "127.0.0.1" || clients.size >= 32) {
          client.destroy();
          return;
        }
        try {
          attest();
        } catch {
          client.destroy();
          return;
        }
        clients.add(client);
        const processBridge = spawn(
          "docker",
          [
            "--context",
            context,
            "exec",
            "-i",
            gatewayId,
            "node",
            "-e",
            forward,
            host,
            String(target),
          ],
          {
            env: {
              ...cleanBrowserEnv(),
              USERPROFILE: process.env.USERPROFILE,
              NODE_ENV: "test",
            },
            windowsHide: true,
            stdio: ["pipe", "pipe", "ignore"],
          },
        );
        client.setTimeout(30_000, () => client.destroy());
        client.on("error", () => client.destroy());
        client.on("close", () => {
          clients.delete(client);
          processBridge.kill();
        });
        processBridge.on("error", () => client.destroy());
        processBridge.stdin.on("error", () => client.destroy());
        processBridge.stdout.on("error", () => client.destroy());
        processBridge.on("close", (code) => {
          if (code !== 0) client.destroy();
        });
        client.pipe(processBridge.stdin);
        processBridge.stdout.pipe(client);
      });
      servers.push(server);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen({ port, host: "127.0.0.1", exclusive: true }, resolve);
      });
    }
    return close;
  } catch {
    await close();
    throw new Error("Loopback relay bind failed");
  }
}
