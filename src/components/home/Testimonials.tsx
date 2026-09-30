import React from "react";
import { QuoteIcon } from "lucide-react";
import { testimonials } from "../../data/content";
import { SectionHeading } from "../ui/SectionHeading";

export function Testimonials() {
  const [featured, ...rest] = testimonials;

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="In their words"
          title="What our customers say"
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <figure className="flex flex-col rounded-3xl border border-linen bg-white p-7 shadow-card md:p-9">
            <QuoteIcon className="h-7 w-7 text-brass/40" aria-hidden="true" />

            <blockquote className="mt-5 font-display text-xl leading-relaxed text-ink md:text-2xl md:leading-[1.45]">
              {featured.quote}
            </blockquote>
            <figcaption className="mt-auto pt-7">
              <p className="text-sm font-medium text-ink">{featured.name}</p>
              <p className="text-sm text-stone">{featured.city}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-stone/70">
                {featured.project}
              </p>
            </figcaption>
          </figure>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {rest.map((testimonial) => (
              <figure
                key={testimonial.id}
                className="flex flex-col rounded-3xl border border-linen bg-sand/60 p-6"
              >
                <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="mt-auto pt-5 text-sm">
                  <span className="font-medium text-ink">
                    {testimonial.name}
                  </span>
                  <span className="text-stone"> · {testimonial.city}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

