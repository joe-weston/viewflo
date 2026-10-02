export function BillingLoading() {
  return (
    <section aria-busy="true" aria-label="Billing">
      <div className="billing-heading">
        <h2>Billing</h2>
        <p role="status">Loading your billing details…</p>
      </div>
      <div className="billing-summary" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="billing-skeleton">
            <span />
            <span />
          </div>
        ))}
      </div>
      <div className="portal-card billing-skeleton" aria-hidden="true">
        <span />
        <span />
      </div>
    </section>
  );
}
