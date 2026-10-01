import { SectionHeading } from "../ui/SectionHeading";
export function Testimonials() {
  return (
    <section id="reviews" className="scroll-mt-28 bg-cream">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="In their words"
          title="Read reviews from our customers"
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          {[
            {
              name: "Google",
              href: "https://www.google.com/maps?cid=10720248438238584178",
            },
            {
              name: "Yelp",
              href: "https://www.yelp.com/biz/pasadena-shades-and-shutters-montrose",
            },
          ].map((source) => (
            <a
              key={source.name}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-3xl border border-linen bg-white p-7 shadow-card md:p-9"
            >
              <h3 className="font-display text-2xl text-ink">
                Pasadena Shades &amp; Shutters on {source.name}
              </h3>
              <p className="mt-5 leading-relaxed text-stone">
                Visit our {source.name} profile to read customer reviews and
                view current ratings.
              </p>
              <span className="mt-7 text-sm font-medium text-brass">
                Read reviews on {source.name} ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
