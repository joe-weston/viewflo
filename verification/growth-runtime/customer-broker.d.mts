import type { Server } from "node:http";
export function startCustomerBroker(
  mailToken: string,
  controlToken: string,
  port?: number,
): Promise<Server>;
