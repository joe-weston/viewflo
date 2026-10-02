import {
  assertMode,
  assertSubscription,
  type BillingMode,
} from "./billing-mode";
import type Stripe from "stripe";
import { isHostingPrice } from "./commercial-policy";
import { invoiceCursor } from "./portal-urls";

export type BillingInvoice = {
  id: string;
  number: string | null;
  created: number;
  total: number;
  paid: number;
  currency: string;
  status: string;
  paidAt: number | null;
  dueAt: number | null;
  url: string | null;
  pdf: string | null;
};
export type BillingSnapshot = {
  available: boolean;
  status: string;
  amount: number | null;
  currency: string;
  nextBillingAt: number | null;
  endsAt: number | null;
  paymentAttemptAt: number | null;
  invoices: BillingInvoice[];
  nextCursor?: string;
  canCheckout: boolean;
  canManage: boolean;
};
export function unavailableBilling(): BillingSnapshot {
  return {
    available: false,
    status: "Unavailable",
    amount: null,
    currency: "usd",
    nextBillingAt: null,
    endsAt: null,
    paymentAttemptAt: null,
    invoices: [],
    canCheckout: false,
    canManage: false,
  };
}

function stripeLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
function sameCustomer(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  id: string,
) {
  return (typeof value === "string" ? value : value?.id) === id;
}

/** Server callers supply only the verified tenant's customer mapping. No browser customer IDs. */
export async function readBillingSnapshot(
  stripe: Stripe,
  customer: string | null,
  cursorValue?: unknown,
  mode: BillingMode = "test",
  mapping?: { tenant: string; price: string },
): Promise<BillingSnapshot> {
  const cursor = invoiceCursor(cursorValue);
  const result: BillingSnapshot = {
    ...unavailableBilling(),
    available: true,
    status: "No subscription",
    canCheckout: true,
  };
  if (!customer) {
    if (cursor) throw new Error("Invoice account unavailable");
    return result;
  }
  if (cursor) {
    const anchor = await stripe.invoices.retrieve(cursor);
    if (
      anchor.livemode !== (mode === "live") ||
      !sameCustomer(anchor.customer, customer)
    )
      throw new Error("Invoice account mismatch");
  }
  const [subscriptions, invoices] = await Promise.all([
    stripe.subscriptions.list({ customer, status: "all", limit: 100 }),
    stripe.invoices.list({
      customer,
      limit: 10,
      ...(cursor ? { starting_after: cursor } : {}),
    }),
  ]);
  if (subscriptions.has_more) throw new Error("Subscription review required");
  if (mapping)
    for (const subscription of subscriptions.data)
      assertSubscription(subscription, { ...mapping, mode, customer });
  if (
    subscriptions.data.some(
      (s) =>
        s.livemode !== (mode === "live") || !sameCustomer(s.customer, customer),
    )
  )
    throw new Error("Subscription account mismatch");
  const active = subscriptions.data.filter(
    (s) => !["canceled", "incomplete_expired"].includes(s.status),
  );
  if (active.length > 1) throw new Error("Subscription review required");
  const current = active[0];
  result.canManage = true;
  result.canCheckout = !current;
  if (current) {
    assertMode(current, mode);
    const item = current.items.data[0];
    if (
      current.items.has_more ||
      current.items.data.length !== 1 ||
      item.quantity !== 1 ||
      item.price.livemode !== (mode === "live") ||
      !isHostingPrice(item.price)
    )
      throw new Error("Subscription price review required");
    result.status = current.status.replaceAll("_", " ");
    result.amount = item.price.unit_amount;
    result.currency = item.price.currency;
    if (current.cancel_at_period_end || current.cancel_at)
      result.endsAt = current.cancel_at ?? item.current_period_end;
    else if (current.status === "active")
      result.nextBillingAt = item.current_period_end;
    if (current.latest_invoice) {
      const invoice =
        typeof current.latest_invoice === "string"
          ? await stripe.invoices.retrieve(current.latest_invoice)
          : current.latest_invoice;
      if (
        invoice.livemode !== (mode === "live") ||
        !sameCustomer(invoice.customer, customer)
      )
        throw new Error("Invoice account mismatch");
      result.paymentAttemptAt = invoice.next_payment_attempt;
    }
  }
  if (
    invoices.data.some(
      (i) =>
        i.livemode !== (mode === "live") || !sameCustomer(i.customer, customer),
    )
  )
    throw new Error("Invoice account mismatch");
  result.invoices = invoices.data
    .filter((i) => i.status && i.status !== "draft")
    .map((i) => ({
      id: i.id,
      number: i.number,
      created: i.created,
      total: i.total,
      paid: i.amount_paid,
      currency: i.currency,
      status: i.status!,
      paidAt: i.status_transitions.paid_at,
      dueAt: i.due_date,
      url: stripeLink(i.hosted_invoice_url),
      pdf: stripeLink(i.invoice_pdf),
    }));
  result.nextCursor = invoices.has_more ? invoices.data.at(-1)?.id : undefined;
  return result;
}

export function money(amount: number, currency: string) {
  // Only USD hosting is configured; invoice formatting respects the provider currency.
  const digits =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount / 10 ** digits,
  );
}
export function billingDate(seconds: number | null) {
  return seconds === null
    ? "Not scheduled"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(seconds * 1000));
}
