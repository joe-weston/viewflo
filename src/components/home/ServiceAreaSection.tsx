import React from "react";
import { MapPinIcon } from "lucide-react";
import { serviceAreas } from "../../data/content";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

export function ServiceAreaSection() {
  return (
    <section
      id="service-area"
      className="scroll-mt-28 border-y border-linen bg-sand"
    >
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Service area"
              title="We stay close to home on purpose"
              description="Window treatment consultations in Pasadena and surrounding communities. Contact us to discuss your location and project."
            />

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button href="/pasadena-shades-and-shutters/consultation">
                Check availability in your city
              </Button>
            </div>
            <p className="mt-5 text-sm text-stone">
              Just outside these cities? Call anyway — Altadena, Eagle Rock, San
              Marino, Sierra Madre, and the surrounding Los Angeles communities
              come up regularly.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {serviceAreas.map((area) => (
              <li
                key={area.city}
                id={area.id}
                className="scroll-mt-28 rounded-2xl border border-linen bg-cream p-5"
              >
                <div className="flex items-start gap-3">
                  <MapPinIcon
                    className="mt-0.5 h-4 w-4 shrink-0 text-brass"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {area.city}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone">
                      {area.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
