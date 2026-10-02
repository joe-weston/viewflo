import Image from "next/image";
import React from "react";
import { TenantLink as Link } from "../TenantLink";
import { ArrowUpRightIcon } from "lucide-react";
import { services } from "../../data/services";
import { SectionHeading } from "../ui/SectionHeading";

export function ServiceCategories() {
  const [lead, ...rest] = services;

  return (
    <div id="services" className="scroll-mt-28">
      <section id="what_we_make" className="scroll-mt-28 bg-cream">
        <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="What we make"
              title="Five ways to dress a window — one person who knows which is right"
              description="Every product here is made to your measurements. The consultation is mostly about narrowing down which of these belongs in which room."
            />

            <Link
              href="/pasadena-shades-and-shutters/consultation"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brass transition-colors duration-150 ease-out hover:text-brass-deep"
            >
              Not sure yet? Let&apos;s talk it through
              <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <Link
              href={`/pasadena-shades-and-shutters/services/${lead.slug}`}
              className="group relative flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-3xl bg-walnut lg:row-span-2 lg:min-h-[34rem]"
            >
              <Image
                width={1200}
                height={900}
                src={lead.image}
                alt={`${lead.name} installed on a residential window`}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />

              <div className="absolute inset-0 bg-ink/45" aria-hidden="true" />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 bg-ink/55"
                aria-hidden="true"
              />

              <div className="relative p-6 md:p-8">
                <p className="text-[0.72rem] uppercase tracking-[0.2em] text-linen/80">
                  Most requested
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-cream md:text-3xl">
                  {lead.name}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream/80">
                  {lead.blurb}
                </p>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-cream">
                  {lead.startingAt}
                  <ArrowUpRightIcon
                    className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </p>
              </div>
            </Link>

            {rest.map((service) => (
              <Link
                key={service.slug}
                href={`/pasadena-shades-and-shutters/services/${service.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-linen bg-white transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-linen hover:shadow-card"
              >
                <Image
                  width={1200}
                  height={900}
                  src={service.image}
                  alt={`${service.name} installed on a residential window`}
                  className="h-40 w-full object-cover"
                />

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {service.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone">
                    {service.tagline}
                  </p>
                  <p className="mt-auto pt-4 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">
                      {service.startingAt}
                    </span>
                    <span className="flex items-center gap-1 text-brass">
                      Details
                      <ArrowUpRightIcon
                        className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
