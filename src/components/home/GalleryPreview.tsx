"use client";
import Image from "next/image";
import React, { useState } from "react";
import { TenantLink as Link } from "../TenantLink";
import { ArrowRightIcon } from "lucide-react";
import { galleryProjects } from "../../data/content";
import { BeforeAfterSlider } from "../BeforeAfterSlider";

import { SectionHeading } from "../ui/SectionHeading";

export function GalleryPreview() {
  const [activeId, setActiveId] = useState(galleryProjects[0].id);
  const active =
    galleryProjects.find((project) => project.id === activeId) ??
    galleryProjects[0];

  return (
    <section id="gallery" className="scroll-mt-28 bg-walnut">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="Before & after"
          tone="light"
          title="Real homes within a few miles of here"
          description="Drag the handle to see what changed. Same room, same camera, different windows."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          <BeforeAfterSlider
            key={active.id}
            beforeImage={active.beforeImage}
            afterImage={active.afterImage}
            label={active.title}
            className="aspect-[4/3] w-full"
          />

          <div className="flex flex-col">
            <div className="border-b border-cream/15 pb-6">
              <h3 className="font-display text-2xl font-semibold text-cream">
                {active.title}
              </h3>
              <p className="mt-1 text-sm text-linen/70">
                {active.city} · {active.treatment}
              </p>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-cream/75">
                {active.note}
              </p>
            </div>

            <ul className="mt-6 flex flex-col gap-2">
              {galleryProjects.map((project) => {
                const isActive = project.id === active.id;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(project.id)}
                      aria-current={isActive}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors duration-150 ease-out ${
                        isActive
                          ? "border-cream/40 bg-cream/10"
                          : "border-cream/15 hover:border-cream/30 hover:bg-cream/5"
                      }`}
                    >
                      <Image
                        width={64}
                        height={48}
                        src={project.afterImage}
                        alt=""
                        className="h-12 w-16 shrink-0 rounded-lg object-cover"
                      />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-cream">
                          {project.title}
                        </span>
                        <span className="block truncate text-xs text-linen/60">
                          {project.city} · {project.treatment}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/pasadena-shades-and-shutters/gallery/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-linen transition-colors duration-150 ease-out hover:text-cream"
            >
              See the full project gallery
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
