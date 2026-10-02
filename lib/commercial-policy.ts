// Operator decisions, September 6, 2026. These do not establish customer consent.
export const HOSTING = Object.freeze({
  currency: "usd",
  unitAmount: 16900,
  interval: "month",
  intervalCount: 1,
  label: "Custom web hosting",
  paymentTiming: "Paid in advance for the next month",
  cancellation:
    "Cancel anytime before the next invoice. No 30-day notice is required.",
});
export const SERVICES = Object.freeze({
  total: 400000,
  currency: "usd",
  options: {
    lump_sum: { count: 1, amount: 400000 },
    four_monthly: { count: 4, amount: 100000 },
  },
});
export function isHostingPrice(price: {
  currency: string;
  unit_amount: number | null;
  recurring?: {
    interval: string;
    interval_count: number;
    usage_type?: string;
  } | null;
}) {
  return (
    price.currency === HOSTING.currency &&
    price.unit_amount === HOSTING.unitAmount &&
    price.recurring?.interval === HOSTING.interval &&
    price.recurring.interval_count === HOSTING.intervalCount &&
    price.recurring.usage_type === "licensed"
  );
}
export function billingTiming(
  periodEnd: number | null,
  paymentAttempt: number | null,
) {
  const format = (value: number | null) =>
    value ? new Date(value * 1000).toISOString() : null;
  return {
    periodEnd: format(periodEnd),
    paymentAttempt: format(paymentAttempt),
    invoiceCutoff: null,
  };
}
export function serviceEligibility(input: {
  sowId: string | null;
  accepted: boolean;
  conditionHash: string | null;
  conditionsFinalized?: boolean;
  approval: {
    sow_document_id: string;
    condition_sha256: string;
    evidence_reference: string;
    approved_at: string;
  } | null;
}) {
  if (!input.sowId) return "Awaiting final SOW";
  if (!input.accepted) return "Awaiting SOW acceptance";
  if (!input.conditionHash) return "Accepted · earning conditions not defined";
  if (!input.conditionsFinalized)
    return "Accepted · earning conditions remain draft";
  const a = input.approval;
  if (
    !a ||
    a.sow_document_id !== input.sowId ||
    a.condition_sha256 !== input.conditionHash ||
    !a.evidence_reference.trim() ||
    !Number.isFinite(Date.parse(a.approved_at))
  )
    return "Accepted · awaiting completion/growth approval";
  return "Eligibility recorded · invoice review required";
}
