import type { ReactNode } from "react";
import type { BillingSnapshot } from "../../lib/billing-data";
import { money, billingDate } from "../../lib/billing-data";

export function BillingOverview({
  snapshot,
  links,
  termsStatus,
  privacyStatus,
  actions,
}: {
  snapshot: BillingSnapshot;
  links: { billing: string; terms: string; privacy: string };
  termsStatus: string;
  privacyStatus: string;
  actions: ReactNode;
}) {
  return (
    <>
      <div className="billing-heading">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h2>Billing</h2>
          <p className="portal-muted">
            Your subscription, payments and agreements in one place.
          </p>
        </div>
        <span className="billing-secure">Secure billing by Stripe</span>
      </div>
      <dl className="billing-summary">
        <div>
          <dt>Subscription amount</dt>
          <dd>
            {snapshot.amount === null
              ? "$169"
              : money(snapshot.amount, snapshot.currency)}
            <span>per month · paid in advance</span>
          </dd>
        </div>
        <div>
          <dt>{snapshot.endsAt ? "Subscription ends" : "Next billing date"}</dt>
          <dd className="billing-date">
            {snapshot.available
              ? billingDate(snapshot.endsAt ?? snapshot.nextBillingAt)
              : "Unavailable"}
            <span>
              {snapshot.nextBillingAt || snapshot.endsAt
                ? "UTC · from Stripe"
                : "Confirmed when billing is ready"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Subscription status</dt>
          <dd className="billing-date">
            <span
              className={`billing-status${snapshot.status === "active" ? " is-paid" : ""}`}
            >
              {snapshot.status}
            </span>
            <span>
              {snapshot.available
                ? "Current provider status"
                : "Awaiting account configuration"}
            </span>
          </dd>
        </div>
      </dl>
      {!snapshot.available && (
        <p role="status" className="portal-notice">
          Billing details are unavailable. You can review your agreements below
          and try again later.
        </p>
      )}
      {snapshot.paymentAttemptAt !== null && (
        <p className="portal-muted">
          Next invoice payment attempt: {billingDate(snapshot.paymentAttemptAt)}{" "}
          (UTC). This is separate from your cancellation cutoff.
        </p>
      )}
      <section className="portal-card billing-payment">
        <div>
          <h3>Payment method</h3>
          <p className="portal-muted">
            Your payment details are securely stored with Stripe. Open the
            payment portal to view or update your card.
          </p>
        </div>
        <div>{actions}</div>
      </section>
      <section className="portal-card billing-history">
        <div className="billing-section-heading">
          <h3>Invoice &amp; payment history</h3>
          <span className="portal-muted">Most recent first</span>
        </div>
        {!snapshot.available ? (
          <p>
            Invoice history couldn’t be loaded.{" "}
            <a href={links.billing}>Try again</a>.
          </p>
        ) : !snapshot.invoices.length ? (
          <p className="billing-empty">No issued invoices on this page.</p>
        ) : (
          <ul className="billing-invoices">
            {snapshot.invoices.map((invoice) => (
              <li key={invoice.id}>
                <div className="billing-invoice-name">
                  <strong>{invoice.number ?? "Invoice"}</strong>
                  <span>{billingDate(invoice.created)} · UTC</span>
                  {invoice.paidAt ? (
                    <span>Paid {billingDate(invoice.paidAt)}</span>
                  ) : invoice.dueAt ? (
                    <span>Due {billingDate(invoice.dueAt)}</span>
                  ) : null}
                </div>
                <div className="billing-invoice-amount">
                  <strong>{money(invoice.total, invoice.currency)}</strong>
                  <span>{money(invoice.paid, invoice.currency)} paid</span>
                </div>
                <span
                  className={`billing-status${invoice.status === "paid" ? " is-paid" : ""}`}
                >
                  {invoice.status === "open"
                    ? "Awaiting payment"
                    : invoice.status}
                </span>
                <div className="billing-invoice-links">
                  {invoice.url && (
                    <a
                      href={invoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View invoice
                      <span className="sr-only">
                        {" "}
                        {invoice.number ?? ""} (opens a new tab)
                      </span>
                    </a>
                  )}
                  {invoice.pdf && (
                    <a
                      href={invoice.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                      <span className="sr-only">
                        {" "}
                        {invoice.number ?? ""} (opens a new tab)
                      </span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="billing-pagination">
          {snapshot.nextCursor && (
            <a
              href={`${links.billing}?after=${encodeURIComponent(snapshot.nextCursor)}`}
            >
              Older invoices →
            </a>
          )}
          <a href={links.billing}>Latest invoices</a>
        </div>
      </section>
      <section className="portal-card billing-agreements">
        <h3>Terms &amp; agreements</h3>
        <p className="portal-muted">
          Review the policies for your service and your recorded acceptance.
        </p>
        <ul>
          <li>
            <a href={links.terms}>
              Terms &amp; Conditions <span aria-hidden="true">↗</span>
            </a>
            <span>{termsStatus}</span>
          </li>
          <li>
            <a href={links.privacy}>
              Privacy Policy <span aria-hidden="true">↗</span>
            </a>
            <span>{privacyStatus}</span>
          </li>
        </ul>
      </section>
    </>
  );
}
