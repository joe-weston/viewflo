import { isHostingPrice } from "./commercial-policy";
export type BillingMode = "test" | "live";
export function billingMode(
  env: Record<string, string | undefined> = process.env,
): BillingMode {
  const mode = env.STRIPE_MODE ?? "test";
  if (mode !== "test" && mode !== "live")
    throw new Error("Invalid billing mode");
  if (mode === "live" && env.STRIPE_LIVE_BILLING_ENABLED !== "true")
    throw new Error("Live billing awaiting approval");
  return mode;
}
export function billingConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const mode = billingMode(env);
  // Legacy names are test-only fallbacks. A live configuration must be explicit.
  const prefix = mode === "live" ? "STRIPE_LIVE_" : "STRIPE_TEST_";
  const get = (name: string) =>
    env[prefix + name] || (mode === "test" ? env["STRIPE_" + name] : undefined);
  const key = get("SECRET_KEY");
  const account = get("EXPECTED_ACCOUNT_ID");
  if (
    !key?.startsWith(mode === "live" ? "sk_live_" : "sk_test_") ||
    !account?.startsWith("acct_")
  )
    throw new Error("Billing configuration unavailable");
  return {
    mode,
    key,
    account,
    webhookSecret: get("WEBHOOK_SECRET"),
    portalConfiguration: get("PORTAL_CONFIGURATION_ID"),
  };
}
export function assertMode(object: { livemode: boolean }, mode: BillingMode) {
  if (object.livemode !== (mode === "live"))
    throw new Error("Billing mode mismatch");
}
export function assertCustomer(
  object: {
    id: string;
    deleted?: boolean | void;
    livemode?: boolean;
    metadata?: { [key: string]: string };
  },
  id: string,
  tenant: string,
  mode: BillingMode,
) {
  if (
    object.deleted ||
    object.id !== id ||
    object.metadata?.tenant_id !== tenant ||
    object.livemode !== (mode === "live")
  )
    throw new Error("Billing customer mismatch");
}
export function assertSubscription(
  object: {
    livemode: boolean;
    customer: string | { id: string };
    metadata: { [key: string]: string };
    items: {
      has_more: boolean;
      data: Array<{
        quantity?: number;
        price: {
          id: string;
          livemode: boolean;
          currency: string;
          unit_amount: number | null;
          recurring?: {
            interval: string;
            interval_count: number;
            usage_type?: string;
          } | null;
        };
      }>;
    };
  },
  expected: {
    mode: BillingMode;
    customer: string;
    tenant: string;
    price: string;
  },
) {
  assertMode(object, expected.mode);
  if (
    (typeof object.customer === "string"
      ? object.customer
      : object.customer.id) !== expected.customer ||
    object.metadata.tenant_id !== expected.tenant ||
    object.items.has_more ||
    object.items.data.length !== 1
  )
    throw new Error("Subscription ownership mismatch");
  const item = object.items.data[0];
  assertMode(item.price, expected.mode);
  if (
    item.quantity !== 1 ||
    item.price.id !== expected.price ||
    !isHostingPrice(item.price)
  )
    throw new Error("Subscription price mismatch");
}
