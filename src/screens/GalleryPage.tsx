import Image from "next/image";
import Link from "next/link";
import { galleryProjects } from "../data/content";
export function GalleryPage() {
  return (
    <div className="mx-auto max-w-content px-5 py-14 md:px-6">
      <p className="text-sm uppercase tracking-widest text-brass">Our work</p>
      <h1 className="mt-3 font-display text-4xl">
        Window treatments in local homes
      </h1>
      <p className="mt-5 text-stone">
        Explore projects from the Pasadena Shades &amp; Shutters archive.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {galleryProjects.map((p) => (
          <Link
            className="overflow-hidden rounded-3xl border border-linen bg-white"
            key={p.id}
            href={`/pasadena-shades-and-shutters/shutter-projects/${p.id}`}
          >
            <Image
              src={p.afterImage}
              alt={`${p.title} in ${p.city}`}
              width={800}
              height={600}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-6">
              <h2 className="font-display text-2xl">{p.title}</h2>
              <p className="mt-2 text-sm text-stone">{p.city}</p>
              <p className="mt-3 text-stone">{p.note}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

