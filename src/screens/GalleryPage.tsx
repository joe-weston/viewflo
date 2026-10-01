"use client";
import { BeforeAfterSlider } from "../components/BeforeAfterSlider";
import React, { useState } from "react";
import { galleryProjects } from "../data/content";

import { Button } from "../components/ui/Button";

export function GalleryPage() {
  const cities = [
    "All cities",
    ...Array.from(new Set(galleryProjects.map((project) => project.city))),
  ];

  const [activeCity, setActiveCity] = useState("All cities");

  const filtered =
    activeCity === "All cities"
      ? galleryProjects
      : galleryProjects.filter((project) => project.city === activeCity);

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-content px-5 py-12 md:px-6 md:py-16">
        <div className="max-w-2xl">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-brass">
            Project gallery
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.12] text-ink md:text-5xl">
            Before and after, house by house
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-stone">
            Drag each image to compare the room before and after its window
            treatments.
          </p>
        </div>

        <div
          className="mt-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by city"
        >
          {cities.map((city) => {
            const isActive = city === activeCity;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm transition-colors duration-150 ease-out ${
                  isActive
                    ? "border-walnut bg-walnut text-cream"
                    : "border-linen bg-white text-stone hover:border-walnut/40 hover:text-ink"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-linen p-12 text-center">
            <p className="font-display text-xl text-ink">
              Nothing published here yet
            </p>
            <p className="mt-2 text-stone">
              We work in this city regularly — ask and we&apos;ll send recent
              photos directly.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-14">
            {filtered.map((project, index) => (
              <article
                key={project.id}
                className={`grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-center lg:gap-12 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <BeforeAfterSlider
                  beforeImage={project.beforeImage}
                  afterImage={project.afterImage}
                  label={project.title}
                  className="aspect-[4/3] w-full"
                />

                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.2em] text-brass">
                    {project.treatment}
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-semibold text-ink md:text-3xl">
                    {project.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-stone">{project.city}</p>
                  <p className="mt-4 leading-relaxed text-stone">
                    {project.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-start gap-4 rounded-3xl border border-linen bg-sand/70 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Want to see your own room like this?
            </h2>
            <p className="mt-2 text-stone">
              Send a photo and we&apos;ll tell you what it would take.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button href="/pasadena-shades-and-shutters/consultation">
              Book a Design Consultation
            </Button>
            <Button
              href="/pasadena-shades-and-shutters/send-photos"
              variant="secondary"
            >
              Send Photos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
