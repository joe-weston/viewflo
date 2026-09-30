"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { galleryProjects } from "../../data/content";
import { SectionHeading } from "../ui/SectionHeading";
export function GalleryPreview() {
  const [selected, setSelected] = useState(0);
  const p = galleryProjects[selected];
  return (
    <section id="gallery" className="scroll-mt-28 bg-walnut">
      <div className="mx-auto max-w-content px-5 py-16 md:px-6 md:py-24">
        <SectionHeading
          eyebrow="Local projects"
          tone="light"
          title="A closer look at our work"
          description="Window treatments from the Pasadena Shades & Shutters project archive."
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <Image
            src={p.afterImage}
            alt={`${p.title} in ${p.city}`}
            width={960}
            height={720}
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
          <div>
            <h3 className="font-display text-2xl text-cream">{p.title}</h3>
            <p className="mt-2 text-linen">
              {p.city} · {p.treatment}
            </p>
            <p className="mt-4 text-cream/80">{p.note}</p>
            <div className="mt-6 grid gap-3">
              {galleryProjects.map((item, i) => (
                <button
                  key={item.id}
                  aria-pressed={i === selected}
                  onClick={() => setSelected(i)}
                  className={`rounded-2xl border p-4 text-left text-cream ${selected === i ? "border-cream bg-cream/10" : "border-cream/20"}`}
                >
                  {item.title}
                  <span className="mt-1 block text-sm text-linen">
                    {item.city}
                  </span>
                </button>
              ))}
            </div>
            <Link
              href="/pasadena-shades-and-shutters/gallery"
              className="mt-7 inline-block text-linen underline underline-offset-4"
            >
              See the full project gallery →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

