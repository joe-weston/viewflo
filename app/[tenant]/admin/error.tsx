"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="portal-card">
      <h2>We couldn’t load this page.</h2>
      <p>
        Please try again. Your payment status has not been changed by this
        error.
      </p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
