import Stripe from "stripe";
import { assertMode, type billingConfig } from "./billing-mode";
/** Pure signature/mode boundary; no provider reads or mutations. */
export function verifyBillingEvent(
  body: string,
  signature: string | null,
  config: ReturnType<typeof billingConfig>,
) {
  if (!signature || !config.webhookSecret) throw new Error("Unavailable");
  const event = Stripe.webhooks.constructEvent(
    body,
    signature,
    config.webhookSecret,
  );
  assertMode(event, config.mode);
  if (event.account && event.account !== config.account)
    throw new Error("Account mismatch");
  return event;
}
