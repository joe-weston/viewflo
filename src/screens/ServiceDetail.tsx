import Image from "next/image";
import React from "react";
import { TenantLink as Link } from "../components/TenantLink";
import { ArrowLeftIcon, ArrowUpRightIcon, CheckIcon } from "lucide-react";
import { getServiceBySlug, services } from "../data/services";
import { Button } from "../components/ui/Button";

export function ServiceDetail({ slug }: { slug: string }) {
  const service = slug ? getServiceBySlug(slug) : undefined;

  if (!service) {
    return (
      <div className="mx-auto max-w-content px-5 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">
          We don&apos;t have a page for that treatment
        </h1>
        <p className="mt-3 text-stone">
          Take a look at what we do make, or just ask us directly.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/pasadena-shades-and-shutters/#services">
            See all services
          </Button>
          <Button
            href="/pasadena-shades-and-shutters/consultation"
            variant="secondary"
          >
            Ask about it
          </Button>
        </div>
      </div>
    );
  }

  const others = services.filter((item) => item.slug !== service.slug);

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-content px-5 py-10 md:px-6 md:py-14">
        <Link
          href="/pasadena-shades-and-shutters/#services"
          className="inline-flex items-center gap-2 text-sm text-stone transition-colors duration-150 ease-out hover:text-ink"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          All services
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-brass">
              {service.tagline}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.1] text-ink md:text-5xl">
              {service.name}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone">
              {service.blurb}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-linen py-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-stone/70">
                  Lead time
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold text-ink">
                  {service.leadTime}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-stone/70">
                  Best for
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink">
                  {service.bestFor}
                </dd>
              </div>
            </dl>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {service.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex gap-2.5 text-[0.95rem] leading-relaxed text-stone"
                >
                  <CheckIcon
                    className="mt-1 h-4 w-4 shrink-0 text-brass"
                    aria-hidden="true"
                  />

                  {highlight}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/pasadena-shades-and-shutters/consultation"
                size="lg"
              >
                Request a Consultation
              </Button>
              <Button
                href="/pasadena-shades-and-shutters/photo-intake"
                variant="secondary"
                size="lg"
              >
                Send Photos of Your Windows
              </Button>
            </div>
          </div>

          <div>
            <Image
              width={1200}
              height={900}
              src={service.image}
              alt={`${service.name} window treatment`}
              className="w-full rounded-3xl object-cover shadow-card"
            />

            <aside className="mt-5 rounded-2xl border border-linen bg-sand/60 p-5">
              <p className="text-[0.95rem] leading-relaxed text-ink/85">
                Every room has different light and privacy needs. Discuss
                materials, measurements, and timing with Robin before deciding.
              </p>
              <Link
                href="/pasadena-shades-and-shutters/consultation"
                className="mt-3 inline-block text-sm text-brass"
              >
                Request details →
              </Link>
            </aside>
          </div>
        </div>

        <section aria-label="Product options" className="mt-12 space-y-8">
          {(slug === "blinds"
            ? [
                {
                  id: "wood-blinds",
                  title: "Wood blinds",
                  text: "Natural wood blinds bring warmth and adjustable light control to a room.",
                },
                {
                  id: "faux-wood-blinds",
                  title: "Faux wood blinds",
                  text: "Faux wood blinds offer a wood-like appearance and moisture resistance for kitchens and bathrooms.",
                },
              ]
            : slug === "shutters"
              ? [
                  {
                    id: "polycore-shutters",
                    title: "Polycore shutters",
                    text: "Polycore shutters combine a durable synthetic construction with adjustable louvers for privacy and light control.",
                  },
                ]
              : slug === "shades"
                ? [
                    {
                      id: "woven-wood-shades",
                      title: "Woven wood shades",
                      text: "Woven wood shades use natural woven materials for texture and softly filtered light. Discuss lining options for privacy.",
                    },
                  ]
                : []
          ).map((option) => (
            <article
              key={option.id}
              id={option.id}
              className="scroll-mt-28 rounded-2xl border border-linen p-6"
            >
              <h2 className="font-display text-2xl">{option.title}</h2>
              <p className="mt-3 text-stone">{option.text}</p>
            </article>
          ))}
        </section>
        <section className="mt-16 border-t border-linen pt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Often paired with
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((item) => (
              <Link
                key={item.slug}
                href={`/pasadena-shades-and-shutters/services/${item.slug}`}
                className="group flex flex-col rounded-2xl border border-linen bg-white p-5 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-walnut/30"
              >
                <h3 className="font-display text-lg font-semibold text-ink">
                  {item.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone">
                  {item.tagline}
                </p>
                <span className="mt-auto pt-4 flex items-center gap-1 text-sm text-brass">
                  View
                  <ArrowUpRightIcon
                    className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
