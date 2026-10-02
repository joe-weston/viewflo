import { SectionHeading } from "../ui/SectionHeading";
import { googleReviewAction, reviewSnapshot } from "../../data/review-snapshot";
export function Testimonials() {
  return (
    <section id="reviews" className="scroll-mt-28 bg-cream">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="In their words"
          title="Read reviews from our customers"
        />
        <p className="mt-4 text-sm text-stone">
          Static snapshot captured {reviewSnapshot.captured}. Each platform has
          its own rating and total. Google dates are the relative labels
          reported on that date.
        </p>
        <a
          href={googleReviewAction}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center text-brass underline"
        >
          Write a Google review ↗
        </a>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {reviewSnapshot.sources.map((source) => (
            <article
              key={source.name}
              className="rounded-3xl border border-linen bg-white p-7 shadow-card"
            >
              <h3 className="font-display text-2xl">
                {source.name}: {source.rating} out of 5
              </h3>
              <p className="mt-2 text-stone">{source.count}</p>
              <ul className="mt-6 space-y-6">
                {source.reviews.map((review) => (
                  <li
                    key={review.author}
                    className="border-t border-linen pt-5"
                  >
                    <blockquote className="text-lg leading-relaxed">
                      “{review.excerpt}”
                    </blockquote>
                    <p className="mt-3 font-medium">{review.author}</p>
                    <p className="text-sm text-stone">
                      {review.rating} out of 5 · {review.date}
                    </p>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center text-sm text-brass underline"
                    >
                      Read on {source.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
