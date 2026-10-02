import Image from "next/image";
import React from "react";
import { GraduationCapIcon, PaletteIcon, SofaIcon } from "lucide-react";
import { Button } from "../ui/Button";

const credentials = [
  {
    icon: GraduationCapIcon,
    title: "FIDM graduate, 25 years designing",
    detail:
      "Trained at the Fashion Institute of Design & Merchandising in Los Angeles.",
  },
  {
    icon: SofaIcon,
    title: "Interior design, not just blinds",
    detail:
      "Window treatments are the specialty, but color and style come with it.",
  },
  {
    icon: PaletteIcon,
    title: "Materials in your own light",
    detail:
      "The in-home shopping experience — fabrics and finishes in your own light.",
  },
];

export function OwnerStory() {
  return (
    <div id="about" className="scroll-mt-28">
      <section
        id="meet_robin"
        className="scroll-mt-28 border-y border-linen bg-sand"
      >
        <div className="mx-auto grid max-w-content items-center gap-10 px-5 py-16 md:px-6 md:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="relative">
            <Image
              width={800}
              height={1000}
              src="/tenants/pasadena/robin-alvarez-portrait.webp" sizes="(min-width: 1024px) 480px, (min-width: 768px) calc(100vw - 48px), calc(100vw - 40px)"
              alt="Robin Alvarez, owner and in-home design consultant at Pasadena Shades & Shutters"
              className="aspect-[4/5] w-full rounded-3xl object-cover object-top shadow-card"
            />

            <p className="mt-4 text-sm text-stone">
              Robin Alvarez, owner &amp; in-home design consultant
            </p>
          </div>

          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-brass">
              Who you&apos;re hiring
            </p>
            <h2 className="mt-5 font-display text-3xl leading-snug text-ink">
              Meet Robin Alvarez, your in-home design consultant
            </h2>
            <p className="mt-6 max-w-xl leading-relaxed text-stone">
              Robin Alvarez brings interior design experience and a personal
              approach to choosing window treatments. A graduate of the Fashion
              Institute of Design &amp; Merchandising, she helps you explore
              color, style, privacy, and light control in your own home.
            </p>

            <ul className="mt-8 grid gap-5 sm:grid-cols-3">
              {credentials.map((item) => (
                <li key={item.title} className="flex flex-col">
                  <item.icon
                    className="h-5 w-5 text-brass"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-medium text-ink">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-stone">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button
                href="/pasadena-shades-and-shutters/consultation"
                size="lg"
              >
                Request a Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

