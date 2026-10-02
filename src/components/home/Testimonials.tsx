import { QuoteIcon, StarIcon } from "lucide-react";
import { customerReviews } from "../../data/customer-reviews";
import { SectionHeading } from "../ui/SectionHeading";

function ReviewAttribution({
  review,
}: {
  review: (typeof customerReviews)[number];
}) {
  return (
    <figcaption className="mt-auto pt-5 text-sm">
      <p className="font-medium text-ink">{review.name}</p>
      <a
        href={review.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read ${review.name}'s full review on Google (opens in a new tab)`}
        className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Read full review on Google ↗
      </a>
    </figcaption>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: rating }, (_, index) => (
        <StarIcon
          key={index}
          className="h-3.5 w-3.5 fill-brass text-brass"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  const [featured, ...rest] = customerReviews;
  return (
    <section id="reviews" className="scroll-mt-28 bg-cream">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="In their words"
          title="What our customers say"
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <figure className="flex flex-col rounded-3xl border border-linen bg-white p-7 shadow-card md:p-9">
            <QuoteIcon className="h-7 w-7 text-brass/40" aria-hidden="true" />
            <blockquote
              cite={featured.href}
              className="mt-5 font-display text-xl leading-relaxed text-ink md:text-2xl md:leading-[1.45]"
            >
              {featured.quote}
            </blockquote>
            <div className="mt-6">
              <ReviewStars rating={featured.rating} />
            </div>
            <ReviewAttribution review={featured} />
          </figure>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {rest.map((review) => (
              <figure
                key={review.href}
                className="flex flex-col rounded-3xl border border-linen bg-sand/60 p-6"
              >
                <ReviewStars rating={review.rating} />
                <blockquote
                  cite={review.href}
                  className="mt-3 text-[0.95rem] leading-relaxed text-ink/85"
                >
                  {review.quote}
                </blockquote>
                <ReviewAttribution review={review} />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
