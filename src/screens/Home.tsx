import React from "react";
import { Hero } from "../components/home/Hero";
import { TrustBar } from "../components/home/TrustBar";
import { ServiceCategories } from "../components/home/ServiceCategories";
import { GalleryPreview } from "../components/home/GalleryPreview";
import { Process } from "../components/home/Process";
import { OwnerStory } from "../components/home/OwnerStory";
import { Testimonials } from "../components/home/Testimonials";
import { ServiceAreaSection } from "../components/home/ServiceAreaSection";
import { FaqSection } from "../components/home/FaqSection";
import { ClosingCta } from "../components/home/ClosingCta";

export function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <ServiceCategories />
      <GalleryPreview />
      <OwnerStory />
      <Process />
      <Testimonials />
      <ServiceAreaSection />
      <FaqSection />
      <ClosingCta />
    </>
  );
}

