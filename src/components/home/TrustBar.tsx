import React from "react";
import { trustSignals } from "../../data/content";

export function TrustBar() {
  return (
    <section
      aria-label="Local trust signals"
      className="border-y border-linen bg-sand"
    >
      <div className="mx-auto max-w-content px-5 py-6 md:px-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex flex-col">
              <dt className="sr-only">{signal.label}</dt>
              <dd className="font-display text-xl font-semibold text-ink">
                {signal.value}
              </dd>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-stone">
                {signal.label}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

