import React from "react";
import { TenantLink as Link } from "../TenantLink";
import { ClockIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { services } from "../../data/services";
import { serviceAreas } from "../../data/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-walnut/15 bg-walnut text-cream">
      <div className="mx-auto max-w-content px-5 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <p className="font-display text-xl font-semibold">
              Pasadena Shades &amp; Shutters
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/70">
              Custom window treatments, designed for your home and installed by
              a trusted local expert. In-home design consultations with Robin
              Alvarez.
            </p>
            <dl className="mt-6 space-y-2.5 text-sm text-cream/80">
              <div className="flex items-center gap-2.5">
                <PhoneIcon
                  className="h-4 w-4 text-linen/70"
                  aria-hidden="true"
                />

                <a
                  href="tel:+18186185288"
                  className="transition-colors duration-150 ease-out hover:text-cream"
                >
                  818-618-5288
                </a>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPinIcon
                  className="mt-0.5 h-4 w-4 text-linen/70"
                  aria-hidden="true"
                />

                <span>
                  Based in Montrose, California
                  <br />
                  Serving Pasadena and nearby communities
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ClockIcon
                  className="h-4 w-4 text-linen/70"
                  aria-hidden="true"
                />
                <span>Consultations by arrangement</span>
              </div>
            </dl>
          </div>

          <nav aria-label="Services">
            <h2 className="text-[0.72rem] uppercase tracking-[0.18em] text-linen/60">
              Services
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/pasadena-shades-and-shutters/services/${service.slug}`}
                    className="transition-colors duration-150 ease-out hover:text-cream"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Service area">
            <h2 className="text-[0.72rem] uppercase tracking-[0.18em] text-linen/60">
              Where we work
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
              {serviceAreas.map((area) => (
                <li key={area.city}>{area.city}</li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[0.72rem] uppercase tracking-[0.18em] text-linen/60">
              Get started
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              Request details about an in-home design consultation.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/pasadena-shades-and-shutters/consultation"
                className="inline-flex items-center justify-center rounded-full bg-cream px-5 py-2.5 text-sm font-medium text-walnut transition-colors duration-150 ease-out hover:bg-linen"
              >
                Request a Consultation
              </Link>
              <Link
                href="/pasadena-shades-and-shutters/send-photos"
                className="inline-flex items-center justify-center rounded-full border border-cream/30 px-5 py-2.5 text-sm font-medium text-cream transition-colors duration-150 ease-out hover:border-cream/70"
              >
                Send Photos of Your Windows
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-cream/15 pt-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Pasadena Shades &amp; Shutters · Robin
            Alvarez, owner &amp; design consultant
          </p>
          <nav aria-label="Policies" className="flex gap-5">
            <Link href="/pasadena-shades-and-shutters/privacy">Privacy</Link>
            <Link href="/pasadena-shades-and-shutters/terms">Terms</Link>
            <Link href="https://www.pasadenashadesandshutters.com/sitemap.xml">Sitemap</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
